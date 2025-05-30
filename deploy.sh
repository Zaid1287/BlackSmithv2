#!/bin/bash

echo "Starting deployment process..."

# Create dist directory structure
mkdir -p dist/public

# Build only the essential parts
echo "Building client application..."
NODE_ENV=production npx vite build --logLevel=error

# Build server
echo "Building server..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "Deployment build complete!"
echo "You can now deploy using 'npm run start'"