#!/bin/bash

# Kill any existing postgres processes
pkill -f postgres 2>/dev/null || true

# Clean up and create fresh database setup
rm -rf /tmp/postgres_data /tmp/run/postgresql
mkdir -p /tmp/run/postgresql

# Initialize database
initdb -D /tmp/postgres_data --auth-local=trust --auth-host=trust -U runner

# Start PostgreSQL server
postgres -D /tmp/postgres_data -k /tmp/run/postgresql -p 5433 > /tmp/postgres.log 2>&1 &

# Wait for server to start
sleep 5

# Create database
PGHOST=/tmp/run/postgresql PGPORT=5433 createdb blacksmith_traders

# Set environment variable for app
export DATABASE_URL="postgresql://runner@localhost:5433/blacksmith_traders?host=/tmp/run/postgresql"

echo "PostgreSQL setup complete!"
echo "DATABASE_URL: $DATABASE_URL"