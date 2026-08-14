/**
 * unified-header.cjs — الشريط العلوي الموحّد لمنصة المحامي الرقمية
 * مُعطَّل بناءً على طلب المستخدم: لم يعد يُولِّد الشريط العلوي.
 * يُستورد من مولدات الصفحات (radar / pillar / legal-forms / sitemap / blog)
 * لكن headerMarkup() يُعيد سلسلة فارغة — لا header في أي صفحة.
 * (القرار في 2026-08-14 بحذف الشريط العلوي من كل صفحات الموقع.)
 */

/**
 * activeKey: مدخل تاريخي — لا يُستخدم بعد الآن، لكن نُبقيه لتوافق التواقيع.
 * @returns {string} سلسلة فارغة دائماً
 */
function headerMarkup(activeKey) {
  return '';
}

const HEADER_CSS = '';

module.exports = { headerMarkup, HEADER_CSS };
