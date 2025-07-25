import { Router, Response } from 'express';
import { validateUserId, UserRequest } from '../middleware/userValidation.js';
import { RoomService } from '../services/roomService.js';
import { generateRandomUserId } from '../utils/userIdGenerator.js';

const router = Router();

// GET /u/:userId - User dashboard/room status
router.get('/u/:userId', validateUserId, async (req: UserRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { userExists } = req;

    // Create user if doesn't exist
    if (!userExists && userId) {
      await RoomService.createUser(userId);
    }

    // Update user activity
    if (userId) {
      await RoomService.updateUserActivity(userId);
    }

    // Get user's current room if any
    const currentRoom = userId ? await RoomService.getUserCurrentRoom(userId) : null;

    res.json({
      userId,
      userExists: userExists || false,
      currentRoom,
      status: currentRoom ? 'in_room' : 'unpaired'
    });

  } catch (error) {
    console.error('Error in user route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /u/:userId/create-room - Create a new room
router.post('/u/:userId/create-room', validateUserId, async (req: UserRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { userExists } = req;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Create user if doesn't exist
    if (!userExists) {
      await RoomService.createUser(userId);
    }

    // Check if user is already in a room
    const existingRoom = await RoomService.getUserCurrentRoom(userId);
    if (existingRoom) {
      return res.status(400).json({ 
        error: 'User already in a room',
        currentRoom: existingRoom 
      });
    }

    // Create new room
    const newRoom = await RoomService.createRoom(userId);

    // Small delay to ensure database consistency
    await new Promise(resolve => setTimeout(resolve, 100));

    res.json({
      message: 'Room created successfully',
      room: newRoom,
      joinUrl: `/c/${newRoom.room_id}`
    });

  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /u/:userId/leave-room - Leave current room
router.post('/u/:userId/leave-room', validateUserId, async (req: UserRequest, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    await RoomService.leaveRoom(userId);

    res.json({
      message: 'Left room successfully',
      status: 'unpaired'
    });

  } catch (error) {
    console.error('Error leaving room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /generate-user-id - Generate a new random user ID
router.get('/generate-user-id', (req, res) => {
  const userId = generateRandomUserId();
  res.json({
    userId,
    userUrl: `/u/${userId}`
  });
});

export default router;