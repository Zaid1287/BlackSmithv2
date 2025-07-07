import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL not set - using placeholder for development");
  process.env.DATABASE_URL = "postgresql://placeholder@localhost:5432/placeholder";
}

// Create pool only if DATABASE_URL is properly configured for production
let pool: Pool | null = null;
let db: any = null;

if (process.env.DATABASE_URL && process.env.DATABASE_URL !== "postgresql://placeholder@localhost:5432/placeholder") {
  pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: process.env.NODE_ENV === 'production' ? 2 : 5, // Very conservative for Render
    min: 0, // Allow pool to scale down to 0
    idleTimeoutMillis: 5000, // 5 seconds - faster cleanup
    connectionTimeoutMillis: 8000, // 8 seconds
    keepAlive: false, // Disable keepalive for better connection management
    allowExitOnIdle: true, // Allow process to exit when idle
  });
  db = drizzle(pool, { schema });
} else {
  console.warn("Running in development mode without database connection");
}

export { pool, db };