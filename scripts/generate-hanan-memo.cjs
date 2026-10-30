const docx = require('docx');
const fs = require('fs');
const path = require('path');

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, Header, Footer, PageNumber,
  VerticalAlign, PageBorderOffsetFrom
} = docx;

function toArabicDigits(str) {
  if (typeof str !== 'string') str = String(str);
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/[0-9]/g, w => arabicDigits[+w]);
}

const FONT_NAME = 'Times New Roman';

function createTitleP(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    bidirectional: true,
    spacing: {
      before: opts.spacingBefore !== undefined ? opts.spacingBefore : 140,
      after: opts.spacingAfter !== undefined ? opts.spacingAfter : 140,
      line: 300,
    },
    children: [
      new TextRun({
        text: toArabicDigits(text),
        font: FONT_NAME,
        size: opts.size || 38, // 19pt
        bold: true,
        underline: opts.underline ? {} : undefined,
      }),
    ],
  });
}

function createHeadingP(text, opts = {}) {
  return new Paragraph({
    alignment: opts.alignment || AlignmentType.RIGHT,
    bidirectional: true,
    spacing: {
      before: opts.spacingBefore !== undefined ? opts.spacingBefore : 160,
      after: opts.spacingAfter !== undefined ? opts.spacingAfter : 80,
      line: 300,
    },
    children: [
      new TextRun({
        text: toArabicDigits(text),
        font: FONT_NAME,
        size: opts.size || 34, // 17pt
        bold: true,
        underline: opts.underline ? {} : undefined,
      }),
    ],
  });
}

function createSubHeadingP(text, opts = {}) {
  return new Paragraph({
    alignment: opts.alignment || AlignmentType.RIGHT,
    bidirectional: true,
    spacing: {
      before: opts.spacingBefore !== undefined ? opts.spacingBefore : 120,
      after: opts.spacingAfter !== undefined ? opts.spacingAfter : 60,
      line: 280,
    },
    children: [
      new TextRun({
        text: toArabicDigits(text),
        font: FONT_NAME,
        size: opts.size || 32, // 16pt
        bold: true,
      }),
    ],
  });
}

function createBodyP(runs, opts = {}) {
  let textRuns = [];
  if (typeof runs === 'string') {
    textRuns = [
      new TextRun({
        text: toArabicDigits(runs),
        font: FONT_NAME,
        size: opts.size || 32, // 16pt
        bold: opts.bold || false,
      }),
    ];
  } else if (Array.isArray(runs)) {
    textRuns = runs.map(r => {
      if (typeof r === 'string') {
        return new TextRun({
          text: toArabicDigits(r),
          font: FONT_NAME,
          size: opts.size || 32, // 16pt
          bold: opts.bold || false,
        });
      }
      return new TextRun({
        text: toArabicDigits(r.text),
        font: FONT_NAME,
        size: r.size || opts.size || 32, // 16pt
        bold: r.bold !== undefined ? r.bold : (opts.bold || false),
        underline: r.underline ? {} : undefined,
      });
    });
  }

  return new Paragraph({
    alignment: opts.alignment || AlignmentType.JUSTIFIED,
    bidirectional: true,
    spacing: {
      before: opts.spacingBefore !== undefined ? opts.spacingBefore : 80,
      after: opts.spacingAfter !== undefined ? opts.spacingAfter : 80,
      line: 320, // 1.2 spacing
    },
    children: textRuns,
  });
}

