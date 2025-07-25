import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Server } from "socket.io";
import * as dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { query, testConnection } from "./database/connection.js";
import { DatabaseMigrations } from "./database/migrations.js";
import userRoutes from "./routes/userRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import recentChatRoutes from "./routes/recentChatRoutes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { MessageService } from "./services/messageService.js";
import { PresenceService } from "./services/presenceService.js";
import { RoomService } from "./services/roomService.js";
import "./types/socket.js";

dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;
const __dirname = dirname(fileURLToPath(import.meta.url));

// Static file serving for uploads with CORS headers - MUST BE FIRST
app.use(
  "/uploads",
  (req, res, next) => {
    // Add comprehensive CORS headers for static file access
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Range"
    );
    res.header("Access-Control-Allow-Credentials", "false"); // Set to false for wildcard origin
    res.header("Cross-Origin-Resource-Policy", "cross-origin");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }

    next();
  },
  express.static(join(process.cwd(), "uploads"))
);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    methods: ["GET", "POST"],
  },
});

// Security middleware with relaxed CORP for uploads
app.use(
  helmet({
    crossOriginResourcePolicy: false, // Disable CORP to allow cross-origin audio access
  })
);
app.use(
  cors({
    origin: true, // Allow all origins in development
    credentials: true,
  })
);

// Rate limiting - More permissive for normal user flow
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 50, // 50 requests per minute (instead of 100 per 15 minutes)
  message: { error: "Too many requests, please try again later" },

  // Skip rate limiting for GET requests to room info and other read operations
  skip: (req) => {
    return (
      req.method === "GET" &&
      (req.path.includes("/api/c/") ||
        req.path.includes("/api/recent-chats/") ||
        req.path.includes("/health") ||
        req.path.includes("/uploads/"))
    );
  },

  // Standard headers for rate limit info
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Basic middleware
app.use(compression());
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Duplicate uploads middleware removed - now handled at the top

