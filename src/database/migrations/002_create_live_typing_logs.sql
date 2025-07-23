CREATE TABLE IF NOT EXISTS live_typing_logs (
    id SERIAL PRIMARY KEY,
    room_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    content_length INTEGER,
    typing_duration INTEGER,
    keystrokes_count INTEGER,
    backspaces_count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);