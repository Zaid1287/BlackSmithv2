import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL not set - using placeholder for development");
  process.env.DATABASE_URL = "postgresql://placeholder@localhost:5432/placeholder";
}

// Database connection state
let pool: Pool | null = null;
let db: any = null;
let isConnected = false;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;

// Create connection with comprehensive timeout and error handling
async function createDatabaseConnection(): Promise<void> {
  if (process.env.DATABASE_URL === "postgresql://placeholder@localhost:5432/placeholder") {
    console.warn("Running in development mode without database connection");
    return;
  }

  connectionAttempts++;
  console.log(`Attempting database connection (attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})`);

  try {
    pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: process.env.NODE_ENV === 'production' ? 2 : 5,
      min: 0,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 8000, // 8 seconds max
      keepAlive: false,
      allowExitOnIdle: true,
      // Critical: Set statement timeout to prevent hanging
      statement_timeout: 10000, // 10 seconds
      query_timeout: 15000, // 15 seconds
    });

    // Test connection with timeout
    const testConnection = pool.connect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 10000)
    );

    const client = await Promise.race([testConnection, timeoutPromise]) as any;
    await client.query('SELECT 1');
    client.release();

    db = drizzle(pool, { schema });
    isConnected = true;
    console.log('✅ Database connected successfully');

    // Handle pool errors gracefully
    pool.on('error', (err) => {
      console.error('Database pool error:', err);
      isConnected = false;
    });

  } catch (error: any) {
    console.error(`❌ Database connection failed (attempt ${connectionAttempts}):`, error.message);
    isConnected = false;
    
    if (pool) {
      try {
        await pool.end();
      } catch (closeError) {
        console.error('Error closing failed pool:', closeError);
      }
      pool = null;
    }

    // Retry with exponential backoff
    if (connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
      const delay = Math.min(1000 * Math.pow(2, connectionAttempts - 1), 10000);
      console.log(`Retrying in ${delay}ms...`);
      setTimeout(createDatabaseConnection, delay);
    } else {
      console.error('🚨 All database connection attempts failed - continuing without database');
    }
  }
}

// Initialize connection but don't block app startup
createDatabaseConnection().catch(err => {
  console.error('Failed to initialize database connection:', err);
});

// Health check function
export function getDatabaseHealth(): { connected: boolean; message: string } {
  return {
    connected: isConnected,
    message: isConnected 
      ? 'Database connected' 
      : connectionAttempts >= MAX_CONNECTION_ATTEMPTS 
        ? 'Database unavailable - operating in degraded mode'
        : 'Database connecting...'
  };
}

// Safe database wrapper that handles disconnection gracefully
export function safeDb() {
  if (!isConnected || !db) {
    throw new Error('Database not available - please try again later');
  }
  return db;
}

export { pool, db, isConnected };