// API Routes
app.use("/api", userRoutes);
app.use("/api", roomRoutes);
app.use("/api", messageRoutes);
app.use("/api", recentChatRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Serve static files for testing (optional)
app.get("/", (req, res) => {
  res.json({
    message: "DuoNest Chat Backend API",
    endpoints: {
      generateUserId: "/api/generate-user-id",
      userDashboard: "/api/u/:userId",
      createRoom: "/api/u/:userId/create-room",
      joinRoom: "/api/c/:roomId/join",
      roomInfo: "/api/c/:roomId",
      roomMessages: "/api/c/:roomId/messages",
      getMessages: "/api/u/:userId/messages/:roomId",
      unreadMessages: "/api/u/:userId/unread-messages/:roomId",
      markSeen: "/api/u/:userId/mark-messages-seen/:roomId",
      deleteMessage: "/api/u/:userId/message/:messageId",
      uploadVoice: "/api/u/:userId/upload-voice/:roomId",
      recentChats: "/api/recent-chats/:userId",
      addRecentChat: "/api/recent-chats",
      updateRecentChat: "/api/recent-chats/:userId/:roomId",
      deleteRecentChat: "/api/recent-chats/:userId/:roomId",
    },
  });
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // User identification and presence
  socket.on("identify-user", (userId) => {
    PresenceService.setUserOnline(userId, socket.id);
    socket.userId = userId;

    // Notify other users in the same rooms that this user is online
    socket.broadcast.emit("user-online", userId);
    console.log(`User identified: ${userId} (${socket.id})`);
  });

  // Handle user-online event from frontend
  socket.on("user-online", (userId) => {
    if (!userId) {
      console.error("No userId provided for user-online event");
      return;
    }

    // Register user in presence service (only if not already registered)
    if (!socket.userId) {
      PresenceService.setUserOnline(userId, socket.id);
      socket.userId = userId;
      console.log(`User registered as online: ${userId} (${socket.id})`);
    }
  });

  // Simple user registration event
  socket.on("register-user", (userId) => {
    if (!userId) {
      console.error("No userId provided for register-user event");
      return;
    }

    // Register user in presence service (only if not already registered)
    if (!socket.userId) {
      PresenceService.setUserOnline(userId, socket.id);
      socket.userId = userId;
      console.log(`User registered: ${userId} (${socket.id})`);
    }

    // Confirm registration to client
    socket.emit("user-registered", { userId, socketId: socket.id });
  });

  socket.on("join-room", async (roomIdOrData) => {
    // Handle both string roomId and object with roomId/userId
    const roomId =
      typeof roomIdOrData === "string" ? roomIdOrData : roomIdOrData?.roomId;
    const userId =
      typeof roomIdOrData === "object" ? roomIdOrData?.userId : socket.userId;

    if (!roomId) {
      console.error("No roomId provided for join-room");
      return;
    }

    // If userId is provided and not already registered, register the user
    if (userId && !socket.userId) {
      PresenceService.setUserOnline(userId, socket.id);
      socket.userId = userId;
      console.log(`Auto-registered user: ${userId} (${socket.id})`);
    }

    socket.join(roomId);
    socket.roomId = roomId; // Store roomId on socket for cleanup

    // Notify others in the room
    socket.to(roomId).emit("user-joined", { userId, socketId: socket.id });

    // Send online status of room participants only if roomId is valid
    if (roomId !== "undefined" && roomId !== undefined) {
      try {
        const roomUsers = await PresenceService.getUsersInRoom(roomId);
        const onlineUsers = roomUsers.filter((id) =>
          PresenceService.isUserOnline(id)
        );
        socket.emit("room-users-status", { roomId, onlineUsers });
      } catch (error) {
        console.error("Error getting room users:", error);
      }
    }

    console.log(
      `User ${userId || "unknown"} (${socket.id}) joined room ${roomId}`
    );
  });

  socket.on("leave-room", (roomIdOrData) => {
    // Handle both string roomId and object with roomId/userId
    const roomId =
      typeof roomIdOrData === "string" ? roomIdOrData : roomIdOrData?.roomId;
    const userId =
      typeof roomIdOrData === "object" ? roomIdOrData?.userId : socket.userId;

    if (!roomId) {
      console.error("No roomId provided for leave-room");
      return;
    }

    socket.leave(roomId);
    if (socket.roomId === roomId) {
      socket.roomId = undefined; // Clear roomId when leaving
    }
    socket.to(roomId).emit("user-left", { userId, socketId: socket.id });
    console.log(
      `User ${userId || "unknown"} (${socket.id}) left room ${roomId}`
    );
  });

  // Enhanced chat message with database storage
  socket.on("chat-message", async (data) => {
    try {
      const {
        roomId,
        message,
        userId,
        messageType = "text",
        fileUrl,
        fileName,
        fileSize,
        duration,
      } = data;

      // Validate required data
      if (!roomId || !message || !userId) {
        console.error("Missing required data for chat-message:", {
          roomId,
          message,
          userId,
        });
        socket.emit("message-error", {
          error: "Missing required message data",
        });
        return;
      }

      // Ensure user is registered for presence tracking
      if (userId && !socket.userId) {
        PresenceService.setUserOnline(userId, socket.id);
        socket.userId = userId;
        console.log(
          `Auto-registered user during message send: ${userId} (${socket.id})`
        );
      }

      // Save message to database
      const savedMessage = await MessageService.saveMessage({
        room_id: roomId,
        sender_id: userId,
        content: message,
        message_type: messageType,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        duration: duration,
      });

      // Broadcast to all users in the room except sender
      socket.to(roomId).emit("chat-message", {
        id: savedMessage.id,
        message: savedMessage.content,
        userId: savedMessage.sender_id,
        messageType: savedMessage.message_type,
        timestamp: savedMessage.created_at,
        fileUrl: savedMessage.file_url,
        fileName: savedMessage.file_name,
        fileSize: savedMessage.file_size,
        duration: savedMessage.duration,
        delivered_at: null,
        seen_at: null,
        seen_by_user_id: null,
        status: "sent", // Add status field for tracking
        socketId: socket.id,
      });

      // Auto-mark message as delivered since it was successfully broadcasted
      setTimeout(async () => {
        try {
          await MessageService.markMessageAsDelivered(savedMessage.id);

          // Notify sender that message was delivered
          const senderSocketId = PresenceService.getSocketByUserId(
            savedMessage.sender_id
          );
          if (senderSocketId) {
            io.to(senderSocketId).emit("message-status-update", {
              messageId: savedMessage.id,
              status: "delivered",
              deliveredAt: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error("Error auto-marking message as delivered:", error);
        }
      }, 100); // Small delay to ensure message is received

      // Confirm message sent to sender
      socket.emit("message-sent", {
        id: savedMessage.id,
        tempId: data.tempId, // Client-side temporary ID for matching
        timestamp: savedMessage.created_at,
        message: savedMessage.content,
        userId: savedMessage.sender_id,
        messageType: savedMessage.message_type,
        fileUrl: savedMessage.file_url,
        fileName: savedMessage.file_name,
        fileSize: savedMessage.file_size,
        duration: savedMessage.duration,
        delivered_at: null,
        seen_at: null,
        seen_by_user_id: null,
        status: "sent",
        roomId: roomId,
      });
    } catch (error) {
      console.error("Error handling chat message:", error);
      socket.emit("message-error", { error: "Failed to send message" });
    }
  });

  // Voice message specific event for real-time broadcasting
  socket.on("voice-message", (data) => {
    const {
      roomId,
      messageId,
      userId,
      fileUrl,
      fileName,
      fileSize,
      duration,
      timestamp,
      tempId,
    } = data;

    if (!roomId || !messageId || !userId || !fileUrl) {
      console.error("Missing required data for voice-message:", data);
      return;
    }

    // Broadcast voice message to all users in the room except sender
    socket.to(roomId).emit("voice-message", {
      messageId,
      userId,
      fileUrl,
      fileName,
      fileSize,
      duration,
      timestamp,
      tempId,
      roomId,
    });

    console.log(
      `Voice message broadcasted: ${messageId} from ${userId} in room ${roomId}`
    );
  });

  // Message delivery confirmation
  socket.on("message-delivered", async ({ messageId }) => {
    try {
      // Validate messageId is a valid number (can be large for BIGINT)
      const validMessageId = Number(messageId);
      if (
        isNaN(validMessageId) ||
        validMessageId <= 0 ||
        !Number.isInteger(validMessageId)
      ) {
        console.error("Invalid messageId for message-delivered:", messageId);
        return;
      }

      await MessageService.markMessageAsDelivered(validMessageId);

      // Get message details to find sender
      const message = await MessageService.getMessage(validMessageId);
      if (message) {
        // Notify sender that message was delivered
        const senderSocketId = PresenceService.getSocketByUserId(
          message.sender_id
        );
        if (senderSocketId) {
          io.to(senderSocketId).emit("message-delivery-confirmed", {
            messageId: validMessageId,
            deliveredAt: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.error("Error marking message as delivered:", error);
    }
  });

  // Message seen/read confirmation
  socket.on("message-seen", async ({ messageId, userId }) => {
    try {
      // Validate messageId is a valid number (can be large for BIGINT)
      const validMessageId = Number(messageId);
      if (
        isNaN(validMessageId) ||
        validMessageId <= 0 ||
        !Number.isInteger(validMessageId)
      ) {
        console.error("Invalid messageId for message-seen:", messageId);
        return;
      }

      if (!userId) {
        console.error("Missing userId for message-seen");
        return;
      }

      await MessageService.markMessageAsSeen(validMessageId, userId);

      // Get message details to find sender and room
      const message = await MessageService.getMessage(validMessageId);
      if (message) {
        // Emit back to the original sender that their message was seen
        const senderSocketId = PresenceService.getSocketByUserId(
          message.sender_id
        );
        if (senderSocketId) {
          console.log(
            `Emitting message-seen to sender ${message.sender_id} (${senderSocketId}) for message ${validMessageId}`
          );

          // Send message-seen event
          io.to(senderSocketId).emit("message-seen", {
            messageId: validMessageId,
            seenBy: userId,
            senderId: message.sender_id,
            roomId: message.room_id,
            seenAt: new Date().toISOString(),
          });

          // Send status update event
          io.to(senderSocketId).emit("message-status-update", {
            messageId: validMessageId,
            status: "seen",
            seenBy: userId,
            seenAt: new Date().toISOString(),
          });
        } else {
          console.log(
            `Sender ${message.sender_id} not found online for message-seen notification`
          );
        }

        // Also broadcast to all room participants that message was seen
        socket.to(message.room_id).emit("message-seen-confirmed", {
          messageId: validMessageId,
          seenBy: userId,
          seenAt: new Date().toISOString(),
        });

        // Additional read receipt event for advanced status tracking
        if (senderSocketId) {
          io.to(senderSocketId).emit("message-read-receipt", {
            messageId: validMessageId,
            readBy: userId,
            readAt: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.error("Error marking message as seen:", error);
    }
  });

  // Typing indicators
  socket.on("typing", (data) => {
    const { roomId, userId, isTyping } = data;

    if (!roomId || !userId) {
      console.error("Missing data for typing event:", { roomId, userId });
      return;
    }

    socket.to(roomId).emit("user-typing", { userId, isTyping });
  });

  // Live typing functionality - throttled map to prevent spam
  const throttledLiveTyping = new Map();
  const LIVE_TYPING_CONFIG = {
    enabled: process.env.LIVE_TYPING_ENABLED !== "false",
    throttleMs: parseInt(process.env.LIVE_TYPING_THROTTLE_MS || "100"),
    maxLength: parseInt(process.env.LIVE_TYPING_MAX_LENGTH || "1000"),
  };

  // Helper function to validate room access
  const validateUserRoomAccess = async (
    userId: string,
    roomId: string
  ): Promise<boolean> => {
    try {
      const room = await RoomService.getRoom(roomId);
      return Boolean(
        room && (room.user1_id === userId || room.user2_id === userId)
      );
    } catch (error) {
      console.error("Room access validation error:", error);
      return false;
    }
  };

  // Handle live typing events
  socket.on("live-typing", async (data) => {
    if (!LIVE_TYPING_CONFIG.enabled) return;

    const { roomId, userId, content, cursorPosition, action, timestamp } = data;

    if (!roomId || !userId) {
      console.error("Missing data for live-typing event:", { roomId, userId });
      return;
    }

    try {
      // Validate user has access to this room
      const hasAccess = await validateUserRoomAccess(userId, roomId);
      if (!hasAccess) {
        socket.emit("error", { message: "Access denied to room" });
        return;
      }

      // Validate content length (prevent abuse)
      if (content && content.length > LIVE_TYPING_CONFIG.maxLength) {
        socket.emit("error", { message: "Content too long for live typing" });
        return;
      }

      // Throttle live typing updates to prevent spam
      const key = `${roomId}-${userId}`;
      const now = Date.now();
      const lastUpdate = throttledLiveTyping.get(key) || 0;

      if (now - lastUpdate < LIVE_TYPING_CONFIG.throttleMs) {
        return; // Skip this update
      }

      throttledLiveTyping.set(key, now);

      console.log(`Live typing from ${userId} in room ${roomId}:`, {
        action,
        content:
          content?.substring(0, 50) + (content?.length > 50 ? "..." : ""),
        cursorPosition,
      });

      // Broadcast to all users in the room EXCEPT the sender
      socket.to(roomId).emit("user-live-typing", {
        userId: userId,
        roomId: roomId,
        content: content,
        cursorPosition: cursorPosition,
        action: action, // 'typing', 'backspace', 'delete', 'start_typing', 'stop_typing'
        timestamp: timestamp || now,
      });
    } catch (error) {
      console.error("Live typing validation error:", error);
      socket.emit("error", { message: "Failed to process live typing" });
    }
  });

  // Handle when user stops typing (cleanup)
  socket.on("stop-live-typing", async (data) => {
    if (!LIVE_TYPING_CONFIG.enabled) return;

    const { roomId, userId } = data;

    if (!roomId || !userId) {
      console.error("Missing data for stop-live-typing event:", {
        roomId,
        userId,
      });
      return;
    }

    try {
      // Validate user has access to this room
      const hasAccess = await validateUserRoomAccess(userId, roomId);
      if (!hasAccess) {
        return;
      }

      socket.to(roomId).emit("user-stopped-live-typing", {
        userId: userId,
        roomId: roomId,
        timestamp: Date.now(),
      });

      // Clean up throttling map
      const key = `${roomId}-${userId}`;
      throttledLiveTyping.delete(key);
    } catch (error) {
      console.error("Stop live typing error:", error);
    }
  });

  // Optional: Log typing sessions for analytics
  socket.on("typing-session-end", async (data) => {
    if (!LIVE_TYPING_CONFIG.enabled) return;

    const {
      roomId,
      userId,
      duration,
      keystrokesCount,
      backspacesCount,
      finalLength,
    } = data;

    if (!roomId || !userId) {
      console.error("Missing data for typing-session-end event:", {
        roomId,
        userId,
      });
      return;
    }

    try {
      // Validate user has access to this room
      const hasAccess = await validateUserRoomAccess(userId, roomId);
      if (!hasAccess) {
        return;
      }

      await query(
        `
        INSERT INTO live_typing_logs 
        (room_id, user_id, content_length, typing_duration, keystrokes_count, backspaces_count)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
        [
          roomId,
          userId,
          finalLength,
          duration,
          keystrokesCount,
          backspacesCount,
        ]
      );

      console.log(
        `Logged typing session: ${userId} in ${roomId} - ${duration}ms, ${keystrokesCount} keystrokes`
      );
    } catch (error) {
      console.error("Failed to log typing session:", error);
    }
  });

  // Broadcast message seen status to all room participants
  socket.on("broadcast-message-seen", (data) => {
    const { roomId, messageId, status, seenBy, senderId } = data;

    if (!roomId || !messageId || !seenBy || !senderId) {
      console.error("Missing data for broadcast-message-seen:", {
        roomId,
        messageId,
        seenBy,
        senderId,
      });
      return;
    }

    console.log(
      `Broadcasting message-seen: message ${messageId} seen by ${seenBy} to room ${roomId}`
    );

    // Broadcast to all room participants that this message was seen
    socket.to(roomId).emit("broadcast-message-seen", {
      messageId,
      status,
      seenBy,
      senderId,
      roomId,
    });
  });

  // Get room message history
  socket.on(
    "get-messages",
    async ({ roomId, userId, limit = 50, offset = 0 }) => {
      try {
        if (!roomId || !userId) {
          socket.emit("messages-error", {
            error: "Room ID and User ID are required",
          });
          return;
        }

        // Check if user is a member of this room
        const room = await RoomService.getRoom(roomId);
        if (!room) {
          socket.emit("messages-error", { error: "Room not found" });
          return;
        }

        // Verify user is either user1 or user2 in the room
        if (room.user1_id !== userId && room.user2_id !== userId) {
          socket.emit("messages-error", {
            error: "Access denied. You are not a member of this room.",
          });
          return;
        }

        const messages = await MessageService.getRoomMessages(
          roomId,
          limit,
          offset
        );
        socket.emit("messages-history", {
          roomId,
          messages: messages.reverse(),
        });
      } catch (error) {
        console.error("Error getting messages:", error);
        socket.emit("messages-error", { error: "Failed to load messages" });
      }
    }
  );

  // Disconnect handling
  socket.on("disconnect", () => {
    const userId = PresenceService.setUserOffline(socket.id);
    if (userId) {
      // Notify other users that this user went offline
      socket.broadcast.emit("user-offline", userId);

      // Clean up live typing when user disconnects
      if (socket.roomId && LIVE_TYPING_CONFIG.enabled) {
        socket.to(socket.roomId).emit("user-stopped-live-typing", {
          userId: userId,
          roomId: socket.roomId,
          timestamp: Date.now(),
        });

        // Clean up throttling map for this user
        const key = `${socket.roomId}-${userId}`;
        throttledLiveTyping.delete(key);
      }

      console.log(`User ${userId} (${socket.id}) disconnected`);
    } else {
      console.log(`User disconnected: ${socket.id}`);
    }
  });
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

server.listen(PORT, async () => {
  console.log(`🚀 DuoNest server running at port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);

  // Test database connection on startup
  const dbConnected = await testConnection();
  if (dbConnected) {
    console.log("✅ Database connected successfully");

    // Run database migrations
    try {
      await DatabaseMigrations.runMigrations();
    } catch (error) {
      console.error("❌ Database migrations failed:", error);
      process.exit(1);
    }
  } else {
    console.log("❌ Database connection failed");
    process.exit(1);
  }
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Process terminated");
  });
});
