import { query } from '../database/connection.js';
import { Message } from '../types/index.js';

export class MessageService {
  
  static async saveMessage(messageData: {
    room_id: string;
    sender_id: string;
    content: string;
    message_type?: string;
    file_url?: string;
    file_name?: string;
    file_size?: number;
    thumbnail_url?: string | null;
    duration?: number;
    reply_to_message_id?: number;
    location_lat?: number;
    location_lng?: number;
    emoji?: string;
    image_width?: number;
    image_height?: number;
    video_duration?: number;
    video_width?: number;
    video_height?: number;
    video_bitrate?: number;
  }): Promise<Message> {
    const {
      room_id,
      sender_id,
      content,
      message_type = 'text',
      file_url,
      file_name,
      file_size,
      thumbnail_url,
      duration,
      reply_to_message_id,
      location_lat,
      location_lng,
      emoji,
      image_width,
      image_height,
      video_duration,
      video_width,
      video_height,
      video_bitrate
    } = messageData;

    const result = await query(
      `INSERT INTO messages (
        room_id, sender_id, content, message_type, file_url, file_name, 
        file_size, thumbnail_url, duration, reply_to_message_id,
        location_lat, location_lng, emoji, image_width, image_height,
        video_duration, video_width, video_height, video_bitrate, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW()) 
      RETURNING *`,
      [
        room_id, sender_id, content, message_type, file_url, file_name,
        file_size, thumbnail_url, duration, reply_to_message_id,
        location_lat, location_lng, emoji, image_width, image_height,
        video_duration, video_width, video_height, video_bitrate
      ]
    );

    return result.rows[0];
  }

  static async markMessageAsDelivered(messageId: number): Promise<void> {
    await query(
      'UPDATE messages SET delivered_at = NOW() WHERE id = $1',
      [messageId.toString()]
    );
  }

  static async markMessageAsSeen(messageId: number, userId: string): Promise<void> {
    await query(
      'UPDATE messages SET seen_at = NOW(), seen_by_user_id = $2 WHERE id = $1',
      [messageId.toString(), userId]
    );
  }

  static async getMessage(messageId: number): Promise<Message | null> {
    const result = await query(
      'SELECT * FROM messages WHERE id = $1',
      [messageId.toString()]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  static async getRoomMessages(roomId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    const result = await query(
      `SELECT *, 
       EXTRACT(EPOCH FROM created_at) * 1000 as timestamp_ms
       FROM messages 
       WHERE room_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [roomId, limit, offset]
    );

    return result.rows;
  }

  static async getUnreadMessages(roomId: string, userId: string): Promise<Message[]> {
    const result = await query(
      `SELECT * FROM messages 
       WHERE room_id = $1 
       AND sender_id != $2 
       AND (seen_at IS NULL OR seen_by_user_id != $2)
       ORDER BY created_at ASC`,
      [roomId, userId]
    );

    return result.rows;
  }

  static async deleteMessage(messageId: number, userId: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM messages WHERE id = $1 AND sender_id = $2',
      [messageId.toString(), userId]
    );

    return (result.rowCount ?? 0) > 0;
  }
}