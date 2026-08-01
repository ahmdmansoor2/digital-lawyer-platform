/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * legalTemplates.ts — قوالب جاهزة للنصوص القانونية.
 *
 * يحتوي على:
 *  - قوالب مذكرات (استئناف، نقض، دفاع، دفع)
 *  - قوالب عقود (إيجار، بيع، عمل)
 *  - إدراج نصوص قانونية (مواد، سوابق)
 *
 * القوالب بصيغة HTML جاهزة للإدراج المباشر في TipTap.
 */

export interface LegalTemplate {
  id: string;
  category: 'memo' | 'contract' | 'header' | 'citation';
  label: string;
  description: string;
  html: string;
}

export const LEGAL_TEMPLATES: LegalTemplate[] = [
  // ─── Memo Headers ───
  {
    id: 'memo-header-civil',
    category: 'header',
    label: 'مذكرة مدني',
    description: 'عنوان مذكرة في دعوى مدنية',
    html: `<h1 style="text-align: center;">مذكرة دفاع</h1>
<h2 style="text-align: center;">في الدعوى رقم [رقم القضية] لسنة [السنة]</h2>
<h3 style="text-align: center;">المقامة من [الموكل] ضد [الخصم]</h3>
<hr/>
<h2>الوقائع:</h2>
<p>...</p>
<h2>الدفاع:</h2>
<p>...</p>
<h2>الطلبات:</h2>
<ol>
  <li>...</li>
</ol>`
  },
  {
    id: 'memo-header-criminal',
    category: 'header',
    label: 'مذكرة جنائي',
    description: 'عنوان مذكرة في دعوى جنائية',
    html: `<h1 style="text-align: center;">مذكرة دفاع</h1>
<h2 style="text-align: center;">في الجنحة / الجناية رقم [رقم] لسنة [السنة]</h2>
<h3 style="text-align: center;">المتهم: [الاسم]</h3>
<hr/>
<h2>موضوع التهمة:</h2>
<p>...</p>
<h2>الدفاع:</h2>
<p>...</p>`
  },

  // ─── Memo Bodies ───
  {
    id: 'memo-body-facts',
    category: 'memo',
    label: 'قسم الوقائع',
    description: 'قالب جاهز لكتابة وقائع الدعوى',
    html: `<h2>أولاً: الوقائع</h2>
<p>تتحصل وقائع الدعوى فيما يلي:</p>
<ol>
  <li>...</li>
  <li>...</li>
  <li>...</li>
</ol>
<p>وتأسيساً على ما تقدم، فإن الثابت من وقائع الدعوى...</p>`
  },
  {
    id: 'memo-body-defense',
    category: 'memo',
    label: 'قسم الدفاع',
    description: 'قالب لقسم الدفاع في المذكرة',
    html: `<h2>ثانياً: الدفاع</h2>
<h3>الدفع الأول: [عنوان الدفع]</h3>
<p>...</p>
<h3>الدفع الثاني: [عنوان الدفع]</h3>
<p>...</p>`
  },
  {
    id: 'memo-body-requests',
    category: 'memo',
    label: 'قسم الطلبات',
    description: 'قالب لقسم الطلبات الختامية',
    html: `<h2>ثالثاً: الطلبات</h2>
<p>بناءً على ما تقدم من أسباب ودفوع، يلتمس موكلي من عدالة المحكمة التكرم بالحكم:</p>
<ol>
  <li>بعدم قبول الدعوى شكلاً / أو رفضها موضوعاً.</li>
  <li>إلزام المدعي بالمصروفات ومقابل أتعاب المحاماة.</li>
  <li>احتياطياً: إحالة الدعوى للتحقيق أو لندب خبير.</li>
</ol>
<p>وتفضلوا بقبول فائق الاحترام والتقدير.</p>`
  },

  // ─── Citations ───
  {
    id: 'citation-court-ruling',
    category: 'citation',
    label: 'إدراج حكم قضائي',
    description: 'قالب لإدراج حكم محكمة',
    html: `<blockquote>
<strong>حكم محكمة [اسم المحكمة] - دائرة [رقم الدائرة]:</strong><br/>
في القضية رقم [رقم] لسنة [السنة]، قضت المحكمة بـ:<br/>
"..."
</blockquote>`
  },
  {
    id: 'citation-law-article',
    category: 'citation',
    label: 'إدراج مادة قانونية',
    description: 'قالب لإدراج مادة قانونية',
    html: `<blockquote>
<strong>المادة [رقم] من [اسم القانون] رقم [رقم] لسنة [السنة]:</strong><br/>
"..."
</blockquote>`
  },

  // ─── Contract Sections ───
  {
    id: 'contract-party',
    category: 'contract',
    label: 'تعريف أطراف العقد',
    description: 'قالب لتعريف أطراف العقد',
    html: `<h3>البند الأول: أطراف العقد</h3>
<p><strong>الطرف الأول (المؤجر):</strong> [الاسم الكامل]، [الجنسية]، يحمل بطاقة رقم [الرقم]، مقيم في [العنوان].</p>
<p><strong>الطرف الثاني (المستأجر):</strong> [الاسم الكامل]، [الجنسية]، يحمل بطاقة رقم [الرقم]، مقيم في [العنوان].</p>`
  },
  {
    id: 'contract-object',
    category: 'contract',
    label: 'موضوع العقد',
    description: 'قالب لبند موضوع العقد',
    html: `<h3>البند الثاني: موضوع العقد</h3>
<p>يؤجر الطرف الأول للطرف الثاني، ويقبل الأخير استئجار:</p>
<ul>
  <li>نوع العين: [سكني / تجاري / إداري]</li>
  <li>العنوان: [العنوان الكامل]</li>
  <li>المساحة: [م²]</li>
  <li>الوصف: [وصف تفصيلي]</li>
</ul>`
  },
  {
    id: 'contract-rent',
    category: 'contract',
    label: 'الأجرة والسداد',
    description: 'قالب لبند الأجرة وطريقة السداد',
    html: `<h3>البند الثالث: الأجرة وطريقة السداد</h3>
<p>تحدد الأجرة الشهرية بمبلغ وقدره <strong>[المبلغ] ج.م</strong> (فقط [المبلغ بالحروف] جنيه مصري)، تلتزم بدفعها في أول كل شهر.</p>
<p>يتم سداد الأجرة بواسطة: [نقداً / تحويل بنكي / شيك].</p>`
  },
  {
    id: 'contract-duration',
    category: 'contract',
    label: 'مدة العقد',
    description: 'قالب لبند مدة العقد',
    html: `<h3>البند الرابع: مدة العقد</h3>
<p>يبدأ هذا العقد من تاريخ [التاريخ] ولمدة [المدة] سنة/سنوات، وينتهي في [التاريخ]، ما لم يتم تجديده كتابياً.</p>`
  },

  // ─── Quick Inserts ───
  {
    id: 'quick-insert-divider',
    category: 'citation',
    label: 'فاصل زخرفي',
    description: 'فاصل بصري بين الأقسام',
    html: `<hr style="border: none; border-top: 3px double #1e293b; margin: 1.5em 0;"/>`
  },
  {
    id: 'quick-insert-attention',
    category: 'citation',
    label: 'تنبيه',
    description: 'قالب للتنبيه',
    html: `<blockquote style="background: #fef3c7; border-color: #f59e0b;">
<strong>⚠️ تنبيه:</strong> ...
</blockquote>`
  },
  {
    id: 'quick-insert-evidence',
    category: 'citation',
    label: 'دليل/مستند',
    description: 'قالب لإدراج دليل أو مستند',
    html: `<blockquote style="background: #dbeafe; border-color: #3b82f6;">
<strong>📎 المستند/الدليل:</strong> [وصف المستند] - مرفق مع المذكرة.
</blockquote>`
  }
];

