-- 008_add_image_fields.sql
-- Add image-specific fields to messages table for better image handling

-- Add image dimensions columns
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS image_width INTEGER,
ADD COLUMN IF NOT EXISTS image_height INTEGER;

-- Add index for image messages
CREATE INDEX IF NOT EXISTS idx_messages_image_dimensions ON messages(image_width, image_height) WHERE message_type = 'image';

-- Add comment to clarify image field usage
COMMENT ON COLUMN messages.image_width IS 'Width of image in pixels (for image message types)';
COMMENT ON COLUMN messages.image_height IS 'Height of image in pixels (for image message types)';
COMMENT ON COLUMN messages.thumbnail_url IS 'URL to thumbnail version of image/video (generated automatically)';