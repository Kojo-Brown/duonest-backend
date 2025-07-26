# DuoNest Chat Backend

A real-time chat application backend built with Node.js, Express, Socket.io, and PostgreSQL. Designed for 1-on-1 conversations with advanced messaging features and live typing functionality.

## 🚀 Features

### 💬 **Core Messaging**

- **Real-time messaging** with Socket.io
- **Message delivery & read receipts** with status tracking
- **Message persistence** in PostgreSQL database
- **Media support** - text, images, **videos**, files, **voice messages**, locations
- **Message types** - replies, forwards, emoji reactions, system messages
- **Disappearing messages** with expiration timestamps
- **View-once messages** for sensitive content

### 🔴 **Live Features**

- **Live typing indicators** - See exactly what others are typing in real-time
- **Real-time presence** - Online/offline status tracking
- **Instant delivery** - Messages appear immediately when sent
- **Typing analytics** - Optional session logging for insights

### 🎙️ **Voice Messages**

- **Audio recording** - Record and send voice messages up to 10MB
- **Cross-origin support** - Proper CORS configuration for audio playback
- **File format support** - WebM, MP3, WAV, and other audio formats
- **Duration tracking** - Automatic duration calculation and storage
- **Real-time broadcasting** - Voice messages appear instantly via Socket.io
- **Static file serving** - Optimized audio file delivery with proper headers

### 🎥 **Video Messages**

- **Video upload** - Upload and send video files up to 100MB
- **Format support** - MP4, MOV, AVI, WebM, MKV, FLV, M4V, 3GP
- **Automatic thumbnails** - Generated at 1-second mark using ffmpeg
- **Metadata extraction** - Duration, resolution, bitrate automatically detected
- **Video compression** - Smart thumbnail generation (320x240) for quick previews
- **Real-time delivery** - Videos broadcast instantly with metadata via Socket.io
- **Static serving** - Optimized video and thumbnail delivery with proper CORS

### 👥 **User Management**

- **Auto user creation** with unique ID generation
- **Room-based conversations** (1-on-1 chat rooms)
- **User presence tracking** with Socket.io integration
- **Recent chats** - Track and display user's chat history

### 🔒 **Security & Performance**

- **Rate limiting** - Configurable limits to prevent abuse
- **Input validation** - Comprehensive data validation
- **Room access control** - Users can only access rooms they belong to
- **Content filtering** - Length limits and content validation
- **Throttling** - Live typing throttled to 10 updates/second
- **CORS protection** with helmet security middleware

### 📊 **Database Features**

- **Auto-migrations** - Database setup on first run
- **Optimized queries** with proper indexing
- **Connection pooling** for performance
- **Cleanup functions** for inactive data
- **Analytics logging** for typing patterns (optional)

## 🛠️ Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Real-time**: Socket.io
- **Database**: PostgreSQL with connection pooling
- **File Processing**: Sharp (images), ffmpeg (videos), Multer (uploads)
- **Security**: Helmet, CORS, rate limiting
- **Development**: tsx for hot reloading

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 12+
- FFmpeg (for video processing)
- npm or yarn

## ⚡ Quick Start

1. **Clone and install dependencies**

   ```bash
   git clone <repository-url>
   cd duonest-backend
   npm install
   ```

2. **Environment setup**

   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Database configuration**

   ```env
   Check example env for env variables
   ```

4. **Start the server**

   ```bash
   # Development with hot reload
   npm run dev

   # Production build
   npm run build
   npm start
   ```

5. **Database auto-setup**
   - Tables are created automatically on first run
   - Migrations run automatically on server startup
   - No manual database setup required!

## 📡 API Endpoints

### **User Management**

- `POST /api/generate-user-id` - Generate unique user ID
- `GET /api/u/:userId` - User dashboard/info

### **Room Management**

- `POST /api/u/:userId/create-room` - Create new chat room
- `POST /api/c/:roomId/join` - Join existing room
- `GET /api/c/:roomId` - Get room information
- `GET /api/c/:roomId/messages` - Get room message history

### **Messaging**

- `GET /api/u/:userId/messages/:roomId` - Get user's messages in room
- `GET /api/u/:userId/unread-messages/:roomId` - Get unread messages
- `POST /api/u/:userId/mark-messages-seen/:roomId` - Mark messages as read
- `DELETE /api/u/:userId/message/:messageId` - Delete message

### **Voice Messages**

- `POST /api/voice-message` - Upload voice message (alternative endpoint)
- `POST /api/u/:userId/upload-voice/:roomId` - Upload voice message to specific room
- `GET /uploads/voice/:filename` - Access voice message files (static serving)

### **Video Messages**

- `POST /api/video-message` - Upload video message (alternative endpoint)
- `POST /api/u/:userId/upload-video/:roomId` - Upload video message to specific room
- `GET /uploads/videos/:filename` - Access video files (static serving)
- `GET /uploads/videos/thumbnails/:filename` - Access video thumbnails (static serving)

### **Recent Chats**

- `GET /api/recent-chats/:userId` - Get user's recent chats
- `POST /api/recent-chats` - Add/update recent chat
- `PUT /api/recent-chats/:userId/:roomId` - Update chat info
- `DELETE /api/recent-chats/:userId/:roomId` - Remove recent chat

### **Health Check**

- `GET /health` - Server health status

## 🔌 Socket.io Events

### **Connection & Presence**

- `identify-user` - Register user for presence tracking
- `user-online` / `user-offline` - Presence updates
- `join-room` / `leave-room` - Room management

### **Messaging**

