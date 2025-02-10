#!/bin/bash

# Install dependencies for the main app
npm install

# Build the main app
npm run build

# Navigate to server directory
cd server

# Install production dependencies for the server
npm install --production

# Build the server
npm run build

# Copy web.config to the deployment directory
cp web.config dist/

# The deployment will automatically start the server using the web.config configuration 