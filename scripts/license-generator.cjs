/**
 * license-generator.cjs
 * =====================
 * مولّد مفاتيح الترخيص التجاري — شغّله على جهازك فقط لتوليد مفاتيح للعملاء
 * 
 * الاستخدام:
 *   node scripts/license-generator.cjs --name "أحمد العبدالله" --plan pro --days 365
 *   node scripts/license-generator.cjs --name "مكتب الحقانية" --plan firm --days 30
 *   node scripts/license-generator.cjs --name "شركة قانون" --plan enterprise --days 9999
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ─── المفتاح السري الخاص بك — لا تشاركه أبداً ───────────────────────────────
// غيّره إلى سلسلة عشوائية طويلة خاصة بك
const SECRET_KEY = '92f30bdcce19b2897a38ef479714285b301375685fb59d5ee63f83837c600c541c41910e46fa64136d1c24ee96b88ce7';

// ─── خطط الاشتراك المتاحة ────────────────────────────────────────────────────
const PLANS = {
  trial:      { label: 'تجريبي',    features: ['basic'], maxCases: 5,  maxFiles: 10  },
  pro:        { label: 'محامي Pro', features: ['basic', 'ai', 'library', 'print'], maxCases: 9999, maxFiles: 9999 },
  firm:       { label: 'مكتب',      features: ['basic', 'ai', 'library', 'print', 'team'], maxCases: 9999, maxFiles: 9999 },
  enterprise: { label: 'مؤسسة',    features: ['all'],  maxCases: 9999, maxFiles: 9999 },
};

// ─── توليد مفتاح الترخيص ─────────────────────────────────────────────────────
function generateLicenseKey(customerName, plan, daysValid) {
  const planInfo = PLANS[plan];
  if (!planInfo) {
    console.error(`❌ خطة غير موجودة: ${plan}. الخطط المتاحة: ${Object.keys(PLANS).join(', ')}`);
    process.exit(1);
  }

  const now = Date.now();
  const expiresAt = now + (daysValid * 24 * 60 * 60 * 1000);
  const licenseId = crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase();

  const payload = {
    id: licenseId,
    customer: customerName,
    plan: plan,
    issuedAt: now,
    expiresAt: expiresAt,
    maxCases: planInfo.maxCases,
    maxFiles: planInfo.maxFiles,
    features: planInfo.features,
  };

  const payloadStr = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadStr).toString('base64url');

  // HMAC-SHA256 signature
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(payloadB64)
    .digest('base64url')
    .substring(0, 16)
    .toUpperCase();

  // Format: LAWPRO-XXXX-XXXX-XXXX-SIG (user-friendly)
  const keyParts = licenseId.match(/.{1,4}/g);
  const licenseKey = `LAWPRO-${keyParts.join('-')}-${signature.substring(0, 4)}`;

  // Activation code (sent via email) = full token
  const activationToken = `${payloadB64}.${signature}`;

  return {
    licenseKey,        // المفتاح المرئي للعميل (للتعريف)
    activationToken,   // رمز التفعيل الكامل (يُرسل بالبريد)
    payload,
    planLabel: planInfo.label,
    expiresDate: new Date(expiresAt).toLocaleDateString('ar-EG'),
  };
}

// ─── التحقق من مفتاح الترخيص ─────────────────────────────────────────────────
function verifyLicenseToken(token) {
  try {
    const [payloadB64, signature] = token.split('.');
    if (!payloadB64 || !signature) return { valid: false, reason: 'تنسيق غير صحيح' };

    // Verify signature
    const expectedSig = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(payloadB64)
      .digest('base64url')
      .substring(0, 16)
      .toUpperCase();

    if (expectedSig !== signature) {
      return { valid: false, reason: 'مفتاح مزوّر أو غير صحيح' };
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));

    // Check expiry
    if (Date.now() > payload.expiresAt) {
      return { valid: false, reason: 'انتهت صلاحية الترخيص', expired: true, payload };
    }

    return { valid: true, payload };
  } catch (e) {
    return { valid: false, reason: 'خطأ في قراءة المفتاح: ' + e.message };
  }
}

// ─── واجهة سطر الأوامر ────────────────────────────────────────────────────────
const args = process.argv.slice(2);

// Mode: verify
if (args.includes('--verify')) {
  const tokenIdx = args.indexOf('--token');
  if (tokenIdx === -1 || !args[tokenIdx + 1]) {
    console.error('الاستخدام: node license-generator.cjs --verify --token <TOKEN>');
    process.exit(1);
  }
  const result = verifyLicenseToken(args[tokenIdx + 1]);
  console.log('\n🔍 نتيجة التحقق:');
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.valid ? 0 : 1);
}

// Mode: generate
const nameIdx = args.indexOf('--name');
const planIdx = args.indexOf('--plan');
const daysIdx = args.indexOf('--days');

if (nameIdx === -1 || planIdx === -1 || daysIdx === -1) {
  console.log(`
📋 مولّد مفاتيح ترخيص — منصة المحامي الرقمية
=============================================

الاستخدام:
  node scripts/license-generator.cjs --name "اسم العميل" --plan <خطة> --days <أيام>

الخطط المتاحة:
  trial       → تجريبي (5 قضايا، 10 ملفات)
  pro         → محامي Pro (غير محدود + AI)
  firm        → مكتب المحاماة (كامل + فريق)
  enterprise  → مؤسسة (كل شيء)

أمثلة:
  node scripts/license-generator.cjs --name "أحمد محمود" --plan pro --days 365
  node scripts/license-generator.cjs --name "مكتب الحقانية" --plan firm --days 30
  node scripts/license-generator.cjs --name "تجريبي" --plan trial --days 7

للتحقق من مفتاح:
  node scripts/license-generator.cjs --verify --token <TOKEN>
`);
  process.exit(0);
}

const customerName = args[nameIdx + 1];
const plan = args[planIdx + 1];
const daysValid = parseInt(args[daysIdx + 1], 10);

if (!customerName || !plan || isNaN(daysValid) || daysValid <= 0) {
  console.error('❌ بيانات غير صحيحة. تأكد من الاسم والخطة وعدد الأيام.');
  process.exit(1);
}

const result = generateLicenseKey(customerName, plan, daysValid);

console.log(`
╔══════════════════════════════════════════════════════════════╗
║         منصة المحامي الرقمية — ترخيص تجاري جديد           ║
╠══════════════════════════════════════════════════════════════╣
║ العميل    : ${result.payload.customer.padEnd(48)}║
║ الخطة     : ${result.planLabel.padEnd(48)}║
║ ينتهي في  : ${result.expiresDate.padEnd(48)}║
╠══════════════════════════════════════════════════════════════╣
║ معرّف الترخيص (للعرض فقط):                                  ║
║ ${result.licenseKey.padEnd(60)}║
╠══════════════════════════════════════════════════════════════╣
║ رمز التفعيل (أرسله للعميل عبر البريد):                      ║
╚══════════════════════════════════════════════════════════════╝

${result.activationToken}

`);

// Save to licenses log file
const logFile = path.join(__dirname, '..', 'licenses-log.json');
let log = [];
try { log = JSON.parse(fs.readFileSync(logFile, 'utf-8')); } catch (_) {}
log.push({
  ...result.payload,
  licenseKey: result.licenseKey,
  expiresDate: result.expiresDate,
  generatedAt: new Date().toISOString(),
});
fs.writeFileSync(logFile, JSON.stringify(log, null, 2), 'utf-8');
console.log(`✅ تم حفظ السجل في: ${logFile}`);

// Export verify function for use in electron main
module.exports = { generateLicenseKey, verifyLicenseToken };
