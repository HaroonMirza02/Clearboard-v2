#!/usr/bin/env node

// Simple script to start the server locally with proper environment setup
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting ClearBoard Backend Server...');
console.log('📍 Server will run on: http://localhost:8080');
console.log('🔧 Make sure you have your Google Cloud credentials set up');
console.log('');

// Set environment variables for local development
process.env.NODE_ENV = 'development';
process.env.PORT = '8080';

// Start the server
const server = spawn('node', ['server.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development',
    PORT: '8080'
  }
});

server.on('error', (err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`\n🛑 Server stopped with code ${code}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  server.kill('SIGTERM');
});
