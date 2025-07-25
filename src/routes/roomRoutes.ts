import { Router, Request, Response } from 'express';
import { validateRoomId } from '../middleware/userValidation.js';
import { RoomService } from '../services/roomService.js';
import { MessageService } from '../services/messageService.js';
import { validateUserIdFormat } from '../utils/userIdGenerator.js';

const router = Router();

// GET /c/:roomId - Room info and chat interface
router.get('/c/:roomId', validateRoomId, async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    
    const room = await RoomService.getRoom(roomId);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Don't return sensitive user data, just basic room info
    res.json({
      roomId: room.room_id,
      isActive: room.is_active,
      participantCount: room.user2_id ? 2 : 1,
      maxParticipants: 2,
      canJoin: !room.user2_id && room.is_active,
      createdAt: room.created_at,
      lastActivity: room.last_activity
    });

  } catch (error) {
    console.error('Error getting room info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /c/:roomId/join - Join a room with user ID
router.post('/c/:roomId/join', validateRoomId, async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!validateUserIdFormat(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    // Check if user exists, create if not
    const userResult = await RoomService.createUser(userId).catch(() => null);
    
    // Try to join the room
    const updatedRoom = await RoomService.joinRoom(roomId, userId);

    if (!updatedRoom) {
      return res.status(400).json({ 
        error: 'Cannot join room - room may be full or inactive' 
      });
    }

    res.json({
      message: 'Joined room successfully',
      room: {
        roomId: updatedRoom.room_id,
        isActive: updatedRoom.is_active,
        participantCount: updatedRoom.user2_id ? 2 : 1
      },
      userId,
      userUrl: `/u/${userId}`
    });

  } catch (error) {
    console.error('Error joining room:', error);
    
    // Handle duplicate user creation error gracefully
    if (error instanceof Error && error.message.includes('duplicate')) {
      // User already exists, try to join room anyway
      try {
        const { roomId } = req.params;
        const { userId } = req.body;
        
        const updatedRoom = await RoomService.joinRoom(roomId, userId);
        
        if (!updatedRoom) {
          return res.status(400).json({ 
            error: 'Cannot join room - room may be full or inactive' 
          });
        }

        return res.json({
          message: 'Joined room successfully',
          room: {
            roomId: updatedRoom.room_id,
            isActive: updatedRoom.is_active,
            participantCount: updatedRoom.user2_id ? 2 : 1
          },
          userId,
          userUrl: `/u/${userId}`
        });
      } catch (joinError) {
        console.error('Error in fallback join:', joinError);
        return res.status(500).json({ error: 'Internal server error' });
      }
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /c/:roomId/messages - Get all messages for a room (requires userId verification)
router.get('/c/:roomId/messages', validateRoomId, async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.query;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    // Validate userId is provided
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'User ID is required to view messages' });
    }

    // Validate userId format
    if (!validateUserIdFormat(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    // Check if user is a member of this room
    const room = await RoomService.getRoom(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Debug logging for room membership
    console.log(`🔍 Room access check - RoomId: ${roomId}, UserId: ${userId}`);
    console.log(`🏠 Room state - user1_id: ${room.user1_id}, user2_id: ${room.user2_id}, is_active: ${room.is_active}`);
    
    // Verify user is either user1 or user2 in the room
    if (room.user1_id !== userId && room.user2_id !== userId) {
      console.log(`❌ Access denied - User ${userId} not found in room ${roomId}`);
      console.log(`🔍 Comparison - user1_id === userId: ${room.user1_id === userId}, user2_id === userId: ${room.user2_id === userId}`);
      return res.status(403).json({ error: 'Access denied. You are not a member of this room.' });
    }

    console.log(`✅ Access granted - User ${userId} is a member of room ${roomId}`);

    // Get messages from database (ordered by creation time ascending)
    const messages = await MessageService.getRoomMessages(roomId, limit, offset);
    
    // Reverse to get chronological order (oldest first)
    const chronologicalMessages = messages.reverse();

    res.json({
      success: true,
      roomId,
      messages: chronologicalMessages,
      count: chronologicalMessages.length,
      limit,
      offset
    });

  } catch (error) {
    console.error('Error fetching room messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;