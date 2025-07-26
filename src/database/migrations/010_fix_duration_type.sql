-- 010_fix_duration_type.sql
-- Fix duration field to support decimal values for accurate video/audio duration

-- Change duration from INTEGER to FLOAT to support decimal seconds
ALTER TABLE messages 
ALTER COLUMN duration TYPE FLOAT;

-- Add comment to clarify the change
COMMENT ON COLUMN messages.duration IS 'Duration in seconds with decimal precision (for audio and video messages)';