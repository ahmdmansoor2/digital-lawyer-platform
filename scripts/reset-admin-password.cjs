/**
 * Reset admin password to "admin123"
 *
 * Usage: node scripts/reset-admin-password.cjs
 *
 * Searches common Electron userData directories for users.json
 * and replaces the admin user's passwordHash with a freshly
 * computed PBKDF2 hash matching the app's algorithm.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const HASH_ITERATIONS = 100_000;
const HASH_KEY_LENGTH = 256; // bits
const SALT_BYTES = 16;
const NEW_PASSWORD = 'admin123';

function bufferToHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateSalt() {
  return bufferToHex(crypto.randomBytes(SALT_BYTES));
}

function hashPassword(password, salt) {
  const saltStr = salt || generateSalt();
  const key = crypto.pbkdf2Sync(password, saltStr, HASH_ITERATIONS, HASH_KEY_LENGTH / 8, 'sha256');
  return `pbkdf2$${HASH_ITERATIONS}$${saltStr}$${bufferToHex(key)}`;
}

// ── Search candidates ──────────────────────────────────────────────
const candidates = [
  // Portable / packaged app userData directories
  path.join(process.env.APPDATA || '', 'react-example', 'users.json'),
  path.join(process.env.APPDATA || '', 'منصة المحامي الرقمية', 'users.json'),
  path.join(process.env.APPDATA || '', 'law-firm-manager', 'users.json'),
  path.join(process.env.APPDATA || '', 'law-office-desktop', 'users.json'),
  path.join(process.env.APPDATA || '', 'SmartLawyerOffice', 'users.json'),
  // Dev build userData (--user-data-dir)
  path.join(process.env.LOCALAPPDATA || '', 'react-example', 'users.json'),
  // Fallback: any directory under APPDATA containing users.json
  ...fs.existsSync(process.env.APPDATA || '')
    ? fs.readdirSync(process.env.APPDATA)
        .filter(n => n.startsWith('react') || n.startsWith('law') || n.startsWith('Smart') || n.startsWith('منصة'))
        .map(n => path.join(process.env.APPDATA, n, 'users.json'))
    : [],
];

let found = false;
for (const file of candidates) {
  if (!fs.existsSync(file)) continue;
  try {
    let data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    let changed = false;
    if (!Array.isArray(data)) continue;
    for (const user of data) {
      if (user.username === 'admin' || user.role === 'admin' || user.role === 'super_admin') {
        const oldHash = (user.passwordHash || '').substring(0, 40);
        user.passwordHash = hashPassword(NEW_PASSWORD);
        console.log(`✓ Updated user "${user.username}" (id=${user.id || '?'})`);
        console.log(`  Old hash (first 40): ${oldHash}`);
        console.log(`  New hash (first 40): ${user.passwordHash.substring(0, 40)}`);
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`✓ Written to ${file}`);
      found = true;
    } else {
      console.log(`! No admin user found in ${file}`);
    }
  } catch (e) {
    console.error(`✗ Error processing ${file}: ${e.message}`);
  }
}

if (!found) {
  console.log('✗ Could not locate users.json with an admin user.');
  console.log('  Try: node -e "console.log(process.env.APPDATA)"');
  console.log('  Then look for the app\'s userData folder inside it.');
} else {
  console.log(`\n✓ Done. Admin password reset to "${NEW_PASSWORD}"`);
}
