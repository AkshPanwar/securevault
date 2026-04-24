/**
 * Deterministic Security Scoring System
 * NO Math.random() - all values are deterministic based on file properties
 */

const path = require('path');

// Risk weights for file extensions
const EXTENSION_PENALTIES = {
  // Blocked (already rejected by malware scanner, but score them anyway)
  '.exe': 60, '.dll': 60, '.bat': 55, '.cmd': 55, '.com': 55,
  '.vbs': 55, '.ps1': 55, '.sh': 50, '.bash': 50, '.py': 35,
  '.js': 30, '.jar': 45, '.class': 40, '.php': 35, '.asp': 40,
  // Risky
  '.zip': 20, '.rar': 20, '.7z': 20, '.tar': 18, '.gz': 15,
  '.dmg': 25, '.iso': 20, '.apk': 30, '.ipa': 25,
  // Medium risk
  '.html': 15, '.htm': 15, '.xml': 10, '.svg': 12, '.json': 5,
  '.csv': 3, '.sql': 20, '.db': 22,
  // Low risk / safe
  '.pdf': 8, '.docx': 5, '.doc': 7, '.xlsx': 5, '.xls': 7,
  '.pptx': 5, '.ppt': 7, '.odt': 5, '.ods': 5, '.odp': 5,
  '.txt': 2, '.md': 2, '.rtf': 3,
  '.jpg': 2, '.jpeg': 2, '.png': 2, '.gif': 3, '.webp': 2,
  '.bmp': 3, '.tiff': 2, '.heic': 3,
  '.mp4': 3, '.mov': 3, '.avi': 5, '.mkv': 4, '.webm': 3,
  '.mp3': 2, '.wav': 2, '.flac': 2, '.aac': 2, '.ogg': 2,
  '.ttf': 5, '.otf': 5, '.woff': 5, '.woff2': 4,
};

const SUSPICIOUS_NAME_PATTERNS = [
  /invoice/i, /payment/i, /urgent/i, /account/i, /verify/i,
  /confirm/i, /update/i, /secure/i, /free/i, /prize/i,
  /\d{8,}/,  // long number sequences
  /password/i, /passwd/i, /credential/i, /login/i,
];

/**
 * Deterministic hash of a string → number in [0, 1)
 * Uses djb2-style algorithm
 */
function deterministicHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0; // keep 32-bit unsigned
  }
  return hash / 0xFFFFFFFF;
}

/**
 * Score file size (0–20 penalty)
 * Small files get no penalty; very large files get slight penalty
 */
function scoreSizePenalty(bytes) {
  if (bytes < 100 * 1024) return 0;          // < 100KB: no penalty
  if (bytes < 1024 * 1024) return 2;         // < 1MB: tiny penalty
  if (bytes < 10 * 1024 * 1024) return 5;   // < 10MB: small penalty
  if (bytes < 50 * 1024 * 1024) return 10;  // < 50MB: medium penalty
  return 18;                                  // > 50MB: larger penalty
}

/**
 * Score suspicious filename patterns (0–20 penalty)
 */
function scoreNamePenalty(filename) {
  let penalty = 0;
  const base = path.basename(filename, path.extname(filename));

  for (const pattern of SUSPICIOUS_NAME_PATTERNS) {
    if (pattern.test(base)) {
      penalty += 10;
      break; // Only count once
    }
  }

  // Multiple extensions (e.g., file.pdf.exe)
  const dotCount = (base.match(/\./g) || []).length;
  if (dotCount > 0) penalty += dotCount * 5;

  return Math.min(penalty, 20);
}

/**
 * Main deterministic security scoring function
 * Returns score 10–100 (higher = more secure)
 */
function calculateSecurityScore(fileData) {
  const { name, size, mimeType } = fileData;

  const ext = path.extname(name || '').toLowerCase();

  // Start with base score
  let baseScore = 95;

  // Extension penalty (0–60)
  const extPenalty = EXTENSION_PENALTIES[ext] || 8;
  baseScore -= extPenalty;

  // Size penalty (0–18)
  const sizePenalty = scoreSizePenalty(size || 0);
  baseScore -= sizePenalty;

  // Name penalty (0–20)
  const namePenalty = scoreNamePenalty(name || '');
  baseScore -= namePenalty;

  // Deterministic variation ±5 based on filename hash (no randomness)
  const hashVariation = Math.round((deterministicHash(name || 'file') * 10) - 5);
  baseScore += hashVariation;

  // Clamp to 10–100
  const score = Math.max(10, Math.min(100, Math.round(baseScore)));

  return score;
}

/**
 * Get risk level from score
 */
function getRiskLevel(score) {
  if (score >= 80) return 'low';
  if (score >= 50) return 'medium';
  return 'high';
}

/**
 * Full scan result object
 */
function getSecurityAssessment(fileData) {
  const score = calculateSecurityScore(fileData);
  const riskLevel = getRiskLevel(score);
  return {
    securityScore: score,
    riskLevel,
  };
}

module.exports = {
  calculateSecurityScore,
  getRiskLevel,
  getSecurityAssessment,
};
