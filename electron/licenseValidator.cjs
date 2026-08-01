/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * licenseValidator.cjs — License token validation logic.
 *
 * Extracted from main.cjs for testability.
 * Pure functions, no I/O. Tested via Node's `assert` module.
 *
 * Format: "<payload_b64url>.<signature_b64url_truncated>"
 * Signature = HMAC-SHA256(secret, payload) → base64url → first 16 chars (uppercase)
 */

const crypto = require('crypto');

/**
 * Build a license signature (used by the license generator app, not the validator).
 * Exposed here for symmetry / testing.
 */
function signPayload(payloadB64, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(payloadB64)
    .digest('base64url')
    .substring(0, 16)
    .toUpperCase();
}

/**
 * Verify a license token. Returns:
 *   - { valid: true, payload }
 *   - { valid: false, reason: '...', expired?: true, payload?: ... }
 */
function verifyLicenseToken(token, secret) {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'مفتاح غير موجود' };
  }
  try {
    const parts = token.trim().split('.');
    if (parts.length !== 2) {
      return { valid: false, reason: 'تنسيق غير صحيح' };
    }
    const [payloadB64, signature] = parts;
    if (!payloadB64 || !signature) {
      return { valid: false, reason: 'تنسيق غير صحيح' };
    }

    const expectedSig = signPayload(payloadB64, secret);

    if (expectedSig !== signature) {
      return { valid: false, reason: 'مفتاح غير صحيح أو مزوّر' };
    }

    let payload;
    try {
      const decoded = Buffer.from(payloadB64, 'base64url').toString('utf-8');
      payload = JSON.parse(decoded);
    } catch (_) {
      return { valid: false, reason: 'بيانات المفتاح تالفة' };
    }

    if (typeof payload.expiresAt !== 'number') {
      return { valid: false, reason: 'بيانات المفتاح غير مكتملة' };
    }

    if (Date.now() > payload.expiresAt) {
      const daysAgo = Math.ceil((Date.now() - payload.expiresAt) / (1000 * 60 * 60 * 24));
      return { valid: false, reason: `انتهت صلاحية الترخيص منذ ${daysAgo} يوم`, expired: true, payload };
    }

    // Warn if expiring soon (within 7 days)
    const daysLeft = Math.ceil((payload.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 7) {
      return { valid: true, payload, expiringSoon: true, daysLeft };
    }

    return { valid: true, payload };
  } catch (e) {
    return { valid: false, reason: 'خطأ في قراءة المفتاح' };
  }
}

/**
 * Generate a license token (for license-generator-app).
 */
function generateLicenseToken(payload, secret) {
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const signature = signPayload(payloadB64, secret);
  return `${payloadB64}.${signature}`;
}

/**
 * Generate a machine fingerprint (matches the main app).
 */
function getMachineId() {
  try {
    const os = require('os');
    const cpus = os.cpus();
    const cpuModel = cpus.length > 0 ? cpus[0].model : 'unknown';
    const raw = `${os.hostname()}::${os.platform()}::${cpuModel}::${os.arch()}`;
    return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32);
  } catch {
    return 'fallback-machine-id';
  }
}

/**
 * Compare two machine IDs. Returns true if they match.
 */
function isSameMachine(storedId, currentId) {
  return storedId === currentId;
}

module.exports = {
  verifyLicenseToken,
  signPayload,
  generateLicenseToken,
  getMachineId,
  isSameMachine,
};
