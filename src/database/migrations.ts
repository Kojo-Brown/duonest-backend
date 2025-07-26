import { readFileSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { query } from "./connection.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export class DatabaseMigrations {
  static async runMigrations(): Promise<void> {
    console.log("🔄 Running database migrations...");

    try {
      // Create migrations table if it doesn't exist
      await query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // List of migration files in order
      const migrations = [
        "001_create_recent_chats.sql",
        "002_create_live_typing_logs.sql",
        "003_create_users.sql",
        "004_create_couple_rooms.sql",
        "005_add_users_foreign_key.sql",
        "006_create_messages.sql",
        "007_create_functions.sql",
        "008_add_image_fields.sql",
        "009_add_video_fields.sql",
        "010_fix_duration_type.sql",
      ];

      for (const migrationFile of migrations) {
        await this.runMigration(migrationFile);
      }

      console.log("✅ All migrations completed successfully");
    } catch (error) {
      console.error("❌ Migration failed:", error);
      throw error;
    }
  }

  private static async runMigration(filename: string): Promise<void> {
    try {
      // Check if migration already executed
      const checkResult = await query(
        "SELECT id FROM migrations WHERE name = $1",
        [filename]
      );

      if (checkResult.rows.length > 0) {
        console.log(`⏭️  Skipping migration ${filename} (already executed)`);
        return;
      }

      console.log(`🔧 Running migration: ${filename}`);

      // For recent_chats migration, execute SQL statements individually
      if (filename === "001_create_recent_chats.sql") {
        await this.createRecentChatsTable();
      } else if (filename === "002_create_live_typing_logs.sql") {
        await this.createLiveTypingLogsTable();
      } else {
        // Read migration file for other migrations
        // Try multiple possible paths to handle different execution environments
        const possiblePaths = [
          join(__dirname, "migrations", filename),
          join(__dirname, "..", "database", "migrations", filename),
          join(process.cwd(), "dist", "database", "migrations", filename),
          join(process.cwd(), "src", "database", "migrations", filename),
        ];

        let migrationPath: string | null = null;
        for (const path of possiblePaths) {
          if (existsSync(path)) {
            migrationPath = path;
            break;
          }
        }

        if (!migrationPath) {
          throw new Error(
            `Migration file ${filename} not found. Tried paths: ${possiblePaths.join(
              ", "
            )}`
          );
        }

        console.log(`📁 Reading migration from: ${migrationPath}`);
        const migrationSQL = readFileSync(migrationPath, "utf8");
        await query(migrationSQL);
      }

      // Record migration as executed
      await query("INSERT INTO migrations (name) VALUES ($1)", [filename]);

      console.log(`✅ Migration ${filename} completed`);
    } catch (error) {
      console.error(`❌ Failed to run migration ${filename}:`, error);
      throw error;
    }
  }

  private static async createRecentChatsTable(): Promise<void> {
    // Create table
    await query(`
      CREATE TABLE IF NOT EXISTS recent_chats (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        room_id VARCHAR(255) NOT NULL,
        room_name VARCHAR(255),
        last_visited TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        participant_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add unique constraint if it doesn't exist
    try {
      await query(`
        ALTER TABLE recent_chats 
        ADD CONSTRAINT unique_user_room UNIQUE (user_id, room_id)
      `);
    } catch (error) {
      // Constraint might already exist, ignore error
      if (error instanceof Error && !error.message.includes("already exists")) {
        console.log("⚠️  Unique constraint might already exist, continuing...");
      }
    }

    // Create index if it doesn't exist
    try {
      await query(`
        CREATE INDEX IF NOT EXISTS idx_user_last_visited 
        ON recent_chats(user_id, last_visited DESC)
      `);
    } catch (error) {
      // Index might already exist, ignore error
      console.log("⚠️  Index might already exist, continuing...");
    }

    // Create update trigger function
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS 'BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;' LANGUAGE plpgsql
    `);

    // Create trigger
    await query(
      `DROP TRIGGER IF EXISTS recent_chats_updated_at_trigger ON recent_chats`
    );
    await query(`
      CREATE TRIGGER recent_chats_updated_at_trigger
        BEFORE UPDATE ON recent_chats
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);
  }

  private static async createLiveTypingLogsTable(): Promise<void> {
    // Create table
    await query(`
      CREATE TABLE IF NOT EXISTS live_typing_logs (
        id SERIAL PRIMARY KEY,
        room_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        content_length INTEGER,
        typing_duration INTEGER,
        keystrokes_count INTEGER,
        backspaces_count INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for performance
    try {
      await query(`
        CREATE INDEX IF NOT EXISTS idx_live_typing_room_user 
        ON live_typing_logs(room_id, user_id)
      `);
      await query(`
        CREATE INDEX IF NOT EXISTS idx_live_typing_created_at 
        ON live_typing_logs(created_at)
      `);
    } catch (error) {
      console.log("⚠️  Live typing indexes might already exist, continuing...");
    }
  }

  static async checkRecentChatsTable(): Promise<boolean> {
    try {
      const result = await query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'recent_chats'
        )
      `);
      return result.rows[0].exists;
    } catch (error) {
      console.error("Error checking recent_chats table:", error);
      return false;
    }
  }

  static async createRecentChatsTableIfNotExists(): Promise<void> {
    const tableExists = await this.checkRecentChatsTable();

    if (!tableExists) {
      console.log("🔧 Creating recent_chats table...");
      await this.runMigration("001_create_recent_chats.sql");
    } else {
      console.log("✅ recent_chats table already exists");
    }
  }
}