- `chat-message` - Send message
- `message-sent` - Message delivery confirmation
- `message-delivered` - Delivery receipt
- `message-seen` - Read receipt
- `voice-message` - Broadcast voice message to room participants
- `image-message` - Broadcast image message to room participants
- `video-message` - Broadcast video message to room participants

### **Live Typing**

- `live-typing` - Send live typing updates
- `user-live-typing` - Receive others' typing
- `stop-live-typing` - Stop typing indicator
- `typing-session-end` - Analytics logging

### **Traditional Typing Indicators**

- `typing` - Simple typing indicator
- `user-typing` - Receive typing status

## 🗄️ Database Schema

### **Core Tables**

- `users` - User accounts and status
- `couple_rooms` - Chat rooms (1-on-1)
- `messages` - All messages with rich metadata
- `recent_chats` - User's recent chat history
- `live_typing_logs` - Typing analytics (optional)
- `migrations` - Database version tracking

### **Key Features**

- **Auto-incrementing message IDs** for proper ordering
- **Comprehensive indexes** for query performance
- **Foreign key constraints** for data integrity
- **Automatic timestamps** with triggers
- **Cleanup functions** for maintenance

## 🔧 Configuration

### **Rate Limiting**

```javascript
// Current settings (adjustable)
windowMs: 60 * 1000,     // 1 minute window
max: 50,                 // 50 requests per minute
// GET requests to rooms bypass rate limiting
```

### **Live Typing**

```javascript
throttleMs: 100,         // Max 10 updates/second
maxLength: 1000,         // Character limit
enabled: true            // Can be disabled via env
```

### **Socket.io CORS**

```javascript
// Allowed origins (development)
"http://localhost:3000";
"http://localhost:5173";
"http://localhost:5174";
```

### **Voice Messages**

```javascript
// File upload limits
fileSize: 10 * 1024 * 1024,    // 10MB max file size
files: 1,                      // One file per upload
formats: ['audio/webm', 'audio/mp3', 'audio/wav']  // Supported formats

// Storage configuration
uploadDir: './uploads/voice',   // Local storage directory
staticServing: '/uploads',     // Public URL path
cors: 'cross-origin'          // CORS policy for audio files
```

### **Video Messages**

```javascript
// File upload limits
fileSize: 100 * 1024 * 1024,   // 100MB max file size
files: 1,                      // One file per upload
formats: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']

// Processing configuration
thumbnailSize: '320x240',      // Thumbnail dimensions
thumbnailTime: 1,              // Generate thumbnail at 1 second
ffmpegPath: 'ffmpeg',         // FFmpeg binary path

// Storage configuration
uploadDir: './uploads/videos', // Local storage directory
thumbnailDir: './uploads/videos/thumbnails', // Thumbnail storage
staticServing: '/uploads',     // Public URL path
cors: 'cross-origin'          // CORS policy for video files
```

## 🧪 Testing

### **Manual API Testing**

```bash
# Test recent chats functionality
node test-recent-chats.js
```

### **Database Testing**

```bash
# Check database connection
npm run dev
# Look for "✅ Database connected successfully"
```

## 📊 Performance Features

- **Connection pooling** - Max 20 concurrent database connections
- **Query optimization** - Proper indexes on all frequently queried columns
- **Memory management** - Automatic cleanup of typing throttle maps
- **Graceful shutdown** - Proper connection cleanup on exit
- **Error handling** - Comprehensive error catching and logging

## 🔒 Security Features

- **Helmet.js** - Security headers
- **CORS protection** - Configurable allowed origins
- **Rate limiting** - Per-IP request limits
- **Input validation** - All user inputs validated
- **SQL injection protection** - Parameterized queries
- **Room access control** - Users only access their rooms
- **Content length limits** - Prevent abuse

## 🚦 Current Status

### ✅ **Completed Features**

- Real-time messaging with Socket.io
- Database persistence with PostgreSQL
- User and room management
- Message delivery/read receipts
- Live typing functionality
- Recent chats tracking
- Auto-migrations system
- Comprehensive error handling
- Security middleware
- Performance optimizations

### 🔄 **Recent Updates**

#### **Latest: Video Messages (v2.1.0)**
- **Video upload & processing** - Full video recording, upload, and streaming with ffmpeg
- **Automatic thumbnail generation** - Smart thumbnail creation at optimal timestamps
- **Video metadata extraction** - Duration, resolution, bitrate automatically detected
- **Multi-format support** - MP4, MOV, AVI, WebM, MKV, FLV, M4V, 3GP compatibility
- **Database schema updates** - New video-specific fields and optimized storage
- **Real-time video broadcasting** - Instant video sharing via Socket.io events

#### **Previous Updates**
- **Voice message support** - Full audio recording, upload, and playback
- **Image message support** - Upload, compression, and thumbnail generation
- **Cross-origin media access** - Fixed CORS issues for media file serving
- **File upload middleware** - Multer integration with size limits and validation
- **Static file optimization** - Proper headers and rate limiting bypass
- Added live typing with keystroke-level updates
- Implemented recent chats API
- Enhanced rate limiting configuration
- Added typing analytics logging
- Fixed TypeScript compilation issues
- Improved database migration system

### 🎯 **Production Ready**

- Auto-database setup
- Error handling & logging
- Security best practices
- Performance optimizations
- Comprehensive API documentation

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the ISC License.

## 🆘 Support

For issues or questions:

1. Check the console logs for error messages
2. Verify database connection settings
3. Ensure all environment variables are set
4. Check CORS settings match your frontend URL

---

**DuoNest Backend** - Real-time chat with live typing, video/voice messages, and advanced multimedia features! 🚀📹🎙️
