-- 007_create_functions.sql
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