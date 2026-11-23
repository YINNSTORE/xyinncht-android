'use strict';

// Serv00 Passenger expects a CommonJS app.js entry point.
// Load the API environment file before importing the ES module server.
const fs = require('node:fs');
const path = require('node:path');
const envFile = path.join(__dirname, 'apps', 'api', '.env');

if (fs.existsSync(envFile) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(envFile);
}

import('./apps/api/src/server.js').catch((error) => {
  console.error('[XyinnCht API] gagal dijalankan:', error);
  process.exitCode = 1;
});