// ─── Common Legal Phrases (Snippets) ───
export interface LegalSnippet {
  id: string;
  category: 'phrase' | 'citation';
  label: string;
  text: string;
}

export const LEGAL_SNIPPETS: LegalSnippet[] = [
  {
    id: 'phrase-witness',
    category: 'phrase',
    label: 'عبارة شهادة',
    text: 'وحيث الثابت من شهادة الشهود...'
  },
  {
    id: 'phrase-documents',
    category: 'phrase',
    label: 'عبارة مستندات',
    text: 'وتأييداً لدفاع موكلي، أحضرت المستندات الآتية...'
  },
  {
    id: 'phrase-jurisdiction',
    category: 'phrase',
    label: 'الاختصاص المكاني',
    text: 'وحيث أن المحكمة المختصة هي [اسم المحكمة] عملاً بنص المادة 28 من قانون المرافعات.'
  },
  {
    id: 'phrase-statute-limitations',
    category: 'phrase',
    label: 'انقضاء الدعوى بالتقادم',
    text: 'وحيث أن الدعوى الماثلة قد انقضت بمضي المدة المقررة قانوناً وفقاً للمادة 387 من القانون المدني.'
  },
  {
    id: 'citation-civil-code-1',
    category: 'citation',
    label: 'المادة 1 مدني',
    text: 'تسرى النصوص التشريعية على جميع المسائل التي تتناولها هذه النصوص في لفظها أو في فحواها.'
  },
  {
    id: 'citation-procedure-227',
    category: 'citation',
    label: 'المادة 227 مرافعات',
    text: 'ميعاد رفع الاستئناف أربعون يوماً ما لم ينص القانون على خلاف ذلك.'
  },
  {
    id: 'citation-procedure-406',
    category: 'citation',
    label: 'المادة 406 إجراءات جنائية',
    text: 'ميعاد الطعن بالنقض في الأحكام النهائية الصادرة من محاكم الجنايات أو الجنح المستأنفة ثلاثون يوماً.'
  }
];
