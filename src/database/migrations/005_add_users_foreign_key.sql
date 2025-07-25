-- 005_add_users_foreign_key.sql
-- Add foreign key constraint to users table after couple_rooms table exists
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS fk_users_current_room 
    FOREIGN KEY (current_room_id) REFERENCES couple_rooms(room_id) ON DELETE SET NULL;