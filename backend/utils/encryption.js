const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32;

function getKey() {
  const key = process.env.AES_ENCRYPTION_KEY || 'default_key_change_in_production!';
  // Ensure key is exactly 32 bytes
  return Buffer.from(key.padEnd(KEY_LENGTH, '0').slice(0, KEY_LENGTH));
}

/**
 * Encrypt a file and save to destination
 */
async function encryptFile(sourcePath, destPath) {
  return new Promise((resolve, reject) => {
    const key = getKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const input = fs.createReadStream(sourcePath);
    const output = fs.createWriteStream(destPath);

    // Prepend IV to encrypted file
    output.write(iv);

    input.pipe(cipher).pipe(output);

    output.on('finish', () => {
      resolve({ iv: iv.toString('hex') });
    });

    output.on('error', reject);
    input.on('error', reject);
  });
}

/**
 * Decrypt a file and return buffer
 */
async function decryptFile(encryptedPath, ivHex) {
  return new Promise((resolve, reject) => {
    const key = getKey();
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    const input = fs.createReadStream(encryptedPath, { start: 16 }); // Skip IV
    const chunks = [];

    input.pipe(decipher);

    decipher.on('data', (chunk) => chunks.push(chunk));
    decipher.on('end', () => resolve(Buffer.concat(chunks)));
    decipher.on('error', reject);
    input.on('error', reject);
  });
}

/**
 * Decrypt file to stream
 */
function decryptFileStream(encryptedPath, ivHex) {
  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  const input = fs.createReadStream(encryptedPath, { start: 16 });
  return input.pipe(decipher);
}

/**
 * Encrypt text
 */
function encryptText(text) {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt text
 */
function decryptText(encryptedText) {
  const [ivHex, encrypted] = encryptedText.split(':');
  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Generate file checksum
 */
async function generateChecksum(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

module.exports = {
  encryptFile,
  decryptFile,
  decryptFileStream,
  encryptText,
  decryptText,
  generateChecksum,
};
