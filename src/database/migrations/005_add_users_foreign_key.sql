-- 005_add_users_foreign_key.sql
-- Add foreign key constraint to users table after couple_rooms table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_users_current_room' 
        AND table_name = 'users'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT fk_users_current_room 
            FOREIGN KEY (current_room_id) REFERENCES couple_rooms(room_id) ON DELETE SET NULL;
    END IF;
END $$;