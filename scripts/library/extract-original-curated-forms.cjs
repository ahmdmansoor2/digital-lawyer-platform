'use strict';
/**
 * extract-original-curated-forms.cjs
 * يستخرج الـ 52 نموذجاً أصلياً المعتمدة بنصوصها الكاملة من نسخة git التاريخية
 * ويدمجها في بداية قائمة النماذج مع وضع علامة تميز ⭐
 */

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const BASE = 'd:\\قانوني 7';

console.log('📜 استخراج النماذج الأصلية المحفوظة مسبقاً...');

const oldHtml = cp.execSync('git show 43a78e4:public/legal-forms.html', { cwd: BASE, encoding: 'utf8' });

// استخراج كافة بطاقات النماذج (article أو doc أو snippet)
const cardRegex = /<article\s+class="doc[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
let match;
const curatedTemplates = [];

while ((match = cardRegex.exec(oldHtml)) !== null) {
  const cardHtml = match[1];
  
  // استخراج العنوان
  const titleMatch = cardHtml.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i) || cardHtml.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';
  
  // استخراج النص الكامل (data-plain أو داخل pre / code / div)
  const plainMatch = cardHtml.match(/data-plain="([\s\S]*?)"/i);
  let fullText = '';
  if (plainMatch) {
    fullText = plainMatch[1]
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .trim();
  } else {
    const preMatch = cardHtml.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
    if (preMatch) {
      fullText = preMatch[1].replace(/<[^>]+>/g, '').trim();
    }
  }

  // استخراج التصنيف
  const catMatch = cardHtml.match(/class="cat-badge"[^>]*>([\s\S]*?)<\/span>/i) || cardHtml.match(/class="badge"[^>]*>([\s\S]*?)<\/span>/i);
  const category = catMatch ? catMatch[1].replace(/<[^>]+>/g, '').trim() : 'نماذج وصيغ عامة';

  // استخراج الوصف أو البنود
  const descMatch = cardHtml.match(/<p class="desc"[^>]*>([\s\S]*?)<\/p>/i);
  const preview = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : fullText.substring(0, 150) + '...';

  if (title && (fullText || preview)) {
    curatedTemplates.push({
      id: 'curated-' + (curatedTemplates.length + 1),
      title: title,
      category: category,
      icon: '⭐',
      isCurated: true,
      wordCount: fullText ? fullText.split(/\s+/).length : 250,
      preview: preview || (fullText ? fullText.substring(0, 140) + '...' : ''),
      fullText: fullText || preview
    });
  }
}

console.log(`✅ تم استخراج ${curatedTemplates.length} نموذجاً أصلياً ومعتمداً بنجاح!`);

// حفظ النماذج المستخرجة
const outPath = path.join(BASE, 'public', 'data', 'curated-master-forms.json');
fs.writeFileSync(outPath, JSON.stringify(curatedTemplates, null, 2), 'utf8');
console.log(`💾 تم حفظ النماذج في: ${outPath}`);
