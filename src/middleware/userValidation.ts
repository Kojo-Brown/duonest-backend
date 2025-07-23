import { Request, Response, NextFunction } from 'express';
import { validateUserIdFormat } from '../utils/userIdGenerator.js';
import { query } from '../database/connection.js';

export interface UserRequest extends Request {
  userId?: string;
  userExists?: boolean;
}

export const validateUserId = async (req: UserRequest, res: Response, next: NextFunction) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  if (!validateUserIdFormat(userId)) {
    return res.status(400).json({ error: 'Invalid user ID format. Expected: adjective-noun-numbers' });
  }

  try {
    // Check if user exists in database
    const result = await query('SELECT id FROM users WHERE id = $1', [userId]);
    
    req.userId = userId;
    req.userExists = result.rows.length > 0;
    
    next();
  } catch (error) {
    console.error('Error validating user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const validateRoomId = async (req: Request, res: Response, next: NextFunction) => {
  const { roomId } = req.params;

  if (!roomId) {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  // Room ID format validation (you can customize this)
  if (roomId.length < 3 || roomId.length > 100) {
    return res.status(400).json({ error: 'Invalid room ID format' });
  }

  try {
    // Check if room exists in database
    const result = await query('SELECT room_id FROM couple_rooms WHERE room_id = $1', [roomId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    next();
  } catch (error) {
    console.error('Error validating room:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};