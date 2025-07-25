import { Router, Request, Response } from 'express';
import { validateUserId, UserRequest } from '../middleware/userValidation.js';
import { MessageService } from '../services/messageService.js';
import { RoomService } from '../services/roomService.js';
import { voiceUpload, handleUploadError } from '../middleware/fileUpload.js';

const router = Router();

// GET /api/u/:userId/messages/:roomId - Get messages for a room
router.get('/u/:userId/messages/:roomId', validateUserId, async (req: UserRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { roomId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Verify user is in the room
    const userRoom = await RoomService.getUserCurrentRoom(userId);
    if (!userRoom || userRoom.room_id !== roomId) {
      return res.status(403).json({ error: 'User not authorized to view messages in this room' });
    }

    const messages = await MessageService.getRoomMessages(roomId, limit, offset);

    res.json({
      roomId,
      messages,
      count: messages.length,
      limit,
      offset
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/u/:userId/unread-messages/:roomId - Get unread messages
router.get('/u/:userId/unread-messages/:roomId', validateUserId, async (req: UserRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { roomId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Verify user is in the room
    const userRoom = await RoomService.getUserCurrentRoom(userId);
    if (!userRoom || userRoom.room_id !== roomId) {
      return res.status(403).json({ error: 'User not authorized to view messages in this room' });
    }

    const unreadMessages = await MessageService.getUnreadMessages(roomId, userId);

    res.json({
      roomId,
      unreadMessages,
      count: unreadMessages.length
    });

  } catch (error) {
    console.error('Error fetching unread messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/u/:userId/mark-messages-seen/:roomId - Mark messages as seen
router.post('/u/:userId/mark-messages-seen/:roomId', validateUserId, async (req: UserRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { roomId } = req.params;
    const { messageIds } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({ error: 'Message IDs array is required' });
    }

    // Verify user is in the room
    const userRoom = await RoomService.getUserCurrentRoom(userId);
    if (!userRoom || userRoom.room_id !== roomId) {
      return res.status(403).json({ error: 'User not authorized to mark messages in this room' });
    }

    // Mark each message as seen
    for (const messageId of messageIds) {
      await MessageService.markMessageAsSeen(messageId, userId);
    }

    res.json({
      message: 'Messages marked as seen',
      markedCount: messageIds.length
    });

  } catch (error) {
    console.error('Error marking messages as seen:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/u/:userId/message/:messageId - Delete a message
router.delete('/u/:userId/message/:messageId', validateUserId, async (req: UserRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const messageId = parseInt(req.params.messageId);

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (isNaN(messageId)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }

    const deleted = await MessageService.deleteMessage(messageId, userId);

    if (!deleted) {
      return res.status(404).json({ error: 'Message not found or not authorized to delete' });
    }

    res.json({
      message: 'Message deleted successfully',
      messageId
    });

  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/u/:userId/upload-voice/:roomId - Upload voice message
router.post('/u/:userId/upload-voice/:roomId', validateUserId, voiceUpload.single('audio'), handleUploadError, async (req: UserRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { roomId } = req.params;
    const { duration, tempId } = req.body;
    const audioFile = req.file;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!audioFile) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required' });
    }

    // Verify user is in the room
    const userRoom = await RoomService.getUserCurrentRoom(userId);
    if (!userRoom || userRoom.room_id !== roomId) {
      return res.status(403).json({ error: 'User not authorized to send messages in this room' });
    }

    // Save voice message to database
    const message = await MessageService.saveMessage({
      room_id: roomId,
      sender_id: userId,
      content: 'Voice message',
      message_type: 'voice',
      file_url: `${process.env.NODE_ENV === 'production' ? 'https://duonest-backend-production.up.railway.app' : `${req.protocol}://${req.get('host')}`}/uploads/voice/${audioFile.filename}`,
      file_name: audioFile.filename,
      file_size: audioFile.size,
      duration: parseInt(duration) || 0
    });

    res.json({
      success: true,
      messageId: message.id,
      file_url: `${process.env.NODE_ENV === 'production' ? 'https://duonest-backend-production.up.railway.app' : `${req.protocol}://${req.get('host')}`}/uploads/voice/${audioFile.filename}`,
      file_name: audioFile.filename,
      file_size: audioFile.size,
      duration: parseInt(duration) || 0,
      tempId: tempId,
      message: message
    });

  } catch (error) {
    console.error('Error saving voice message:', error);
    res.status(500).json({ error: 'Failed to save voice message' });
  }
});

// POST /api/voice-message - Alternative voice message upload endpoint
router.post('/voice-message', voiceUpload.single('audio'), handleUploadError, async (req: Request, res: Response) => {
  try {
    const { userId, roomId, duration, tempId } = req.body;
    const audioFile = req.file;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (!audioFile) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required' });
    }

    // Verify user is in the room
    const userRoom = await RoomService.getUserCurrentRoom(userId);
    if (!userRoom || userRoom.room_id !== roomId) {
      return res.status(403).json({ error: 'User not authorized to send messages in this room' });
    }

    // Save voice message to database
    const message = await MessageService.saveMessage({
      room_id: roomId,
      sender_id: userId,
      content: 'Voice message',
      message_type: 'voice',
      file_url: `${process.env.NODE_ENV === 'production' ? 'https://duonest-backend-production.up.railway.app' : `${req.protocol}://${req.get('host')}`}/uploads/voice/${audioFile.filename}`,
      file_name: audioFile.filename,
      file_size: audioFile.size,
      duration: parseInt(duration) || 0
    });

    res.json({
      success: true,
      messageId: message.id,
      file_url: `${process.env.NODE_ENV === 'production' ? 'https://duonest-backend-production.up.railway.app' : `${req.protocol}://${req.get('host')}`}/uploads/voice/${audioFile.filename}`,
      file_name: audioFile.filename,
      file_size: audioFile.size,
      duration: parseInt(duration) || 0,
      tempId: tempId,
      message: message
    });

  } catch (error) {
    console.error('Error saving voice message:', error);
    res.status(500).json({ error: 'Failed to save voice message' });
  }
});

export default router;