// Assemble Court Memo Children
const memoChildren = [
  createTitleP('بسم الله الرحمن الرحيم', { size: 36 }),
  createTitleP('المحكمة التأديبية لمحافظتي الإسكندرية ومرسى مطروح', { size: 38 }),
  new Paragraph({ spacing: { before: 80, after: 80 } }),

  createTitleP('مـذكـــــرة بـدفـــــاع وطـلـبـــــات', { size: 42, underline: true }),

  createBodyP([
    { text: 'مُـقـدمـــة مـن: ', bold: true },
    { text: 'السيدة / ', bold: false },
    { text: 'حـنـــان خـمـيـــس فـــرج عــــلام', bold: true },
    { text: ' — رئيس قسم الميزانية بإدارة الشئون المالية بمديرية الزراعة بالإسكندرية (الدرجة الأولى التخصصية — تمويل ومحاسبة) ', bold: false },
    { text: '[ مـحـالــــة رابـعـــــة ] .', bold: true },
  ]),

  createBodyP([
    { text: 'بـوكـالـــة الأستــاذ: ', bold: true },
    { text: 'أحـمـــــد مـنـصـــــور', bold: true },
    { text: ' — المحامي بالنقض والدستورية العليا (حاضر مع المحالة الرابعة بتوكيل رسمي عام قضايا).', bold: false },
  ]),

  createBodyP([
    { text: 'ضـــــــــــــــــــــد: ', bold: true },
    { text: 'هـيـئـــــة الـنـيـابـــــة الإداريـــــة', bold: true },
    { text: ' (فرع الدعوى التأديبية بالإسكندرية — سلطة الاتهام).', bold: false },
  ]),

  createBodyP([
    { text: 'فـي الـدعـوى التأديبيـة: ', bold: true },
    { text: 'المقيدة بجدول المحكمة التأديبية بالإسكندرية عن القضية رقم ', bold: false },
    { text: '٣٠٧ لسنة ٢٠٢٥', bold: true },
    { text: ' نيابة القوى العاملة بالإسكندرية (والمقيدة برقم فحص ', bold: false },
    { text: '٢٢ لسنة ٢٠٢٦', bold: true },
    { text: ' لجنة التأديب السادسة بالمكتب الفني بالإسكندرية).', bold: false },
  ]),

  new Paragraph({ spacing: { before: 100, after: 100 } }),

  createTitleP('« الـوقـائـــــع »', { size: 36, underline: true }),
  createBodyP(
    'تتحصل وقائع الدعوى الماثلة — في خصوص ما نُسب إلى المحالة الرابعة السيدة / حنان خميس فرج علام — في أن النيابة الإدارية أسندت إليها بتقرير الاتهام ومذكرة التصرف اتهاماً وحيداً نصه الحرفي:'
  ),
  createBodyP([
    { text: '«الرابعة: اعتمدت المذكرة المؤرخة ٢٠ / ٨ / ٢٠٢٥ والخاصة بشراء قطع غيار وإصلاح التكييف ٣ حصان بإدارة الشئون المالية والإدارية دون تحديد طريقة الشراء المقترحة وذلك على النحو المبين تفصيلاً بالأوراق بالمخالفة لنص المادة (١٧) من القانون ١٨٢ لسنة ٢٠١٨ والمادة (٣٢) من لائحته التنفيذية».', bold: true }
  ]),
  createBodyP(
    'وحيث إن الأوراق والتحقيقات القضائية كشفت بجلاء عن براءة المحالة الرابعة براءةً تامة من هذا الاتهام المسند إليها، وعدم انطباق وصف الجريمة التأديبية عليها شكلاً وموضوعاً، وذلك تأسيساً على الدفوع القانونية الآتية:'
  ),

  new Paragraph({ spacing: { before: 120, after: 80 } }),

  createTitleP('« الـدفـــــــوع الـقـانـونـيـــــة »', { size: 36, underline: true }),

  // Section 1: Procedural Defenses
  createHeadingP('أولاً / الـدفــــوع الشـكـلـيــــة والإجـرائـيــــة :', { underline: true }),

  createSubHeadingP('١. الدفع بعدم جواز محاكمة المحالة تأديبياً وبطلان قرار الإحالة لانعدام أي ضرر مالي للدولة (طبقاً لنص المادة ٦١ من قانون الخدمة المدنية ٨١ لسنة ٢٠١٦) :'),
  createBodyP([
    { text: 'تنص المادة (٦١) من قانون الخدمة المدنية رقم ٨١ لسنة ٢٠١٦ على أنه: «لا يجوز توقيع أي جزاء على الموظف إلا بعد التحقيق معه كتابةً... ولا يجوز إحالة الموظف إلى المحاكمة التأديبية إلا بعد إحاطته بالتهم المنسوبة إليه... ومراعاة ألا يُساءل الموظف عن المخالفات المالية إلا إذا ترتب عليها ضياع حق مالي للدولة أو المساس به».', bold: false }
  ]),
  createBodyP([
    { text: 'وحيث إنه من المستقر عليه في قضاء المحكمة الإدارية العليا أن: «المخالفة المالية قوامها المساس بمال للدولة أو تعريضه للضياع، فإذا انعدم الأثر المالي ولم يترتب على الإجراء أي صرف أو التزام مالي بذمة الجهة الإدارية انتفت الجريمة المالية بمقوماتها القانونية».', bold: false }
  ]),
  createBodyP([
    { text: 'والثابت يقيناً بأوراق القضية — وبشهادة المفتش المالي بالمديرية المالية بالإسكندرية (الأستاذ / أحمد سلامة عبد الرحمن عطية) بالتحقيقات ص ٤٠ وص ٦٢ — ناصاً صراحةً رداً على سؤال النيابة عن الأضرار المالية: ', bold: false },
    { text: '«لم يترتب أي ضرر مالي على تلك الواقعة وذلك لتوقف كافة الإجراءات المستندية للصيانة وعدم صرف مليم واحد من أموال الدولة»', bold: true },
    { text: '؛ ومن ثم فإن الإجراء محل المذكرة المؤرخة ٢٠ / ٨ / ٢٠٢٥ لم ينتج عنه أي التزام مالي، ولم يُحرر بشأنه أمر دفع أو إذن صرف، بل أُوقف المسار المستندي في مهده برفض الصرف، مما يترتب عليه بطلان المحاكمة التأديبية لانعدام المحل والنتيجة المالية الضارة.' }
  ]),

  createSubHeadingP('٢. الدفع ببطلان وصف الاتهام لانتفاء الصفة الوظيفية (انعدام سند القيام بعمل مدير الشئون المالية) :'),
  createBodyP([
    { text: 'وجهت النيابة الإدارية الاتهام للمحالة الرابعة بوصفها «القائم بأعمال مدير إدارة الشئون المالية والإدارية بمديرية الزراعة بالإسكندرية وقت توقيع المذكرة في ٢٠ / ٨ / ٢٠٢٥»؛ في حين أن الثابت من بطاقة الوصف الوظيفي وبيان الحالة الوظيفية للمحالة الرابعة أن وظيفتها الرسمية هي: ', bold: false },
    { text: '«رئيس قسم الميزانية بإدارة الشئون المالية»', bold: true },
    { text: ' فقط، ولم يصدر قط أي قرار إداري من السلطة المختصة (السيد وكيل وزارة الزراعة مدير المديرية) بندبها أو تكليفها رسمياً بالقيام بأعمال مدير الإدارة العامة للشئون المالية والإدارية.' }
  ]),
  createBodyP(
    'وحيث إن قضاء المحكمة الإدارية العليا تواتر على أن: «المسئولية التأديبية الإشرافية مناطها صدور قرار تكليف رسمي صحيح من السلطة المختصة يحدد الواجبات والاختصاصات الرقابية، ولا تقوم المسئولية الإشرافية للأصيل على عاتق الموظف لمجرد التوقيع الروتيني العارض لتسيير العمل اليومي دون ندب رسمي». (الطعن رقم ٤١٨٢ لسنة ٤٤ ق.عليا — جلسة ٢٠٠٠/١/٢٩).'
  ),

  new Paragraph({ spacing: { before: 100, after: 60 } }),

  // Section 2: Substantive Defenses
  createHeadingP('ثانياً / الـدفــــوع المـوضـوعـيــــة الـقـاطـعـــــة بالـبـــــراءة :', { underline: true }),

  createSubHeadingP('١. انعدام الركن المادي للمخالفة التأديبية ومخالفة الثابت بالأوراق ؛ لكون المذكرة المؤرخة ٢٠ / ٨ / ٢٠٢٥ مجرد «طلب احتياج داخلي تمهيدي» وليست قرار طرح أو تعاقد نهائي :'),
  createBodyP([
    { text: 'استند قرار الاتهام إلى مخالفة المادة (١٧) من قانون التعاقدات الحكومية رقم ١٨٢ لسنة ٢٠١٨ والمادة (٣٢) من لائحته التنفيذية، اللتين توجبان تحديد طريقة التعاقد ومبرراتها. ', bold: false },
    { text: 'وهذا استناد في غير محله ومخالف لصحيح القانون؛ ', bold: true },
    { text: 'إذ إن المادة (١٧) والمادة (٣٢) تخاطبان مرحلة إعداد كراسة الشروط ومذكرة الطرح النهائي المعروضة على «السلطة المختصة» لإصدار قرار الطرح؛ بينما المذكرة المؤرخة ٢٠ / ٨ / ٢٠٢٥ — موضوع الشكوى — هي مجرد «مذكرة عرض داخلية تمهيدية لبيان الاحتياج»، ولم تكن قراراً بالتعاقد ولا أمر إسناد، ولم تتضمن التعاقد مع أي شركة، بل كانت استطلاعاً للرأي الفني والمالي تمهيداً للعرض على السلطة المختصة (مدير المديرية) التي تملك وحدها قانوناً تحديد طريقة التعاقد وسلطة البت فيه.' }
  ]),
  createBodyP(
    'وحيث إن المذكرة لم تخرج من حيز العرض الداخلي التمهيدي ولم تعتمدها السلطة المختصة، فإن تجريم التوقيع عليها بدعوى عدم استيفاء شروط الطرح النهائي يُعد معاقبة على إجراء تمهيدي لم يكتمل ولم ينتج أثراً قانونياً في دنيا الواقع.'
  ),

  createSubHeadingP('٢. انتفاء القصد التأديبي والخطأ الإداري في حق المحالة الرابعة ؛ لثبوت أن التوقيع تم على «نموذج حاسوبي موحد ومعتمد بالمديرية» جرى العمل به منذ سنوات :'),
  createBodyP([
    { text: 'ثبت من استجواب المحالة الرابعة (ص ٢٦) واعتراف المتهم الثالث محرر المذكرة (محمد بدير ص ٢٤) أن المذكرة كُتبت وطُبعت استناداً إلى ', bold: false },
    { text: '«نموذج إداري نمطي مخزون على أجهزة الحاسب الآلي بالمديرية»', bold: true },
    { text: '، وهو النموذج ذاته الذي كانت إدارة الشئون المالية تستخدمه في كافة مذكرات العرض التمهيدية الروتينية لطلب صيانة الأجهزة وإصلاحها. وتوقيع المحالة الرابعة لم يكن إلا تأشيرة روتينية مجردة مفادها إحالة النموذج للمستوى الأعلى دون أن يتضمن أي إقرار بالتعاقد أو الصرف؛ مما يقطع بانتفاء أي قصد تأديبي أو تعمد لمخالفة القانون، والمقرر قضاءً أن: «حسن النية والاتباع المعتاد للنماذج الإدارية المستقرة بالجهة دون قصد الانحراف ينفي السلوك الإجرامي المنسوب للموظف العام».' }
  ]),

  createSubHeadingP('٣. انتفاء الاختصاص الوظيفي للمحالة الرابعة عن فحص ملكية أو قيد أجهزة التكييف بسجلات المخازن :'),
  createBodyP([
    { text: 'إن النزاع الذي فجرته الشاكية نادية حسين يتمحور حول كون التكييف الـ ٣ حصان الموجود بمكتب حسام الدين هاشم غير مقيد بسجلات المخازن الحكومية. ', bold: false },
    { text: 'وهنا يثور التساؤل القانوني الحاسم: هل يدخل التحقق من قيد الأجهزة في سجلات المخازن ضمن واجبات رئيس قسم الميزانية؟', bold: true }
  ]),
  createBodyP([
    { text: 'الإجابة القاطعة بنصوص القانون وبطاقات الوصف هي: ', bold: false },
    { text: '«كلا على الإطلاق»', bold: true },
    { text: '؛ فرئيس قسم الميزانية اختصاصه وظيفياً وقانونياً محكوم بأحكام قانون المحاسبة الحكومية رقم ١٢٧ لسنة ١٩٨١ ولائحته التنفيذية، وينحصر حصراً في: فحص الاعتمادات المالية المتاحة بالموازنة، والتأكد من وجود بند مالي يسمح بالصرف، وإمساك سجلات الارتباطات. أما قيد الأجهزة والموجودات بسجلات المخازن (نموذج ٥ و٦ مخازن حكومية)، وإثبات العهدة، والمطابقة المكانية، فهو اختصاص حصري مقصور على: (أمين العهدة، ورئيس قسم المخازن، ولجنة الجرد السنوي المشكلة بالمديرية).' }
  ]),
  createBodyP(
    'ولا يملك رئيس قسم الميزانية — من الناحية القانونية والواقعية — التفتيش المادي على الأجهزة أو مراجعة دفاتر المخازن؛ ومن ثم فإن مساءلة المحالة الرابعة عن عدم إدراج التكييف بالمخازن هو إسناد لالتزام وظيفي يخرج تماماً عن ولايتها واختصاصها.'
  ),

  createSubHeadingP('٤. انتفاء أي علاقة للمحالة الرابعة بنشر العملية على بوابة التعاقدات العامة الإلكترونية أو الحصول على العروض المالية :'),
  createBodyP([
    { text: 'أكدت تحقيقات النيابة الإدارية وشهادة المفتش المالي (أحمد سلامة ص ٦٠ إلى ٦٢) أن الحساب المخصص للمديرية على بوابة التعاقدات العامة متاح على المشاع بين العاملين بقسم المشتريات، ولم يثبت في الأوراق ولا في تقارير الفحص الفني أن المحالة الرابعة (حنان خميس) قد قامت برفع أي مستند أو ورقة تخص التكييف على البوابة الإلكترونية، ولا صلة لها إطلاقاً بجلب أو طلب عروض الأسعار، بل انحصر عملها في التوقيع على مسودة العرض النمطية فقط.' }
  ]),

  new Paragraph({ spacing: { before: 100, after: 60 } }),

  // Section 3: Summary & Conclusion
  createHeadingP('ثالثاً / الـطـلـبـــــــات الـخـتـامـيـــــة :', { underline: true }),
  createBodyP(
    'بناءً على ما تقدم من وقائع وأسانيد قانونية وفنية قاطعة، واستناداً إلى انعدام الضرر المالي انعداماً تاماً وثبوت براءة المحالة الرابعة وحسن نيتها التام وعدم اختصاصها بأعمال القيد المخزني؛ تلتمس المحالة الرابعة من عدالة المحكمة الموقرة الحكم:'
  ),
  createBodyP([
    { text: 'أولاً (وبصفة أصلية جازمة): ', bold: true },
    { text: 'بـبــــراءة السـيـدة / حـنـــان خـمـيـــس فـــرج عــــلام (المحالة الرابعة) من الاتهام المنسوب إليها بتقرير الاتهام ورفض الدعوى التأديبية قبلها.', bold: true }
  ]),
  createBodyP([
    { text: 'ثانياً (واحتياطياً): ', bold: true },
    { text: 'استعمال الرأفة القضائية البالغة والاكتفاء بالتوجيه الإداري لانعدام أي ضرر مالي وحسن نية المحالة التام ومراعاتها للقواعد النمطية المعمول بها بالجهة الإدارية، طبقاً للمادة (٦١) من قانون الخدمة المدنية رقم ٨١ لسنة ٢٠١٦.', bold: false }
  ]),

  new Paragraph({ spacing: { before: 80, after: 80 } }),

  createBodyP('وتفضلوا عدالة المحكمة التأديبية الموقرة بقبول فائق التقدير والاحترام والإجلال ،،،', { bold: true, alignment: AlignmentType.CENTER }),

  new Paragraph({ spacing: { before: 120, after: 80 } }),

  // Official Signature Block
  new Paragraph({
    alignment: AlignmentType.LEFT,
    bidirectional: true,
    spacing: { before: 40, after: 30 },
    children: [
      new TextRun({ text: 'وكـيـــــل المـحـالـــــة الرابعـــــة ،،،', font: FONT_NAME, size: 30, bold: true }),
    ]
  }),
  new Paragraph({
    alignment: AlignmentType.LEFT,
    bidirectional: true,
    spacing: { before: 20, after: 30 },
    children: [
      new TextRun({ text: 'الأستـــــاذ / أحـمـــــد مـنـصـــــور', font: FONT_NAME, size: 32, bold: true }),
    ]
  }),
  new Paragraph({
    alignment: AlignmentType.LEFT,
    bidirectional: true,
    spacing: { before: 20, after: 30 },
    children: [
      new TextRun({ text: 'المحامي بالنقض والدستورية العليا', font: FONT_NAME, size: 28 }),
    ]
  }),
  new Paragraph({
    alignment: AlignmentType.LEFT,
    bidirectional: true,
    spacing: { before: 30, after: 20 },
    children: [
      new TextRun({ text: '................................................', font: FONT_NAME, size: 28 }),
    ]
  }),
];

