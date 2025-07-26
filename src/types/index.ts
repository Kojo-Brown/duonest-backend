export interface User {
  id: string;
  created_at: Date;
  last_active: Date;
  status: "unpaired" | "in_room";
  current_room_id?: string;
}

export interface CoupleRoom {
  room_id: string;
  user1_id: string;
  user2_id?: string;
  created_at: Date;
  is_active: boolean;
  last_activity: Date;
}

export interface Message {
  id: number;
  room_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  created_at: Date;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  thumbnail_url?: string;
  duration?: number;
  reply_to_message_id?: number;
  forwarded_from?: string;
  location_lat?: number;
  location_lng?: number;
  expires_at?: Date;
  view_once: boolean;
  poll_options?: string[];
  emoji?: string;
  delivered_at?: Date;
  seen_at?: Date;
  seen_by_user_id?: string;
  image_width?: number;
  image_height?: number;
  video_duration?: number;
  video_width?: number;
  video_height?: number;
  video_bitrate?: number;
}
