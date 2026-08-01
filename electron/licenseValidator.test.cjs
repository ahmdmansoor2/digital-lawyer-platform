/**
 * Tests for licenseValidator.cjs — pure functions, runs in Node.
 * Use: `node electron/licenseValidator.test.cjs`
 */

const assert = require('assert');
const {
  verifyLicenseToken,
  signPayload,
  generateLicenseToken,
  getMachineId,
  isSameMachine,
} = require('./licenseValidator.cjs');

const TEST_SECRET = 'test-secret-32-chars-1234567890';

let pass = 0;
let fail = 0;
const failures = [];

function it(name, fn) {
  try {
    fn();
    pass++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    fail++;
    failures.push({ name, error: e.message });
    console.log(`  ✗ ${name}: ${e.message}`);
  }
}

function describe(name, fn) {
  console.log(`\n${name}`);
  fn();
}

describe('verifyLicenseToken — valid cases', () => {
  it('accepts a valid token', () => {
    const future = Date.now() + 365 * 24 * 60 * 60 * 1000; // 1 year
    const token = generateLicenseToken({ licenseId: 'abc', expiresAt: future, tier: 'pro' }, TEST_SECRET);
    const result = verifyLicenseToken(token, TEST_SECRET);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.payload.licenseId, 'abc');
    assert.strictEqual(result.payload.tier, 'pro');
  });

  it('marks tokens as expiring soon (within 7 days)', () => {
    const sixDaysFromNow = Date.now() + 6 * 24 * 60 * 60 * 1000;
    const token = generateLicenseToken({ expiresAt: sixDaysFromNow }, TEST_SECRET);
    const result = verifyLicenseToken(token, TEST_SECRET);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.expiringSoon, true);
    assert.ok(result.daysLeft <= 7);
  });

  it('does not mark tokens > 7 days as expiring soon', () => {
    const tenDaysFromNow = Date.now() + 10 * 24 * 60 * 60 * 1000;
    const token = generateLicenseToken({ expiresAt: tenDaysFromNow }, TEST_SECRET);
    const result = verifyLicenseToken(token, TEST_SECRET);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.expiringSoon, undefined);
  });
});

describe('verifyLicenseToken — expired', () => {
  it('rejects expired token', () => {
    const yesterday = Date.now() - 24 * 60 * 60 * 1000;
    const token = generateLicenseToken({ expiresAt: yesterday }, TEST_SECRET);
    const result = verifyLicenseToken(token, TEST_SECRET);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.expired, true);
    assert.ok(result.reason.includes('انتهت'));
  });

  it('reports days since expiry', () => {
    const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;
    const token = generateLicenseToken({ expiresAt: tenDaysAgo }, TEST_SECRET);
    const result = verifyLicenseToken(token, TEST_SECRET);
    assert.ok(result.reason.includes('10') || result.reason.includes('١٠'));
  });
});

describe('verifyLicenseToken — invalid', () => {
  it('rejects null token', () => {
    const result = verifyLicenseToken(null, TEST_SECRET);
    assert.strictEqual(result.valid, false);
  });

  it('rejects undefined token', () => {
    const result = verifyLicenseToken(undefined, TEST_SECRET);
    assert.strictEqual(result.valid, false);
  });

  it('rejects empty string', () => {
    const result = verifyLicenseToken('', TEST_SECRET);
    assert.strictEqual(result.valid, false);
  });

  it('rejects non-string token', () => {
    const result = verifyLicenseToken(12345, TEST_SECRET);
    assert.strictEqual(result.valid, false);
  });

  it('rejects wrong format (no dot)', () => {
    const result = verifyLicenseToken('no-dot-here', TEST_SECRET);
    assert.strictEqual(result.valid, false);
    assert.ok(result.reason.includes('تنسيق'));
  });

  it('rejects wrong format (too many dots)', () => {
    const result = verifyLicenseToken('a.b.c.d', TEST_SECRET);
    assert.strictEqual(result.valid, false);
  });

  it('rejects tampered signature', () => {
    const future = Date.now() + 365 * 24 * 60 * 60 * 1000;
    const token = generateLicenseToken({ expiresAt: future }, TEST_SECRET);
    // Tamper: replace last char of signature
    const tampered = token.slice(0, -1) + (token.slice(-1) === 'A' ? 'B' : 'A');
    const result = verifyLicenseToken(tampered, TEST_SECRET);
    assert.strictEqual(result.valid, false);
    assert.ok(result.reason.includes('مزور') || result.reason.includes('صحيح'));
  });

  it('rejects wrong secret', () => {
    const future = Date.now() + 365 * 24 * 60 * 60 * 1000;
    const token = generateLicenseToken({ expiresAt: future }, TEST_SECRET);
    const result = verifyLicenseToken(token, 'wrong-secret');
    assert.strictEqual(result.valid, false);
  });

  it('rejects missing expiresAt', () => {
    const token = generateLicenseToken({ licenseId: 'x' }, TEST_SECRET);
    const result = verifyLicenseToken(token, TEST_SECRET);
    assert.strictEqual(result.valid, false);
  });

  it('rejects invalid base64 payload', () => {
    const badToken = '!!!invalid-base64.signature';
    const result = verifyLicenseToken(badToken, TEST_SECRET);
    assert.strictEqual(result.valid, false);
  });
});

describe('getMachineId', () => {
  it('returns a string', () => {
    const id = getMachineId();
    assert.strictEqual(typeof id, 'string');
    assert.ok(id.length > 0);
  });

  it('returns same ID on consecutive calls', () => {
    const id1 = getMachineId();
    const id2 = getMachineId();
    assert.strictEqual(id1, id2);
  });

  it('returns 32-char hex string', () => {
    const id = getMachineId();
    assert.strictEqual(id.length, 32);
    assert.ok(/^[a-f0-9]+$/.test(id));
  });
});

describe('isSameMachine', () => {
  it('returns true for matching IDs', () => {
    const id = getMachineId();
    assert.strictEqual(isSameMachine(id, id), true);
  });

  it('returns false for different IDs', () => {
    assert.strictEqual(isSameMachine('aaaa', 'bbbb'), false);
  });

  it('handles case sensitivity (mismatch)', () => {
    assert.strictEqual(isSameMachine('ABCD', 'abcd'), false);
  });
});

describe('generateLicenseToken + verify round-trip', () => {
  it('round-trips correctly', () => {
    const payload = {
      licenseId: 'LIC-2026-001',
      officeName: 'مكتب المحامي',
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      tier: 'enterprise',
    };
    const token = generateLicenseToken(payload, TEST_SECRET);
    const result = verifyLicenseToken(token, TEST_SECRET);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.payload.licenseId, 'LIC-2026-001');
    assert.strictEqual(result.payload.tier, 'enterprise');
  });

  it('produces different tokens for different payloads', () => {
    const t1 = generateLicenseToken({ expiresAt: Date.now() + 1000 }, TEST_SECRET);
    const t2 = generateLicenseToken({ expiresAt: Date.now() + 2000 }, TEST_SECRET);
    assert.notStrictEqual(t1, t2);
  });

  it('produces different signatures for different secrets', () => {
    const payload = { expiresAt: Date.now() + 1000 };
    const t1 = generateLicenseToken(payload, 'secret-a');
    const t2 = generateLicenseToken(payload, 'secret-b');
    assert.notStrictEqual(t1, t2);
  });
});

console.log(`\n──────────────`);
console.log(`Total: ${pass + fail} | Pass: ${pass} | Fail: ${fail}`);

if (fail > 0) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
  process.exit(1);
} else {
  console.log('All tests passed ✓');
  process.exit(0);
}
