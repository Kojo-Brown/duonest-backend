import { Pool, PoolConfig } from "pg";

// Only load .env in development, not in production
if (process.env.NODE_ENV !== "production") {
  const { config } = await import("dotenv");
  config();
}

// Add debug logging to see what variables are available
console.log("🔍 Database Environment Variables:");
console.log("DB_HOST:", process.env.DB_HOST || "UNDEFINED");
console.log("DB_PORT:", process.env.DB_PORT || "UNDEFINED");
console.log("DB_NAME:", process.env.DB_NAME || "UNDEFINED");
console.log("DB_USER:", process.env.DB_USER || "UNDEFINED");
console.log("DB_PASSWORD:", process.env.DB_PASSWORD ? "[SET]" : "UNDEFINED");
console.log("NODE_ENV:", process.env.NODE_ENV || "UNDEFINED");

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Connection pool settings
  max: 20, // Maximum number of connections

  // Connection settings
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,

  // SSL configuration for production
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
};

export const pool = new Pool(poolConfig);

// Handle pool events
pool.on("connect", (client) => {
  console.log("New database client connected");
});

pool.on("error", (err) => {
  console.error("Database pool error:", err);
});

pool.on("remove", () => {
  console.log("Database client removed from pool");
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Closing database pool...");
  await pool.end();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Closing database pool...");
  await pool.end();
  process.exit(0);
});

// Database helper functions
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log("Query executed", {
      text: text.substring(0, 50),
      duration,
      rows: result.rowCount,
    });
    return result;
  } catch (error) {
    console.error("Database query error:", {
      text: text.substring(0, 50),
      error,
    });
    throw error;
  }
};

export const getClient = async () => {
  return await pool.connect();
};

// Test database connection
export const testConnection = async () => {
  try {
    const result = await query("SELECT NOW() as current_time");
    console.log("Database connection successful:", result.rows[0]);
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
};

export default pool;
