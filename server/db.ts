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
    ssl: { rejectUnauthorized: false }, // Always use SSL for Neon
    max: 5, // Reduce connection pool size for serverless
    idleTimeoutMillis: 10000, // 10 seconds
    connectionTimeoutMillis: 10000, // 10 seconds
    keepAlive: true,
    keepAliveInitialDelayMillis: 0,
  });
  db = drizzle(pool, { schema });
} else {
  console.warn("Running in development mode without database connection");
}

export { pool, db };