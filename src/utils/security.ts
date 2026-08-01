/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * أدوات الأمان والمصادقة (Authentication & Security Utilities)
 *
 * - bcrypt-like hashing (PBKDF2-like with Web Crypto API)
 * - TOTP (Time-based One-Time Password) for 2FA
 * - Device fingerprinting
 * - Rate limiting helpers
 */

// ====================================================================
// HASHING (PBKDF2-based, Web Crypto API)
// ====================================================================

const HASH_ITERATIONS = 100_000;
const HASH_KEY_LENGTH = 256;

export async function hashPassword(password: string, salt?: string): Promise<string> {
  const saltStr = salt || generateSalt();
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(saltStr), iterations: HASH_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    HASH_KEY_LENGTH
  );
  return `pbkdf2$${HASH_ITERATIONS}$${saltStr}$${bufferToHex(bits)}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const parts = hash.split('$');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
    const saltStr = parts[2];
    const expectedHash = parts[3];
    const computed = await hashPassword(password, saltStr);
    return constantTimeEqual(computed, hash);
  } catch {
    return false;
  }
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return bufferToHex(arr.buffer);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ====================================================================
// TOTP (Time-based One-Time Password) for 2FA — RFC 6238
// ====================================================================

const TOTP_PERIOD = 30; // seconds
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1; // ±1 period for clock skew

/** HMAC-SHA1 عبر Web Crypto API (يعمل في المتصفح) */
async function hmacSha1(keyBytes: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes as BufferSource,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, data as BufferSource);
  return new Uint8Array(sig);
}

/** توليد سر TOTP جديد (base32) */
export function generateTotpSecret(): string {
  const arr = new Uint8Array(20);
  crypto.getRandomValues(arr);
  return base32Encode(arr);
}

/** حساب TOTP code لوقت معين (async بسبب Web Crypto) */
export async function getTotpCode(secret: string, time: number = Date.now()): Promise<string> {
  const counter = Math.floor(time / 1000 / TOTP_PERIOD);
  const counterBytes = new ArrayBuffer(8);
  const view = new DataView(counterBytes);
  view.setUint32(0, Math.floor(counter / 0x100000000));
  view.setUint32(4, counter & 0xffffffff);
  const key = base32Decode(secret);
  const hmac = await hmacSha1(key, new Uint8Array(counterBytes));
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24 |
    (hmac[offset + 1] & 0xff) << 16 |
    (hmac[offset + 2] & 0xff) << 8 |
    (hmac[offset + 3] & 0xff)) % Math.pow(10, TOTP_DIGITS);
  return code.toString().padStart(TOTP_DIGITS, '0');
}

/** التحقق من كود TOTP (مع تسامح ±1 فترة) — async */
export async function verifyTotp(secret: string, code: string): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  for (let w = -TOTP_WINDOW; w <= TOTP_WINDOW; w++) {
    const t = Date.now() + w * TOTP_PERIOD * 1000;
    if ((await getTotpCode(secret, t)) === code) return true;
  }
  return false;
}

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let result = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += BASE32_ALPHABET[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }
  if (bits > 0) result += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  return result;
}

function base32Decode(str: string): Uint8Array {
  const clean = str.toUpperCase().replace(/=+$/, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

// ====================================================================
// DEVICE / BROWSER DETECTION
// ====================================================================

export function getDeviceInfo(): { deviceName: string; os: string; browser: string } {
  if (typeof window === 'undefined') return { deviceName: 'Unknown', os: 'Unknown', browser: 'Unknown' };
  const ua = navigator.userAgent;

  let os = 'Unknown';
  if (/Windows NT 10/.test(ua)) os = 'Windows 10/11';
  else if (/Windows NT 6.3/.test(ua)) os = 'Windows 8.1';
  else if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iPhone|iPad/.test(ua)) os = 'iOS';
  else if (/Linux/.test(ua)) os = 'Linux';

  let browser = 'Unknown';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua)) browser = 'Safari';

  const deviceName = `${browser} على ${os}`;
  return { deviceName, os, browser };
}

// ====================================================================
// IP DETECTION (WebRTC-based local IP — simplistic)
// ====================================================================

export async function getLocalIp(): Promise<string> {
  return new Promise(resolve => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      pc.onicecandidate = e => {
        if (e.candidate) {
          const ip = e.candidate.candidate.split(' ')[4];
          pc.close();
          resolve(ip || '127.0.0.1');
        }
      };
      pc.createOffer().then(offer => pc.setLocalDescription(offer));
      setTimeout(() => { pc.close(); resolve('127.0.0.1'); }, 2000);
    } catch {
      resolve('127.0.0.1');
    }
  });
}

// ====================================================================
// PASSWORD POLICY VALIDATION
// ====================================================================

export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireDigits: boolean;
  requireSpecialChars: boolean;
}

export interface PasswordValidation {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very_strong';
}

export function validatePassword(password: string, reqs: PasswordRequirements): PasswordValidation {
  const errors: string[] = [];
  if (password.length < reqs.minLength) errors.push(`الحد الأدنى ${reqs.minLength} حرف`);
  if (reqs.requireUppercase && !/[A-Z]/.test(password)) errors.push('يجب أن تحتوي على حرف كبير');
  if (reqs.requireLowercase && !/[a-z]/.test(password)) errors.push('يجب أن تحتوي على حرف صغير');
  if (reqs.requireDigits && !/\d/.test(password)) errors.push('يجب أن تحتوي على رقم');
  if (reqs.requireSpecialChars && !/[^A-Za-z0-9]/.test(password)) errors.push('يجب أن تحتوي على رمز خاص');

  let strength: PasswordValidation['strength'] = 'weak';
  const lengthScore = Math.min(password.length / 16, 1);
  const variety = (reqs.requireUppercase && /[A-Z]/.test(password) ? 1 : 0) +
    (reqs.requireLowercase && /[a-z]/.test(password) ? 1 : 0) +
    (reqs.requireDigits && /\d/.test(password) ? 1 : 0) +
    (reqs.requireSpecialChars && /[^A-Za-z0-9]/.test(password) ? 1 : 0);
  const score = lengthScore * 0.6 + (variety / 4) * 0.4;
  if (score > 0.85) strength = 'very_strong';
  else if (score > 0.65) strength = 'strong';
  else if (score > 0.4) strength = 'medium';

  return { valid: errors.length === 0, errors, strength };
}

// ====================================================================
// RATE LIMITING (In-memory token bucket)
// ====================================================================

interface TokenBucket { tokens: number; lastRefill: number; }

const buckets = new Map<string, TokenBucket>();

export function checkRateLimit(key: string, maxTokens: number, refillPerSec: number): boolean {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: maxTokens, lastRefill: now };
    buckets.set(key, bucket);
  }
  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(maxTokens, bucket.tokens + elapsed * refillPerSec);
  bucket.lastRefill = now;
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return true;
  }
  return false;
}

// ====================================================================
// CSRF / XSS PROTECTION
// ====================================================================

/** تنظيف النص من أي scripts أو HTML خطير */
export function sanitizeText(text: string): string {
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, 'data:text/plain');
}

/** التحقق من أن النص لا يحتوي على حقن SQL */
export function hasSqlInjection(text: string): boolean {
  const patterns = [
    /(\bSELECT\b.*\bFROM\b)/i,
    /(\bINSERT\b.*\bINTO\b)/i,
    /(\bUPDATE\b.*\bSET\b)/i,
    /(\bDELETE\b.*\bFROM\b)/i,
    /(\bDROP\b.*\bTABLE\b)/i,
    /(--;)/,
    /(;.*--)/,
    /('.*OR.*'='.*)/i,
  ];
  return patterns.some(p => p.test(text));
}

// ====================================================================
// HTML ESCAPING (for XSS prevention in templates)
// ====================================================================

export function escapeHtml(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ====================================================================
// SESSION TOKEN GENERATION
// ====================================================================

export function generateSessionToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return 'tk_' + bufferToHex(arr.buffer);
}

export function generateOtp(length: number = 6): string {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  let otp = '';
  for (let i = 0; i < length; i++) otp += (arr[i] % 10).toString();
  return otp;
}

export function generateId(prefix: string = ''): string {
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  const ts = Date.now().toString(36);
  const rand = bufferToHex(arr.buffer).slice(0, 8);
  return prefix ? `${prefix}_${ts}${rand}` : `${ts}${rand}`;
}