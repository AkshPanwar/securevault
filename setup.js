#!/usr/bin/env node
/**
 * SecureVault Setup Script
 * Automatically creates .env files with secure random values
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const generateSecret = (len = 48) => crypto.randomBytes(len).toString('hex');

console.log('\n🔐 SecureVault Setup\n');

// Backend .env
const backendEnv = `# SecureVault Backend Configuration
# Generated: ${new Date().toISOString()}

PORT=5000
MONGODB_URI=mongodb://localhost:27017/securevault

# JWT Secrets (auto-generated - keep secret!)
JWT_SECRET=${generateSecret()}
JWT_REFRESH_SECRET=${generateSecret()}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# AES Encryption Key (32 chars exactly)
AES_ENCRYPTION_KEY=${crypto.randomBytes(16).toString('hex')}

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800

# OTP Settings
OTP_EXPIRY_MINUTES=10

# Email (configure for production - OTPs print to console in dev)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
FROM_EMAIL=noreply@securevault.com

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

NODE_ENV=development
`;

const backendEnvPath = path.join(__dirname, 'backend', '.env');
if (!fs.existsSync(backendEnvPath)) {
  fs.writeFileSync(backendEnvPath, backendEnv);
  console.log('✅ Created backend/.env with secure secrets');
} else {
  console.log('⚠️  backend/.env already exists (skipped)');
}

// Frontend .env
const frontendEnv = `# SecureVault Frontend Configuration
REACT_APP_API_URL=http://localhost:5000/api
`;

const frontendEnvPath = path.join(__dirname, 'frontend', '.env');
if (!fs.existsSync(frontendEnvPath)) {
  fs.writeFileSync(frontendEnvPath, frontendEnv);
  console.log('✅ Created frontend/.env');
} else {
  console.log('⚠️  frontend/.env already exists (skipped)');
}

// Create upload directory
const uploadDir = path.join(__dirname, 'backend', 'uploads');
const encryptedDir = path.join(uploadDir, 'encrypted');
const tempDir = path.join(uploadDir, 'temp');

[uploadDir, encryptedDir, tempDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created ${path.relative(__dirname, dir)}/`);
  }
});

console.log(`
🚀 Setup complete!

Next steps:
  1. Start MongoDB: mongod
  2. Install dependencies: npm run install:all
  3. Start development: npm run dev

  Backend:  http://localhost:5000
  Frontend: http://localhost:3000

📧 Email / OTP:
  In development mode, OTPs print to the backend console.
  For production, add your SMTP credentials to backend/.env

📖 Default user: Register via the UI (no pre-seeded users)
`);
