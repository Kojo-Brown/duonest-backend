-- 011_add_delivery_receipt_fields.sql
-- Add delivery and read receipt tracking fields to messages table

-- Add delivery and read receipt columns
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS seen_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS seen_by_user_id VARCHAR(50);

-- Add indexes for delivery and read receipt queries
CREATE INDEX IF NOT EXISTS idx_messages_delivered_at ON messages(delivered_at);
CREATE INDEX IF NOT EXISTS idx_messages_seen_at ON messages(seen_at);
CREATE INDEX IF NOT EXISTS idx_messages_seen_by ON messages(seen_by_user_id);

-- Add composite index for unread message queries
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(room_id, sender_id, seen_at) WHERE seen_at IS NULL;

-- Add comments to clarify field usage
COMMENT ON COLUMN messages.delivered_at IS 'Timestamp when message was delivered to recipient';
COMMENT ON COLUMN messages.seen_at IS 'Timestamp when message was read/seen by recipient';
COMMENT ON COLUMN messages.seen_by_user_id IS 'User ID of who marked the message as seen/read';