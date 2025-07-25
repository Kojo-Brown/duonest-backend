-- 004_create_couple_rooms.sql
-- Create couple_rooms table
CREATE TABLE IF NOT EXISTS couple_rooms (
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

-- Create indexes for couple_rooms
CREATE INDEX IF NOT EXISTS idx_couple_rooms_active ON couple_rooms(is_active);
CREATE INDEX IF NOT EXISTS idx_couple_rooms_last_activity ON couple_rooms(last_activity);

-- Add constraint for data integrity
ALTER TABLE couple_rooms ADD CONSTRAINT IF NOT EXISTS chk_different_users 
    CHECK (user1_id != user2_id);