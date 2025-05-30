#!/usr/bin/env node

// Production startup script
process.env.NODE_ENV = 'production';

// Check if dist directory exists, if not, force dev mode
import fs from 'fs';
import path from 'path';

const distPath = path.resolve(process.cwd(), 'dist/public');
if (!fs.existsSync(distPath)) {
  console.log('Build directory not found, running in development mode');
  process.env.FORCE_DEV_MODE = 'true';
}

// Import and run the server
import('./server/index.ts');