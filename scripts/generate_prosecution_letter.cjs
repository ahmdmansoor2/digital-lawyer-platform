const docx = require('docx');
const fs = require('fs');
const path = require('path');

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, Header, Footer, PageNumber,
  ImageRun, VerticalAlign, PageBorderOffsetFrom
} = docx;

// Helper to convert English digits to Arabic/Hindi digits
function toArabicDigits(str) {
  if (typeof str !== 'string') str = String(str);
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/[0-9]/g, w => arabicDigits[+w]);
}

const FONT_NAME = 'Times New Roman';
const LOGO_PATH = path.join(__dirname, 'image3.png');
let logoBuffer = null;
if (fs.existsSync(LOGO_PATH)) {
  logoBuffer = fs.readFileSync(LOGO_PATH);
}

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
      line: 320, // 1.2 line spacing
    },
    children: textRuns,
  });
}

// Build Directorate Header Table
function buildDirectorateHeader() {
  const rightCellChildren = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      spacing: { before: 0, after: 30, line: 240 },
      children: [
        new TextRun({ text: 'جمهورية مصر العربية', font: FONT_NAME, size: 24, bold: true }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      spacing: { before: 0, after: 30, line: 240 },
      children: [
        new TextRun({ text: 'وزارة الزراعة واستصلاح الأراضي', font: FONT_NAME, size: 24, bold: true }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      spacing: { before: 0, after: 30, line: 240 },
      children: [
        new TextRun({ text: 'مديرية الزراعة بالإسكندرية', font: FONT_NAME, size: 26, bold: true }),
      ],
    }),
  ];

  const centerCellChildren = [];
  if (logoBuffer) {
    centerCellChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [
          new ImageRun({
            data: logoBuffer,
            transformation: { width: 75, height: 75 },
          }),
        ],
      })
    );
  } else {
    centerCellChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        bidirectional: true,
        children: [new TextRun({ text: '', font: FONT_NAME, size: 20 })],
      })
    );
  }

  const leftCellChildren = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      bidirectional: true,
      spacing: { before: 0, after: 30, line: 240 },
      children: [
        new TextRun({ text: 'الإدارة العامة للشئون القانونية', font: FONT_NAME, size: 24, bold: true }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      bidirectional: true,
      spacing: { before: 0, after: 30, line: 240 },
      children: [
        new TextRun({ text: 'إدارة التحقيقات وفض المنازعات', font: FONT_NAME, size: 22, bold: true }),
      ],
    }),
  ];

  return new Table({
    width: { size: 10000, type: WidthType.DXA },
    alignment: AlignmentType.CENTER,
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 3600, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            children: rightCellChildren,
          }),
          new TableCell({
            width: { size: 2800, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            children: centerCellChildren,
          }),
          new TableCell({
            width: { size: 3600, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            children: leftCellChildren,
          }),
        ],
      }),
    ],
  });
}

