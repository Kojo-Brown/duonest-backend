-- 009_add_video_fields.sql
-- Add video-specific fields to messages table for better video handling

-- Add video metadata columns
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS video_duration FLOAT,
ADD COLUMN IF NOT EXISTS video_width INTEGER,
ADD COLUMN IF NOT EXISTS video_height INTEGER,
ADD COLUMN IF NOT EXISTS video_bitrate INTEGER;

-- Add index for video messages
CREATE INDEX IF NOT EXISTS idx_messages_video_metadata ON messages(video_width, video_height, video_duration) WHERE message_type = 'video';

-- Add comment to clarify video field usage
COMMENT ON COLUMN messages.video_duration IS 'Duration of video in seconds (for video message types)';
COMMENT ON COLUMN messages.video_width IS 'Width of video in pixels (for video message types)';
COMMENT ON COLUMN messages.video_height IS 'Height of video in pixels (for video message types)';
COMMENT ON COLUMN messages.video_bitrate IS 'Bitrate of video in bits per second (for video message types)';
COMMENT ON COLUMN messages.duration IS 'Duration in seconds (used for both audio and video messages)';