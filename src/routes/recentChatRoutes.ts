import express from 'express';
import { query } from '../database/connection.js';
import { DatabaseMigrations } from '../database/migrations.js';

const router = express.Router();

// GET /api/recent-chats/:userId
router.get('/recent-chats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Ensure recent_chats table exists
    const tableExists = await DatabaseMigrations.checkRecentChatsTable();
    if (!tableExists) {
      console.log('⚠️  recent_chats table missing, creating...');
      await DatabaseMigrations.createRecentChatsTableIfNotExists();
    }

    const queryText = `
      SELECT room_id, room_name, last_visited, participant_count, is_active
      FROM recent_chats 
      WHERE user_id = $1 
      ORDER BY last_visited DESC 
      LIMIT 10
    `;

    const result = await query(queryText, [userId]);

    // Format to match frontend RecentChat interface
    const recentChats = result.rows.map(row => ({
      roomId: row.room_id,
      roomName: row.room_name,
      lastVisited: row.last_visited,
      participantCount: row.participant_count,
      isActive: row.is_active
    }));

    res.json(recentChats);
  } catch (error) {
    console.error('Error fetching recent chats:', error);
    
    // Check if error is due to missing table
    if (error instanceof Error && error.message.includes('recent_chats')) {
      try {
        console.log('🔧 Attempting to create recent_chats table...');
        await DatabaseMigrations.createRecentChatsTableIfNotExists();
        res.status(503).json({ 
          error: 'Database table was missing but has been created. Please try again.',
          retry: true
        });
      } catch (createError) {
        console.error('Failed to create recent_chats table:', createError);
        res.status(500).json({ error: 'Database configuration error' });
      }
    } else {
      res.status(500).json({ error: 'Failed to fetch recent chats' });
    }
  }
});

// POST /api/recent-chats
router.post('/recent-chats', async (req, res) => {
  try {
    const { userId, roomId, roomName } = req.body;

    if (!userId || !roomId) {
      return res.status(400).json({ error: 'userId and roomId are required' });
    }

    const queryText = `
      INSERT INTO recent_chats (user_id, room_id, room_name, last_visited, is_active)
      VALUES ($1, $2, $3, NOW(), true)
      ON CONFLICT (user_id, room_id)
      DO UPDATE SET
        room_name = EXCLUDED.room_name,
        last_visited = NOW(),
        is_active = true,
        updated_at = NOW()
    `;

    await query(queryText, [userId, roomId, roomName || `Room ${roomId}`]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding/updating recent chat:', error);
    res.status(500).json({ error: 'Failed to add/update recent chat' });
  }
});

// PUT /api/recent-chats/:userId/:roomId
router.put('/recent-chats/:userId/:roomId', async (req, res) => {
  try {
    const { userId, roomId } = req.params;
    const { participantCount, isActive } = req.body;

    const queryText = `
      UPDATE recent_chats 
      SET participant_count = $1, is_active = $2, updated_at = NOW()
      WHERE user_id = $3 AND room_id = $4
    `;

    const result = await query(queryText, [participantCount, isActive, userId, roomId]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Recent chat not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating recent chat:', error);
    res.status(500).json({ error: 'Failed to update recent chat' });
  }
});

// DELETE /api/recent-chats/:userId/:roomId
router.delete('/recent-chats/:userId/:roomId', async (req, res) => {
  try {
    const { userId, roomId } = req.params;

    const queryText = `DELETE FROM recent_chats WHERE user_id = $1 AND room_id = $2`;
    const result = await query(queryText, [userId, roomId]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Recent chat not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting recent chat:', error);
    res.status(500).json({ error: 'Failed to delete recent chat' });
  }
});

export default router;