-- 003_create_users.sql
-- Create users table (without foreign key to couple_rooms initially)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    last_active TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'unpaired' CHECK (status IN ('unpaired', 'in_room')),
    current_room_id VARCHAR(100)
);

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);