import { query } from "../database/connection.js";
import { v4 as uuidv4 } from "uuid";
import { User, CoupleRoom } from "../types/index.js";

export class RoomService {
  static async createUser(userId: string): Promise<User> {
    const result = await query(
      "INSERT INTO users (id, created_at, last_active, status) VALUES ($1, NOW(), NOW(), $2) RETURNING *",
      [userId, "unpaired"]
    );
    return result.rows[0];
  }

  static async updateUserActivity(userId: string): Promise<void> {
    await query("UPDATE users SET last_active = NOW() WHERE id = $1", [userId]);
  }

  static async createRoom(
    user1Id: string,
    user2Id?: string
  ): Promise<CoupleRoom> {
    const roomId = uuidv4();

    const result = await query(
      "INSERT INTO couple_rooms (room_id, user1_id, user2_id, created_at, is_active, last_activity) VALUES ($1, $2, $3, NOW(), true, NOW()) RETURNING *",
      [roomId, user1Id, user2Id || null]
    );

    // Update user status to in_room
    await query(
      "UPDATE users SET status = $1, current_room_id = $2 WHERE id = $3",
      ["in_room", roomId, user1Id]
    );

    if (user2Id) {
      await query(
        "UPDATE users SET status = $1, current_room_id = $2 WHERE id = $3",
        ["in_room", roomId, user2Id]
      );
    }

    return result.rows[0];
  }

  static async joinRoom(
    roomId: string,
    userId: string
  ): Promise<CoupleRoom | null> {
    // Check if room exists and is active
    const roomResult = await query(
      "SELECT * FROM couple_rooms WHERE room_id = $1 AND is_active = true",
      [roomId]
    );

    if (roomResult.rows.length === 0) {
      return null;
    }

    const room = roomResult.rows[0];

    // Check if user is already in the room
    if (room.user1_id === userId || room.user2_id === userId) {
      console.log(`User ${userId} is already in room 
    ${roomId}`);
      // Update user status and return current room
      await query(
        "UPDATE users SET status = $1, current_room_id = $2 WHERE id = $3",
        ["in_room", roomId, userId]
      );
      return room;
    }

    // If room is full (has both users), return null
    if (room.user2_id) {
      return null;
    }

    // Join the room as user2
    const result = await query(
      "UPDATE couple_rooms SET user2_id = $1, last_activity = NOW() WHERE room_id = $2 RETURNING *",
      [userId, roomId]
    );

    // Update user status
    await query(
      "UPDATE users SET status = $1, current_room_id = $2 WHERE id = $3",
      ["in_room", roomId, userId]
    );

    return result.rows[0];
  }

  static async leaveRoom(userId: string): Promise<void> {
    // Get user's current room
    const userResult = await query(
      "SELECT current_room_id FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].current_room_id) {
      return;
    }

    const roomId = userResult.rows[0].current_room_id;

    // Get room details
    const roomResult = await query(
      "SELECT * FROM couple_rooms WHERE room_id = $1",
      [roomId]
    );

    if (roomResult.rows.length === 0) {
      return;
    }

    const room = roomResult.rows[0];

    // Update user status
    await query(
      "UPDATE users SET status = $1, current_room_id = NULL WHERE id = $2",
      ["unpaired", userId]
    );

    // If user leaving is user1, make user2 the new user1 (if exists)
    if (room.user1_id === userId && room.user2_id) {
      await query(
        "UPDATE couple_rooms SET user1_id = $1, user2_id = NULL WHERE room_id = $2",
        [room.user2_id, roomId]
      );
    }
    // If user leaving is user2, just remove them
    else if (room.user2_id === userId) {
      await query(
        "UPDATE couple_rooms SET user2_id = NULL WHERE room_id = $1",
        [roomId]
      );
    }
    // If only user1 and they're leaving, deactivate room
    else if (room.user1_id === userId && !room.user2_id) {
      await query(
        "UPDATE couple_rooms SET is_active = false WHERE room_id = $1",
        [roomId]
      );
    }
  }

  static async getUserCurrentRoom(userId: string): Promise<CoupleRoom | null> {
    const result = await query(
      `SELECT cr.* FROM couple_rooms cr 
       JOIN users u ON u.current_room_id = cr.room_id 
       WHERE u.id = $1 AND cr.is_active = true`,
      [userId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  static async getRoom(roomId: string): Promise<CoupleRoom | null> {
    const result = await query(
      "SELECT * FROM couple_rooms WHERE room_id = $1",
      [roomId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }
}
