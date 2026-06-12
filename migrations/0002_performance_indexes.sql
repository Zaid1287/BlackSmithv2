-- Performance indexes (added during audit).
-- Safe to run directly against the database (idempotent via IF NOT EXISTS).
-- These match the index names generated from shared/schema.ts, so running
-- `npm run db:push` afterwards is a no-op for them.
--
-- Apply with:  psql "$DATABASE_URL" -f migrations/0002_performance_indexes.sql
-- CREATE INDEX CONCURRENTLY avoids locking the table; it cannot run inside a
-- transaction block, so run this file with autocommit (psql does by default).

CREATE INDEX CONCURRENTLY IF NOT EXISTS journeys_driver_start_idx ON journeys (driver_id, start_time);
CREATE INDEX CONCURRENTLY IF NOT EXISTS journeys_status_idx       ON journeys (status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS journeys_start_time_idx   ON journeys (start_time);

CREATE INDEX CONCURRENTLY IF NOT EXISTS expenses_journey_time_idx ON expenses (journey_id, "timestamp");
CREATE INDEX CONCURRENTLY IF NOT EXISTS expenses_category_idx     ON expenses (category);

CREATE INDEX CONCURRENTLY IF NOT EXISTS salary_payments_user_idx    ON salary_payments (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS salary_payments_paid_at_idx ON salary_payments (paid_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS emi_payments_vehicle_idx    ON emi_payments (vehicle_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS emi_payments_created_at_idx ON emi_payments (created_at);