// Build Signatures Table
function buildOfficialSignaturesTable() {
  return new Table({
    width: { size: 10000, type: WidthType.DXA },
    alignment: AlignmentType.CENTER,
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 5000, type: WidthType.DXA },
            verticalAlign: VerticalAlign.TOP,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                spacing: { before: 40, after: 40 },
                children: [
                  new TextRun({ text: 'يعتمــــد ،،،', font: FONT_NAME, size: 30, bold: true }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                spacing: { before: 20, after: 20 },
                children: [
                  new TextRun({ text: 'وكيل وزارة الزراعة بالإسكندرية', font: FONT_NAME, size: 28, bold: true }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                spacing: { before: 20, after: 40 },
                children: [
                  new TextRun({ text: '( مدير المديرية )', font: FONT_NAME, size: 26 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                spacing: { before: 40, after: 40 },
                children: [
                  new TextRun({ text: '................................................', font: FONT_NAME, size: 28 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                spacing: { before: 20, after: 20 },
                children: [
                  new TextRun({ text: '( خاتم شعار الجمهورية )', font: FONT_NAME, size: 26, bold: true }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 5000, type: WidthType.DXA },
            verticalAlign: VerticalAlign.TOP,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                spacing: { before: 40, after: 40 },
                children: [
                  new TextRun({ text: 'مُعِــد الرد ومراجعه قانوناً ،،،', font: FONT_NAME, size: 30, bold: true }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                spacing: { before: 20, after: 20 },
                children: [
                  new TextRun({ text: 'مدير الإدارة العامة للشئون القانونية', font: FONT_NAME, size: 28, bold: true }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                spacing: { before: 20, after: 40 },
                children: [
                  new TextRun({ text: 'المستشار / أحمد منصور', font: FONT_NAME, size: 28, bold: true }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                spacing: { before: 40, after: 40 },
                children: [
                  new TextRun({ text: '................................................', font: FONT_NAME, size: 28 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                spacing: { before: 20, after: 20 },
                children: [
                  new TextRun({ text: 'تحريراً في: ٢٥ / ١٠ / ٢٠٢٦ م', font: FONT_NAME, size: 26, bold: true }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// Assemble Pure, 100% Honest Legal Text
const letterChildren = [
  buildDirectorateHeader(),

  new Paragraph({ spacing: { before: 100, after: 60 } }),

  // Addressee
  createHeadingP('السيد الأستاذ المستشار / رئيس نيابة برج العرب الجزئية المحترم', { size: 36, alignment: AlignmentType.RIGHT, bold: true }),
  createHeadingP('رئيس النيابة الكلية والمشرف على أعمال النيابة الموقرة ،،،', { size: 32, alignment: AlignmentType.RIGHT, bold: true }),

  new Paragraph({ spacing: { before: 40, after: 40 } }),

  createBodyP('تحية إجلال وإعزاز لشخصكم الكريم ولهيئة النيابة العامة الموقرة — سدنة العدالة وحصن المشروعية وسيادة القانون — وبعد،،،', { bold: true }),

  new Paragraph({ spacing: { before: 60, after: 60 } }),

  // Opening Procedural Note
  createHeadingP('تنويه إجرائي تمهيدي واجب بشأن رقم القضية محل التحقيق :', { underline: true }),
  createBodyP(
    'بالإشارة إلى كتاب سيادتكم الكريم الصادر من نيابة برج العرب الجزئية بجلسة اليوم الأحد الموافق ٢٥ / ١٠ / ٢٠٢٦ م، والوارد إلى مديرية الزراعة بالإسكندرية بذات التاريخ، والمتضمن قرار النيابة العامة الموقرة الآتي نصه: «موافاتنا بصورة رسمية من التعليمات الصادرة بشأن تسليم قرارات المعاينة، والتي تفيد تسليم قرارات المعاينة إلى مديرية الزراعة بالإسكندرية بدلاً من تسليمها إلى الإدارة الزراعية ببرج العرب القديم (أو خبير الهيئة)».',
    { bold: false }
  ),
  createBodyP([
    { text: 'بدايةً؛ يشرف مديرية الزراعة بالإسكندرية أن تنوه بعناية سيادتكم الكريمة إلى أنه قد تلاحظ لدينا خلو كتاب النيابة العامة الموقرة الرقيم أعلاه من تدوين رقم القضية وسنتها محل التحقيقات، حيث وردت الخانات المخصصة لذلك بالخطاب الرسمي شاغرة دون ترقيم. وإذ تبادر المديرية – انطلاقاً من التزامها الراسخ بالامتثال الكامل والفوري لكافة قرارات النيابة العامة القضائية وتيسيراً لمهام العدالة الناجزة – بتقديم هذا البيان القانوني والفني والتأصيلي الشامل لكافة القواعد والضوابط الحاكمة لمنظومة المعاينات ومسار تسليمها؛ فإننا نلتمس من مقام سيادتكم الكريم التفضل بالتكرم بموافاتنا برقم القضية وسنتها المقيدة بها تلك التحقيقات، حتى يتسنى للمديرية قيد هذا الرد الرسمي بالسجلات الدفترية والإلكترونية الرسمية، وربطها برقم القضية بملفات إدارة حماية الأراضي والشئون القانونية وفقاً للتعليمات الإدارية المعمول بها في هذا الشأن.', bold: true },
  ]),

  new Paragraph({ spacing: { before: 80, after: 60 } }),

  // Section 1: Administrative Law & Superior Authority
  createHeadingP('أولاً: التأصيل القانوني للولاية الإدارية والسلطة الرئاسية لمدير المديرية :', { underline: true }),
  createBodyP(
    'تنفيذاً للقرار القضائي الصادر من سيادتكم، نتشرف بعرض الأساس القانوني الحاكم لاختصاص مديرية الزراعة بالإسكندرية وطبيعة تبعية الإدارات الزراعية بالمراكز التابعة لها وفقاً لأحكام القانون وقواعد التنظيم الإداري:'
  ),
  createBodyP([
    { text: '١. قانون نظام الإدارة المحلية رقم ٤٣ لسنة ١٩٧٩ ولائحته التنفيذية وقانون الخدمة المدنية رقم ٨١ لسنة ٢٠١٦:', bold: true },
    { text: ' يقرر القانون أن مديرية الزراعة بالمحافظة هي الوحدة الإدارية والفنية الإشرافية العليا لكافة الشئون الزراعية وحماية الأراضي على مستوى المحافظة، وأن السيد وكيل وزارة الزراعة (مدير المديرية) هو وحده صاحب السلطة الرئاسية المباشرة والرئيس التنفيذي الأعلى للجهة الإدارية بالمحافظة وممثلها القانوني أمام كافة الهيئات القضائية والجهات الرسمية، وتخضع لسلطته وتوجيهه وإشرافه المباشر كافة الأجهزة واللجان الفنية التابعة.' }
  ]),
  createBodyP([
    { text: '٢. الطبيعة القانونية والتبعية التنفيذية للإدارات الزراعية بالمراكز:', bold: true },
    { text: ' إن الإدارة الزراعية ببرج العرب (أو برج العرب القديم) وسائر الإدارات الزراعية بمراكز المحافظة هي فروع ووحدات تنفيذية محلية تابعة لديوان عام المديرية، ولا تتمتع بأي شخصية اعتبارية مستقلة أو ولاية ذاتية تخولها الانفراد بالبت أو مخاطبة جهات التحقيق أو تسليم تقارير المعاينات الفنية للنيابة العامة بصفة مستقلة دون اعتماد وإشراف السلطة الرئاسية بديوان المديرية ومهرها بخاتم شعار الجمهورية.' }
  ]),

  new Paragraph({ spacing: { before: 80, after: 60 } }),

  // Section 2: Public Prosecution Instructions
  createHeadingP('ثانياً: المستقر عليه قضائياً بتعليمات النيابة العامة في مخاطبة الجهات المعاونة والخبراء :', { underline: true }),
  createBodyP([
    { text: 'تقضي القواعد الإجرائية المقررة بالتعليمات العامة للنيابة العامة (في المسائل القضائية والإدارية) بأن توجيه التكليفات وقرارات التحقيق القضائية وندب الخبراء واللجان الفنية الاستشارية يكون معقوداً لرؤساء الجهات والمصالح الإدارية (وكيل وزارة الزراعة مدير المديرية) بصفته السلطة المختصة التي تملك تشكيل اللجان المؤهلة وتحديد الخبراء ومساءلتهم إدارياً وقانونياً، وليس إلى فروع محلية غير مختصة بإصدار قرارات رسمية نهائية، وذلك صوناً لحيدة جهات الفحص وسداً لباب التضارب الإداري أمام منصات القضاء.' }
  ]),

  new Paragraph({ spacing: { before: 80, after: 60 } }),

  // Section 3: Special Geographic & Jurisdictional Nature of Borg El Arab
  createHeadingP('ثالثاً: الطبيعة الجغرافية والقانونية الخاصة لزمام مركز برج العرب (قانون الأراضي الصحراوية رقم ١٤٣ لسنة ١٩٨١) :', { underline: true }),
  createBodyP(
    'إن الحكمة الموضوعية والفنية في استبعاد الإدارة الزراعية ببرج العرب القديم من الانفراد بتسليم قرارات المعاينة، وتعيين مسار التسليم لديوان مديرية الزراعة بالإسكندرية وخبير الهيئة، ترتكز على طبيعة جغرافية وقانونية بالغة الدقة والحساسية:'
  ),
  createBodyP([
    { text: '١. ازدواجية وتداخل جهات الولاية بنطاق مركز برج العرب:', bold: true },
    { text: ' إن غالبية الأراضي الواقعة بزمام مركز ومدينة برج العرب لا تخضع لزمام الأطيان الزراعية الأهلية القديمة، بل تقع في مساحات تداخل خاضعة لأحكام قانون الأراضي الصحراوية رقم ١٤٣ لسنة ١٩٨١ ولائحته التنفيذية وتدخل ضمن الولاية الحصرية لـ «الهيئة العامة لمشروعات التعمير والتنمية الزراعية» بموجب المادة الثانية منه، فضلاً عن كردون المجتمعات العمرانية الجديدة.' }
  ]),
  createBodyP([
    { text: '٢. عدم ولاية الإدارة الزراعية ببرج العرب القديم على أراضي هيئة التعمير:', bold: true },
    { text: ' لما كانت الإدارة الزراعية ببرج العرب القديم إدارة محلية تتبع مديرية الزراعة ولا تملك أي سجلات أو خرائط مساحية أو ولاية على أراضي هيئة التعمير والتنمية الزراعية، فإن تكليفها منفرداً بالمعاينة أو تسليمها قرارات المعاينة يوقع المعاينة في عيب جوهري وقصور فني؛ إذ لا يملك تمثيل ولاية الدولة الصحراوية إلا «خبير ومندوب الهيئة العامة لمشروعات التعمير والتنمية الزراعية» المختص جغرافياً والمفوض رسمياً بمطابقة الإحداثيات على سجلات وخرائط الهيئة.' }
  ]),

  new Paragraph({ spacing: { before: 80, after: 60 } }),

  // Section 4: Document Cycle / Workflow
  createHeadingP('رابعاً: الدورة المستندية والمسار الإجرائي المعتمد لمحاضر وقرارات المعاينة بمديرية الزراعة بالإسكندرية :', { underline: true }),
  createBodyP(
    'إيضاحاً للمسار الإداري والدفتري والرقابي الصارم الذي تمر به كافة محاضر وقرارات المعاينة بالمديرية تنفيذاً لقرارات النيابة العامة، نتشرف بعرض مراحل الدورة المستندية المعتمدة والمتبعة رسمياً بديوان عام مديرية الزراعة بالإسكندرية على النحو الآتي:'
  ),
  createBodyP([
    { text: '١. المرحلة الأولى (القيد المركزي والتأشير الرئاسي):', bold: true },
    { text: ' ورود كتاب النيابة العامة الموقرة أو الهيئات القضائية إلى ديوان عام مديرية الزراعة بالإسكندرية؛ حيث يتم قيده فوراً بالسجل العام المركزي للوارد، وكذا بسجلات الوارد القضائي بالإدارة العامة للشئون القانونية برقم وارد وتاريخ محددين، ثم يُعرض فوراً على السيد وكيل وزارة الزراعة مدير المديرية ليؤشر عليه بالإحالة للإدارة العامة لحماية الأراضي والإدارة العامة للشئون القانونية لاتخاذ اللازم فنياً وقانونياً.' }
  ]),
  createBodyP([
    { text: '٢. المرحلة الثانية (التكليف الإداري وتشكيل اللجنة المشتركة):', bold: true },
    { text: ' تُصدر الإدارة العامة لحماية الأراضي بالمديرية أمراً إدارياً بتشكيل لجنة فنية مشتركة برئاسة مهندس زراعي من الإدارة العامة لحماية الأراضي بالمديرية، وعضوية مهندس حماية الأراضي بالإدارة الزراعية المختصة، مع إخطار رسمي كتابي لـ «خبير ومندوب الهيئة العامة لمشروعات التعمير والتنمية الزراعية» (فرع الإسكندرية) للحضور والمشاركة الإلزامية في المعاينة لكافة المساحات الواقعة بنطاق مركز برج العرب، ويتم إخطار ذوي الشأن قانوناً بالموعد المحدد.' }
  ]),
  createBodyP([
    { text: '٣. المرحلة الثالثة (الانتقال الميداني والرفع المساحي والتوثيق الجغرافي):', bold: true },
    { text: ' تنتقل اللجنة المشتركة بكامل تشكيلها وبحضور مندوب وخبير هيئة التعمير إلى الموقع على الطبيعة؛ حيث تتولى إجراء الرفع المساحي الدقيق للقطعة محل النزاع وتحديد معالمها وحدودها الأربعة باستخدام أجهزة التموضع الجغرافي العالمي (GPS)، وتثبيت الإحداثيات الجغرافية المرجعية (WGS84 / ETM)، وإثبات طبيعة استغلال الأرض، ومصادر الري والصرف، وبيان واضعي اليد وسندات حيازتهم، وتوثيق المعاينة بالصور الفوتوغرافية الميدانية.' }
  ]),
  createBodyP([
    { text: '٤. المرحلة الرابعة (تحرير المسودة الميدانية والتوقيع الجماعي المشترك):', bold: true },
    { text: ' يُحرر محضر المعاينة الميداني في موقع الأرض على النموذج الرسمي المعتمد، وتُدون به كافة المشاهدات والملاحظات الفنية والمساحية ورأي ممثل هيئة التعمير، ويوقع عليه جميع أعضاء اللجنة الميدانية وخبير الهيئة كلٌ فيما يخصه، ويُحظر تماماً انفراد أي عضو بالتوقيع أو تسليم أي صورة أو مسودة من المحضر لأي طرف من الخصوم في هذه المرحلة حفاظاً على سرية وسلامة التحقيقات القضائية.' }
  ]),
  createBodyP([
    { text: '٥. المرحلة الخامسة (التدقيق المساحي والربط الرقمي بمركز المتغيرات المكانية):', bold: true },
    { text: ' عقب الانتقال الميداني، يُعاد الملف فوراً إلى الإدارة العامة لحماية الأراضي بالمديرية لإجراء المضاهاة الفنية الإلزامية:' }
  ]),
  createBodyP([
    { text: '    أ) مطابقة الإحداثيات المساحية المرفوعة ميدانياً على منظومة التصوير الفضائي والأقمار الصناعية ومركز المتغيرات المكانية بديوان عام محافظة الإسكندرية لتحديد تاريخ الإشغال وجهة الولاية بدقة (أطيان زراعية خاضعة للمديرية أم ولاية هيئة التعمير والتنمية الزراعية أم أملاك دولة).' }
  ]),
  createBodyP([
    { text: '    ب) مطابقة المساحة على سجلات الحيازة الزراعية المعتمدة (الدفاتر الورقية وسجل ٢ خدمات وسجلات حماية الأراضي وبطاقة كارت الفلاح الإلكترونية) للتحقق من سلامة القيود وعدم تكرارها.' }
  ]),
  createBodyP([
    { text: '٦. المرحلة السادسة (المراجعة القانونية الشاملة بالإدارة العامة للشئون القانونية):', bold: true },
    { text: ' تُحال أوراق المعاينة والتقارير المساحية فور إنجازها إلى الإدارة العامة للشئون القانونية بالمديرية (إدارة التحقيقات وفض المنازعات)؛ حيث يتولى المستشار القانوني للمديرية فحص الإجراءات والشكليات القضائية، والتحقق من التزام اللجنة بالأصول القانونية المقررة، وإعداد المذكرة الشارحة والرأي القانوني النهائي المعروض على النيابة العامة الموقرة.' }
  ]),
  createBodyP([
    { text: '٧. المرحلة السابعة (الاعتماد الرئاسي المركزي والمهر بشعار الجمهورية والتصدير القضائي):', bold: true },
    { text: ' يُعرض التقرير النهائي ومحضر المعاينة على السيد وكيل وزارة الزراعة بالإسكندرية (مدير المديرية) شخصياً بصفته السلطة الرئاسية المختصة لاعتماده رسمياً، وتُمهر كافة أوراق المعاينة بخاتم شعار الجمهورية الخاص بمديرية الزراعة بالإسكندرية، ثم تُقيد برقم صادر قضائي بالسجل المركزي، وتُصدر رسمياً في مظروف مغلق ومسجل مباشرةً إلى السيد الأستاذ المستشار رئيس نيابة برج العرب الجزئية، وتُسلم نسخة طبق الأصل لمندوب وخبير هيئة التعمير لإيداعها بملف الهيئة المركزي.' }
  ]),

  new Paragraph({ spacing: { before: 80, after: 60 } }),

  // Section 5: Internal Administrative Order & Grounding
  createHeadingP('خامساً: السند التنظيمي والإداري الداخلي المعتمد المعمول به بديوان المديرية :', { underline: true }),
  createBodyP([
    { text: 'إن قصر استلام قرارات المعاينة القضائية وتصديرها على «ديوان عام مديرية الزراعة بالإسكندرية» أو حضور «خبير الهيئة العامة لمشروعات التعمير والتنمية الزراعية» بدلاً من تسليمها للإدارة الزراعية ببرج العرب القديم، هو ' },
    { text: '«تنظيم إداري داخلي ملزم وقرار تنفيذي صادر عن السلطة المختصة بمديرية الزراعة بالإسكندرية»', bold: true },
    { text: '؛ أملته مقتضيات المصلحة العامة وحماية المال العام، وسداً لأي ثغرة للتلاعب أو صدور تقارير فنية متضاربة من الجمعيات والإدارات المحلية، وضماناً لإجراء الرفع المساحي بالمتغيرات المكانية وحضور صاحب الولاية القانونية (هيئة التعمير) على الأراضي الواقعة بزمام برج العرب، وهو النهج الرقابي المعتمد الذي أقرته كافة أجهزة المتابعة والتفتيش الإداري بالمحافظة.' }
  ]),

  new Paragraph({ spacing: { before: 80, after: 60 } }),

  // Section 6: Conclusion & Requests
  createHeadingP('سادساً: الخاتمة والطلبات المعروضة على سيادتكم :', { underline: true }),
  createBodyP([
    { text: 'بناءً على كل ما تقدم؛ تؤكد مديرية الزراعة بالإسكندرية للنيابة العامة الموقرة كامل استعدادها وامتثالها الدائم لتنفيذ أي قرار معاينة أو تكليف فني يصدر عن سيادتكم فور وروده للديوان العام للمديرية وفقاً للمسار الرئاسي المعتمد، كما نجدد التماسنا لسيادتكم بالتكرم بموافاتنا برقم القضية وسنتها محل التحقيقات الجارية، حتى يتسنى للمديرية إثباتها وربطها بسجلاتها ومكاتباتها الرسمية.' }
  ]),

  new Paragraph({ spacing: { before: 60, after: 60 } }),

  createBodyP('وتفضلوا سيادتكم بقبول أسمى آيات التقدير والإعزاز والاحترام لمقامكم الرفيع ،،،', { bold: true, alignment: AlignmentType.CENTER }),

  new Paragraph({ spacing: { before: 100, after: 80 } }),

  buildOfficialSignaturesTable(),
];

// Document sections configuration with PageBorders and Margins
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
            new TextRun({ text: '  —  مديرية الزراعة بالإسكندرية / الإدارة العامة للشئون القانونية — خطاب نيابة برج العرب', font: FONT_NAME, size: 20, bold: true }),
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
      children: letterChildren,
    },
  ],
});

// Paths to save
const desktopTarget = 'C:/Users/احمد منصور/Desktop/خطاب_مديرية_الزراعة_إلى_رئيس_نيابة_برج_العرب.docx';
const repoDir = path.join(__dirname, '../الصياغات_القانونية_الخاصة/04_تظلمات_وشكاوى');
const repoTarget = path.join(repoDir, 'خطاب_مديرية_الزراعة_إلى_رئيس_نيابة_برج_العرب.docx');
const dTarget = 'D:/المذكرات القانونية/خطاب_مديرية_الزراعة_إلى_رئيس_نيابة_برج_العرب.docx';

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