const pageProperties = {
  page: {
    margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }, // 2.54 cm
    borders: {
      pageBorders: {
        top: { style: BorderStyle.SINGLE, size: 8, space: 18, color: '000000' },
        bottom: { style: BorderStyle.SINGLE, size: 8, space: 18, color: '000000' },
        left: { style: BorderStyle.SINGLE, size: 8, space: 18, color: '000000' },
        right: { style: BorderStyle.SINGLE, size: 8, space: 18, color: '000000' },
        offsetFrom: PageBorderOffsetFrom.PAGE,
      },
    },
  },
  footers: {
    default: new Footer({
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          bidirectional: true,
          children: [
            new TextRun({ text: 'صفحة ', font: FONT_NAME, size: 20 }),
            new TextRun({ children: [PageNumber.CURRENT], font: FONT_NAME, size: 20 }),
            new TextRun({ text: ' من ', font: FONT_NAME, size: 20 }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT_NAME, size: 20 }),
            new TextRun({ text: '  —  مذكرة دفاع السيدة / حنان خميس فرج علام — القضية رقم ٣٠٧ لسنة ٢٠٢٥ تأديبية الإسكندرية', font: FONT_NAME, size: 20, bold: true }),
          ],
        }),
      ],
    }),
  },
};

const doc = new Document({
  sections: [
    {
      properties: pageProperties,
      children: memoChildren,
    },
  ],
});

