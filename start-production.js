#!/usr/bin/env node

// Production startup script that forces development mode to bypass build issues
process.env.NODE_ENV = 'production';
process.env.FORCE_DEV_MODE = 'true';

// Import and run the server
import('./server/index.ts');