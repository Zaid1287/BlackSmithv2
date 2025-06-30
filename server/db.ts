import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Always use SSL for Neon
  max: 5, // Reduce connection pool size for serverless
  idleTimeoutMillis: 10000, // 10 seconds
  connectionTimeoutMillis: 10000, // 10 seconds
  keepAlive: true,
  keepAliveInitialDelayMillis: 0,
});

export const db = drizzle(pool, { schema });