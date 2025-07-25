-- 006_create_messages.sql
-- Create messages table with comprehensive message types
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    room_id VARCHAR(100) NOT NULL,
    sender_id VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN (
        'text', 'image', 'video', 'voice', 'audio', 'file', 'gif', 'sticker', 
        'location', 'contact', 'link', 'poll', 'drawing', 'emoji_reaction', 
        'reply', 'forward', 'system'
    )),
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- File/Media related fields
    file_url VARCHAR(500),
    file_name VARCHAR(255),
    file_size BIGINT, -- in bytes
    thumbnail_url VARCHAR(500),
    duration INTEGER, -- in seconds for voice/video
    
    -- Message relationship fields
    reply_to_message_id INTEGER,
    forwarded_from VARCHAR(50),
    
    -- Location fields
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    
    -- Special message features
    expires_at TIMESTAMP, -- for disappearing messages
    view_once BOOLEAN DEFAULT false,
    poll_options TEXT[], -- array of poll options
    emoji VARCHAR(10), -- for emoji reactions
    
    -- Foreign key constraints
    FOREIGN KEY (room_id) REFERENCES couple_rooms(room_id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reply_to_message_id) REFERENCES messages(id) ON DELETE SET NULL
);

-- Create indexes for messages table
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_room_time ON messages(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON messages(expires_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- Additional indexes for specific message types
CREATE INDEX IF NOT EXISTS idx_messages_location ON messages(location_lat, location_lng) WHERE message_type = 'location';
CREATE INDEX IF NOT EXISTS idx_messages_file_url ON messages(file_url) WHERE file_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_reactions ON messages(reply_to_message_id, emoji) WHERE message_type = 'emoji_reaction';