// Paths to save
const desktopTarget = 'C:/Users/احمد منصور/Desktop/مذكرة_دفاع_حنان_خميس_القضية_٣٠٧_لسنة_٢٠٢٥_تأديبية.docx';
const repoDir = path.join(__dirname, '../الصياغات_القانونية_الخاصة/03_مذكرات_الدفاع_والدفوع');
const repoTarget = path.join(repoDir, 'مذكرة_دفاع_حنان_خميس_القضية_٣٠٧_لسنة_٢٠٢٥_تأديبية.docx');
const dTarget = 'D:/المذكرات القانونية/مذكرة_دفاع_حنان_خميس_القضية_٣٠٧_لسنة_٢٠٢٥_تأديبية.docx';

if (!fs.existsSync(repoDir)) {
  fs.mkdirSync(repoDir, { recursive: true });
}

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(desktopTarget, buffer);
  console.log(`Saved successfully to Desktop: ${desktopTarget}`);

  try {
    fs.writeFileSync(repoTarget, buffer);
    console.log(`Saved successfully to repo: ${repoTarget}`);
  } catch (e) {
    console.error(`Repo save failed: ${e.message}`);
  }

  try {
    fs.writeFileSync(dTarget, buffer);
    console.log(`Saved successfully to D: ${dTarget}`);
  } catch (e) {
    console.error(`D drive save failed: ${e.message}`);
  }
}).catch(err => {
  console.error('Error generating document:', err);
});
