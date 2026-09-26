/**
 * news-daemon.cjs - الحارس والمجدول الآلي المستمر لبوابة «صوت مصر 24»
 * ينفذ دورات نشر إخبارية منتظمة على مدار الساعة دون توقف
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { runNewsCycle } = require('./news-engine.cjs');

const INTERVAL_MINUTES = 60; // كل ساعة
const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000;
const ARTICLES_PER_CYCLE = 1; // مقال واحد جديد في كل ساعة (نشر آمن دون قيود سبام)

async function runScheduled() {
  const timeStr = new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' });
  console.log(`\n======================================================`);
  console.log(`⏰ [صوت مصر 24] انطلاق الوردية الإخبارية التلقائية: ${timeStr}`);
  console.log(`======================================================`);
  
  try {
    await runNewsCycle(ARTICLES_PER_CYCLE);
    console.log(`✅ اكتملت الوردية بنجاح. الموعد القادم بعد ${INTERVAL_MINUTES} دقيقة.`);
  } catch (err) {
    console.error(`❌ تعثرت الوردية الإخبارية:`, err.message);
  }
}

async function startDaemon() {
  console.log(`🚀 تم تفعيل محرك النشر الذاتي المستمر 24/7 لبوابة «صوت مصر 24»`);
  console.log(`📌 المعدل: ${ARTICLES_PER_CYCLE} مقالات جديدة كل ${INTERVAL_MINUTES / 60} ساعات.`);
  
  // جدولة متكررة كل 3 ساعات
  setInterval(runScheduled, INTERVAL_MS);
}

if (require.main === module) {
  startDaemon();
}

module.exports = { startDaemon };
