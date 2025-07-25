-- Create users table (without foreign key to couple_rooms initially)
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    last_active TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'unpaired' CHECK (status IN ('unpaired', 'in_room')),
    current_room_id VARCHAR(100)
);

-- Create couple_rooms table
CREATE TABLE couple_rooms (
    room_id VARCHAR(100) PRIMARY KEY,
    user1_id VARCHAR(50) NOT NULL,
    user2_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user1_id, user2_id)
);

-- Add foreign key constraint to users table after couple_rooms table exists
ALTER TABLE users ADD CONSTRAINT fk_users_current_room 
    FOREIGN KEY (current_room_id) REFERENCES couple_rooms(room_id) ON DELETE SET NULL;

-- Create messages table with comprehensive message types
CREATE TABLE messages (
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

-- Create indexes for performance (updated with new fields)
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_last_active ON users(last_active);
CREATE INDEX idx_couple_rooms_active ON couple_rooms(is_active);
CREATE INDEX idx_couple_rooms_last_activity ON couple_rooms(last_activity);
CREATE INDEX idx_messages_room_id ON messages(room_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_room_time ON messages(room_id, created_at);
CREATE INDEX idx_messages_type ON messages(message_type);
CREATE INDEX idx_messages_reply_to ON messages(reply_to_message_id);
CREATE INDEX idx_messages_expires_at ON messages(expires_at);
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- Additional indexes for specific message types
CREATE INDEX idx_messages_location ON messages(location_lat, location_lng) WHERE message_type = 'location';
CREATE INDEX idx_messages_file_url ON messages(file_url) WHERE file_url IS NOT NULL;
CREATE INDEX idx_messages_reactions ON messages(reply_to_message_id, emoji) WHERE message_type = 'emoji_reaction';

-- Function to clean up expired messages
CREATE OR REPLACE FUNCTION cleanup_expired_messages()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM messages 
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get message statistics
CREATE OR REPLACE FUNCTION get_message_stats(room_id_param VARCHAR)
RETURNS TABLE(
    message_type VARCHAR,
    count BIGINT,
    latest_message TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.message_type,
        COUNT(*) as count,
        MAX(m.created_at) as latest_message
    FROM messages m
    WHERE m.room_id = room_id_param
    GROUP BY m.message_type
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Add some constraints for data integrity
ALTER TABLE couple_rooms ADD CONSTRAINT chk_different_users 
    CHECK (user1_id != user2_id);

-- Optional: Add cleanup function for old inactive users/rooms
CREATE OR REPLACE FUNCTION cleanup_inactive_data()
RETURNS void AS $$
BEGIN
    -- Delete users inactive for more than 30 days with no room
    DELETE FROM users 
    WHERE last_active < NOW() - INTERVAL '30 days' 
    AND current_room_id IS NULL;
    
    -- Mark rooms as inactive if no activity for 7 days
    UPDATE couple_rooms 
    SET is_active = false 
    WHERE last_activity < NOW() - INTERVAL '7 days'
    AND is_active = true;
    
    -- Delete messages from inactive rooms older than 30 days
    DELETE FROM messages 
    WHERE room_id IN (
        SELECT room_id FROM couple_rooms 
        WHERE is_active = false 
        AND created_at < NOW() - INTERVAL '30 days'
    );
    
    -- Delete old inactive rooms
    DELETE FROM couple_rooms 
    WHERE is_active = false 
    AND created_at < NOW() - INTERVAL '30 days';
    
END;
$$ LANGUAGE plpgsql;