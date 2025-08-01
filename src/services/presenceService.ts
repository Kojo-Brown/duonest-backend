import { query } from '../database/connection.js';

// In-memory store for active socket connections
const activeUsers = new Map<string, string>(); // userId -> socketId
const userSockets = new Map<string, string>(); // socketId -> userId

export class PresenceService {
  
  static setUserOnline(userId: string, socketId: string): void {
    activeUsers.set(userId, socketId);
    userSockets.set(socketId, userId);
    
    // Update database
    this.updateUserPresence(userId, true);
  }

  static setUserOffline(socketId: string): string | null {
    const userId = userSockets.get(socketId);
    if (userId) {
      activeUsers.delete(userId);
      userSockets.delete(socketId);
      
      // Update database
      this.updateUserPresence(userId, false);
      
      return userId;
    }
    return null;
  }

  static getUserBySocketId(socketId: string): string | null {
    return userSockets.get(socketId) || null;
  }

  static getSocketByUserId(userId: string): string | null {
    return activeUsers.get(userId) || null;
  }

  static isUserOnline(userId: string): boolean {
    return activeUsers.has(userId);
  }

  static getOnlineUsers(): string[] {
    return Array.from(activeUsers.keys());
  }

  private static async updateUserPresence(userId: string, isOnline: boolean): Promise<void> {
    try {
      if (isOnline) {
        await query(
          'UPDATE users SET last_active = NOW() WHERE id = $1',
          [userId]
        );
      } else {
        await query(
          'UPDATE users SET last_active = NOW() WHERE id = $1',
          [userId]
        );
      }
    } catch (error) {
      console.error('Error updating user presence:', error);
    }
  }

  static async getRoomParticipants(roomId: string): Promise<{ user1_id: string; user2_id?: string }> {
    if (!roomId) {
      throw new Error('Room ID is required');
    }
    
    const result = await query(
      'SELECT user1_id, user2_id FROM couple_rooms WHERE room_id = $1',
      [roomId]
    );

    if (result.rows.length === 0) {
      throw new Error('Room not found');
    }

    return result.rows[0];
  }

  static async getUsersInRoom(roomId: string): Promise<string[]> {
    try {
      const participants = await this.getRoomParticipants(roomId);
      const users = [participants.user1_id];
      
      if (participants.user2_id) {
        users.push(participants.user2_id);
      }
      
      return users;
    } catch (error) {
      // Room doesn't exist yet or other error, return empty array
      return [];
    }
  }
}