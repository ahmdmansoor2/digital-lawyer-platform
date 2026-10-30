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

// Paragraph creators
function createTitleP(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    bidirectional: true,
    spacing: {
      before: opts.spacingBefore !== undefined ? opts.spacingBefore : 120,
      after: opts.spacingAfter !== undefined ? opts.spacingAfter : 120,
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
      before: opts.spacingBefore !== undefined ? opts.spacingBefore : 140,
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
      before: opts.spacingBefore !== undefined ? opts.spacingBefore : 60,
      after: opts.spacingAfter !== undefined ? opts.spacingAfter : 60,
      line: opts.line || 300, // 1.25 line spacing
    },
    indent: opts.indent ? { firstLine: 400 } : undefined,
    children: textRuns,
  });
}

// Build Header Table with Ahmed Mansour Logo & Office Info
function buildOfficeHeader() {
  const cells = [
    // Left: Office details
    new TableCell({
      width: { size: 38, type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlign.CENTER,
      borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
      children: [
        new Paragraph({
          alignment: AlignmentType.LEFT,
          bidirectional: true,
          spacing: { before: 0, after: 20 },
          children: [
            new TextRun({ text: 'العجمي — أبو يوسف — الإسكندرية', font: FONT_NAME, size: 22, bold: true }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.LEFT,
          bidirectional: true,
          spacing: { before: 0, after: 0 },
          children: [
            new TextRun({ text: 'هاتف: ٠١٢٢٥٧٦١٥٣٥', font: FONT_NAME, size: 22 }),
          ],
        }),
      ],
    }),
    // Middle: Logo
    new TableCell({
      width: { size: 24, type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlign.CENTER,
      borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
      children: [
        logoBuffer ? new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: logoBuffer,
              transformation: { width: 75, height: 85 },
            }),
          ],
        }) : new Paragraph({ alignment: AlignmentType.CENTER }),
      ],
    }),
    // Right: Lawyer Name
    new TableCell({
      width: { size: 38, type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlign.CENTER,
      borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
      children: [
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          spacing: { before: 0, after: 20 },
          children: [
            new TextRun({ text: 'الأستاذ / أحمد منصور', font: FONT_NAME, size: 26, bold: true }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          spacing: { before: 0, after: 0 },
          children: [
            new TextRun({ text: 'المحامي بالنقض والدستورية العليا', font: FONT_NAME, size: 22, bold: true }),
          ],
        }),
      ],
    }),
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [new TableRow({ children: cells })],
  });
}

// Build Signatures Block Table
function buildSignaturesTable() {
  const tableBorders = {
    top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
    bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
    left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
    right: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
    insideVertical: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
  };

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows: [
      new TableRow({
        children: [
          // Left: الطرف الثاني المقر بالصورية
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: tableBorders,
            verticalAlign: VerticalAlign.TOP,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                spacing: { before: 80, after: 40 },
                children: [
                  new TextRun({ text: 'الطرف الثاني (المشتري الظاهر / المقرة بالصورية)', font: FONT_NAME, size: 30, bold: true }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                spacing: { before: 40, after: 30 },
                children: [
                  new TextRun({ text: 'الاسم: منى محمود حسين الصايم', font: FONT_NAME, size: 28, bold: true }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                spacing: { before: 30, after: 30 },
                children: [
                  new TextRun({ text: 'الرقم القومي: ٢٥٧٠٩١٩١٦٠٠٠٤٩', font: FONT_NAME, size: 28 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                spacing: { before: 30, after: 40 },
                children: [
                  new TextRun({ text: 'التوقيع: ................................................', font: FONT_NAME, size: 28 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                spacing: { before: 30, after: 80 },
                children: [
                  new TextRun({ text: 'بصمة الإبهام الأيمن: .................................', font: FONT_NAME, size: 28 }),
                ],
              }),
            ],
          }),
          // Right: الطرف الأول المالك الحقيقي
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: tableBorders,
            verticalAlign: VerticalAlign.TOP,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                spacing: { before: 80, after: 40 },
                children: [
                  new TextRun({ text: 'الطرف الأول (البائع الظاهر / المالك الحقيقي)', font: FONT_NAME, size: 30, bold: true }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                spacing: { before: 40, after: 30 },
                children: [
                  new TextRun({ text: 'الاسم: عمرو مرسي سعد سلام', font: FONT_NAME, size: 28, bold: true }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                spacing: { before: 30, after: 30 },
                children: [
                  new TextRun({ text: 'الرقم القومي: ٢٨٥٠٥٠٢١٨٠٣٢٧٨', font: FONT_NAME, size: 28 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                spacing: { before: 30, after: 40 },
                children: [
                  new TextRun({ text: 'التوقيع: ................................................', font: FONT_NAME, size: 28 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                spacing: { before: 30, after: 80 },
                children: [
                  new TextRun({ text: 'بصمة الإبهام الأيمن: .................................', font: FONT_NAME, size: 28 }),
                ],
              }),
            ],
          }),
        ],
      }),
      // Witnesses Row
      new TableRow({
        children: [
          // Left: الشاهد الثاني
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: tableBorders,
            verticalAlign: VerticalAlign.TOP,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                spacing: { before: 60, after: 40 },
                children: [
                  new TextRun({ text: 'الشاهد الثاني', font: FONT_NAME, size: 28, bold: true, underline: {} }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                spacing: { before: 20, after: 20 },
                children: [
                  new TextRun({ text: 'الاسم: ................................................', font: FONT_NAME, size: 26 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                spacing: { before: 20, after: 20 },
                children: [
                  new TextRun({ text: 'الرقم القومي: ........................................', font: FONT_NAME, size: 26 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                spacing: { before: 20, after: 60 },
                children: [
                  new TextRun({ text: 'التوقيع: ................................................', font: FONT_NAME, size: 26 }),
                ],
              }),
            ],
          }),
          // Right: الشاهد الأول
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: tableBorders,
            verticalAlign: VerticalAlign.TOP,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                spacing: { before: 60, after: 40 },
                children: [
                  new TextRun({ text: 'الشاهد الأول', font: FONT_NAME, size: 28, bold: true, underline: {} }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                spacing: { before: 20, after: 20 },
                children: [
                  new TextRun({ text: 'الاسم: ................................................', font: FONT_NAME, size: 26 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                spacing: { before: 20, after: 20 },
                children: [
                  new TextRun({ text: 'الرقم القومي: ........................................', font: FONT_NAME, size: 26 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                spacing: { before: 20, after: 60 },
                children: [
                  new TextRun({ text: 'التوقيع: ................................................', font: FONT_NAME, size: 26 }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// Generate the whole document body
const children = [
  buildOfficeHeader(),

  new Paragraph({ spacing: { before: 100, after: 80 } }),

  createTitleP('ورقة ضد ومحرر اتفاق وإقرار قاطع بالصورية المطلقة', { size: 38, underline: true }),
  createTitleP('(إعمالاً لنص المادتين ٢٤٤ و ٢٤٥ من القانون المدني المصري وأحكام محكمة النقض)', { size: 28, bold: true }),

  new Paragraph({ spacing: { before: 60, after: 60 } }),

  createBodyP(
    'إنه في يوم الأربعاء الموافق ٥ / ١ / ٢٠٢٢ م، وبمكتب الأستاذ / أحمد منصور المحامي بالنقض والدستورية العليا، الكائن بأبو يوسف – العجمي – الإسكندرية، تحرر هذا المحرر الملزم قانوناً بين كل من:'
  ),

  new Paragraph({ spacing: { before: 40, after: 40 } }),

  // Party 1
  createBodyP([
    { text: 'أولاً: السيد / عمرو مرسي سعد سلام', bold: true },
    { text: '، مصري الجنسية، مسلم الديانة، مواليد ٢ / ٥ / ١٩٨٥ م، والمقيم في ٣٠٤ شارع السلام، الهانوفيل، العجمي، قسم الدخيلة، محافظة الإسكندرية، ويحمل بطاقة رقم قومي: (' },
    { text: '٢٨٥٠٥٠٢١٨٠٣٢٧٨', bold: true },
    { text: ') سجل مدني الدخيلة.' },
  ]),
  createBodyP([
    { text: '(( طرف أول — بائع ظاهر / مالك حقيقي وحيد للشقة ))', bold: true },
  ], { alignment: AlignmentType.CENTER }),

  new Paragraph({ spacing: { before: 40, after: 40 } }),

  // Party 2
  createBodyP([
    { text: 'ثانياً: السيدة / منى محمود حسين الصايم', bold: true },
    { text: '، مصرية الجنسية، مسلمة الديانة، مواليد ١٩ / ٩ / ١٩٥٧ م، والمقيمة في شارع ١٧ بيانكي، البيطاش، قسم الدخيلة، محافظة الإسكندرية، وتحمل بطاقة رقم قومي: (' },
    { text: '٢٥٧٠٩١٩١٦٠٠٠٤٩', bold: true },
    { text: ') سجل مدني الدخيلة.' },
  ]),
  createBodyP([
    { text: '(( طرف ثانٍ — مشترية ظاهرة / مقرة بالصورية المطلقة وانعدام أثر البيع ))', bold: true },
  ], { alignment: AlignmentType.CENTER }),

  new Paragraph({ spacing: { before: 80, after: 60 } }),

  // Preamble
  createHeadingP('التمهيـــــــــد القضائي والتأصيلي للتعاقد :', { underline: true }),
  createBodyP(
    'حيث إنه في ذات التاريخ المعاصر لهذا المحرر (وهو يوم الأربعاء الموافق ٥ / ١ / ٢٠٢٢ م)، قد تم تحرير عقد بيع ابتدائي ظاهري بين الطرفين تضمن في مظهره بيع الطرف الأول إلى الطرف الثاني ما هو عبارة عن:'
  ),
  createBodyP([
    { text: '«الشقة السكنية رقم (٣٠٤) الكائنة بالدور الثالث علوي يسار الصاعد، بالعقار الكائن بشارع العربي متفرع من شارع السلام، ممتد إلى جامع الحاج رضوان، الهانوفيل، قسم الدخيلة، محافظة الإسكندرية، والمكونة من ثلاث غرف ومطبخ وحمام مستطيلة الشكل، والبالغ مساحتها الإجمالية (١٢٥ متراً مربعاً) مائة وخمسة وعشرون متراً مربعاً بالخدمات تحت العجز والزيادة، وما يتبعها من حصة شائعة في كامل أرض ومنافع العقار البالغة مساحته الإجمالية (٣٦٠ متراً مربعاً)»، وذلك نظير ثمن مسمى قدره (٥٠٠,٠٠٠ جنيه) خمسمائة ألف جنيه مصري.', bold: true },
  ]),
  createBodyP(
    'ولما كانت الحقيقة والواقع والنية المشتركة القاطعة لطرفي التعاقد قد اتجهت وانعقدت صراحةً وجزماً على أن عقد البيع المذكور أعلاه والمؤرخ في ٥ / ١ / ٢٠٢٢ م هو عقد صوري صورية مطلقة (Simulation Absolue) لا وجود له واقعاً أو قانوناً، ولم تتجه إرادة أيٍّ من المتعاقدين إلى إحداث أي أثر من الآثار القانونية المترتبة على عقد البيع، وإنما حرر هذا العقد لمجرد غرض مؤقت وسبيل أمانة صوري لا يمس حق الملكية ولا الحيازة.'
  ),
  createBodyP(
    'ولما كان قانون الإثبات في المواد المدنية والتجارية رقم ٢٥ لسنة ١٩٦٨ يقضي في مادته رقم (٦٠) بأنه لا يجوز إثبات ما يخالف الكتابة إلا بالكتابة؛ وحمايةً لحقوق الطرف الأول المالك الحقيقي ومنعاً لأي منازعة مستقبلية أو إضرار به أو بورثته، فقد حرر الطرفان هذا المحرر (ورقة ضد / Counter-Deed) بكامل أهليتهما القانونية والشرعية الخالية من أي عيب من عيوب الإرادة، متفقين ومقرين بالبنود والشروط الآتية:'
  ),

  new Paragraph({ spacing: { before: 80, after: 60 } }),

  // Clause 1
  createHeadingP('البند الأول: القيمة التفسيرية للتمهيد وأسبقيته الملزمة', { underline: true }),
  createBodyP(
    'يقر الطرفان بأن التمهيد السابق بيانه والوقائع الواردة به جزء لا يتجزأ من هذا المحرر (ورقة الضد)، ومفسراً ومكملاً ومتمماً لكافة بنوده وشروطه، وتعتبر له ذات القوة القانونية والإلزامية المقررة لسائر أحكامه.'
  ),

  // Clause 2
  createHeadingP('البند الثاني: الإقرار القاطع بالصورية المطلقة لعقد البيع وانعدام أثره', { underline: true }),
  createBodyP([
    { text: 'تقر الطرف الثاني (السيدة / منى محمود حسين الصايم) بكامل أهليتها وإرادتها الحرة الواعية، إقراراً قضائياً وشرعياً ورسمياً قاطعاً لا رجعة فيه ولا نكول عنه، بأن عقد البيع المحرر لصالحها من الطرف الأول والمؤرخ في ', bold: false },
    { text: '٥ / ١ / ٢٠٢٢ م', bold: true },
    { text: ' عن الشقة رقم (٣٠٤) بالدور الثالث علوي بالعقار الكائن بشارع العربي متفرع من شارع السلام بالهانوفيل، قسم الدخيلة، الإسكندرية، ', bold: false },
    { text: 'هو عقد صوري صورية مطلقة ومنعدم الأثر قانوناً وواقعاً، وأنه لم ينعقد بين الطرفين عقد بيع حقيقي قط، ولم تنتقل ملكية الشقة ولا أي جزء منها أو حصتها في الأرض إلى الطرف الثاني قيد أنملة، بل ظلت الملكية الخالصة والمطلقة للطرف الأول وحده.', bold: true },
  ]),
  createBodyP(
    'كما يقر الطرفان صراحةً بأنه إعمالاً لنص المادة (٢٤٥) من القانون المدني المصري والتي تنص على أنه: «إذا ستر المتعاقدان عقداً حقيقياً بعقد ظاهر، فالعقد النافذ فيما بين المتعاقدين والخلف العام هو العقد الحقيقي»، فإن هذا المحرر الماثل (ورقة الضد) هو المحرر الحقيقي المستتر والنافذ حصراً وقانوناً بين الطرفين وخلفهما العام والخاص دون سواه، ويعدم ويلغي كل أثر للعقد الظاهر المؤرخ في ٥ / ١ / ٢٠٢٢ م.'
  ),

  // Clause 3
  createHeadingP('البند الثالث: نفي وبطلان سداد الثمن وصورية المخالصة', { underline: true }),
  createBodyP([
    { text: 'تقر الطرف الثاني صراحةً وجزماً بأن الثمن المسمى في عقد البيع الظاهري المؤرخ في ٥ / ١ / ٢٠٢٢ م، والبالغ قدره ', bold: false },
    { text: '٥٠٠,٠٠٠ جنيه (خمسمائة ألف جنيه مصري فقط لا غير)', bold: true },
    { text: '، هو ثمن صوري ووهمي لا أساس له من الصحة، وأنها لم تسدد ولم تدفع من يدها أو مالها للطرف الأول أي مبالغ مالية مطلقاً، لا كلاً ولا جزءاً ولا عربوناً، وأن ما أُثبت في البند الثاني من العقد الظاهري بشأن قبض الطرف الأول لكامل الثمن بمجلس العقد وتوقيعه بمثابة مخالصة نهائية هو تقرير صوري شكلي محض لا يطابق الواقع؛ ومن ثم تبرأ ذمة الطرف الأول نهائياً من أي التزام برد أي ثمن أو تعويض عنه، وتقر الطرف الثاني بإبراء ذمة الطرف الأول إبراءً شاملاً مانعاً من أي مطالبة مالية.', bold: true },
  ]),

  // Clause 4
  createHeadingP('البند الرابع: بقاء الحيازة الفعلية والقانونية والانتفاع للطرف الأول', { underline: true }),
  createBodyP(
    'تقر الطرف الثاني بأن حيازة الشقة المبيعة ظاهرياً والانتفاع بها واستغلالها لم تنتقل إليها مطلقاً، وأن ما ذُكر في البند السادس من العقد الظاهري بأن التوقيع عليه بمثابة محضر تسليم هو أمر صوري بحت؛ حيث إن الشقة المذكورة كانت وما زالت في الحيازة والوضع اليد الفعلي والانتفاع المطلق للطرف الأول (السيد / عمرو مرسي سعد سلام) وحده، وله وحده كامل الحق في سكنها، أو تأجيرها، أو غلقها، أو استغلالها بكافة أوجه الاستغلال والتصرف المادي والقانوني باعتباره المالك الحقيقي والحائز الفعلي والشرعي لها دون معارضة من أحد.'
  ),

  // Clause 5
  createHeadingP('البند الخامس: حظر التصرف والرهن والترتيب لكافة الحقوق العينية والشخصية', { underline: true }),
  createBodyP(
    'تلتزم وتتعهد الطرف الثاني تعهداً مطلقاً وجازماً ومانعاً بالامتناع عن إجراء أي تصرف مادي أو قانوني على الشقة محل العقد الصوري وملحقاتها، سواء بالبيع، أو الهبة، أو الوصية، أو الإيجار، أو الرهن الحيازي أو التأميني، أو التنازل، أو التقرير لأي حق انتفاع أو ارتفاق، أو إدخال أي شركاء، أو عمل أي توكيلات بالبيع أو الإدارة للنفس أو للغير.'
  ),
  createBodyP([
    { text: 'ويعتبر أي تصرف يصدر من الطرف الثاني للغير باطلاً بطلاناً مطلقاً ومنعدم الأثر ولا ينفذ في مواجهة الطرف الأول أو ورثته، وتتحمل الطرف الثاني منفردةً المسؤولية المدنية والجنائية الكاملة (بما فيها جريمة النصب والتصرف في مال ثابت ليس ملكاً للمتصرف ولا له حق التصرف فيه عملاً بالمادة ٣٣٦ من قانون العقوبات المصري).', bold: true },
  ]),

  // Clause 6
  createHeadingP('البند السادس: حظر إشهار العقد أو تسجيله أو رفع الدعاوى القضائية بشأنه', { underline: true }),
  createBodyP(
    'تتعهد الطرف الثاني تعهداً باتاً بعدم تقديم العقد الصوري المؤرخ في ٥ / ١ / ٢٠٢٢ م إلى أي مأمورية شهر عقاري أو توثيق للشهر أو القيد أو التسجيل أو إثبات التاريخ، كما تتعهد بعدم رفع أي دعوى قضائية استناداً إليه أياً كان نوعها (كدعوى صحة ونفاذ، أو دعوى صحة توقيع، أو دعوى تثبيت ملكية، أو دعوى فرز وتجنيب، أو دعوى طرد وتسليم).'
  ),
  createBodyP([
    { text: 'وفي حال مخالفة الطرف الثاني لهذا الالتزام وإقامة أي دعوى قضائية، فإن هذا المحرر الماثل (ورقة الضد) يعتبر إقراراً قضائياً نهائياً وباتاً وتنازلاً مطلقاً من الطرف الثاني عن تلك الدعوى وعن الخصومة فيها وعن أي حق مزعوم، ويحق للطرف الأول بموجبه تقديم هذا المحرر للمحكمة للقضاء فوراً برفض الدعوى لصورية عقد البيع صورية مطلقة مع إلزام الطرف الثاني بكافة المصروفات ومقابل أتعاب المحاماة والتعويضات المقررة.', bold: true },
  ]),

  // Clause 7
  createHeadingP('البند السابع: التزام الطرف الثاني برد أصل العقد الظاهري وإعدامه', { underline: true }),
  createBodyP(
    'تتعهد الطرف الثاني بتسليم أصل نسختها من عقد البيع الظاهري المؤرخ في ٥ / ١ / ٢٠٢٢ م إلى الطرف الأول فور طلبه في أي وقت يحدده، وبمجرد التوقيع على ورقة الضد الماثلة، يعتبر ذلك العقد الظاهري معدوماً ولاغياً ومفسوخاً حكماً بين الطرفين ولا قيمة له في ذاته، ولا يجوز للطرف الثاني أو لأيٍّ من تابعيها أو ورثتها الاحتجاج به أو ببنوده في أي محفل رسمي أو عرفي أو قضائي.'
  ),

  // Clause 8
  createHeadingP('البند الثامن: سريان ونفاذ ورقة الضد في مواجهة الخلف العام (الورثة) والخاص', { underline: true }),
  createBodyP([
    { text: 'اتفق الطرفان صراحةً على أن هذا المحرر (ورقة الضد) يسري وينفذ بكامل آثاره القانونية والتنفيذية والإلزامية في مواجهة ورثة الطرفين وخلفهما العام والخاص بعد الوفاة، وتعد بنوده حجة قاطعة مانعة لأي نزاع قد يثيره ورثة الطرف الثاني مستقبلاً في مواجهة الطرف الأول أو ورثته، ولا يسقط هذا الحق بالتقادم ولا بمرور الزمان مهما طالت مدته إعمالاً لأحكام محكمة النقض المستقرة في شأن الصورية المطلقة.', bold: true },
  ]),

  // Clause 9
  createHeadingP('البند التاسع: الشرط الجزائي الرادع والتعويض الاتفاقي الجازم', { underline: true }),
  createBodyP([
    { text: 'اتفق الطرفان بكامل إرادتهما على أنه في حال إخلال الطرف الثاني بأي التزام من التزاماتها الواردة بهذا المحرر، أو منازعتها للطرف الأول في ملكيته أو حيازته للشقة، أو امتناعها عن تسليم أصل العقد الظاهري، أو محاولتها استغلاله أو شهره أو رفع دعوى بشأنه أو التصرف في الشقة للغير، فإنها تكون ملزمة بأن تدفع للطرف الأول فوراً ودون حاجة إلى إنذار أو إعذار أو اللجوء للقضاء مبلغاً وقدره: ', bold: false },
    { text: '١,٠٠٠,٠٠٠ جنيه (مليون جنيه مصري لا غير)', bold: true },
    { text: ' كتعويض اتفاقي ونهائي ورادع غير خاضع لرقابة القضاء، مع بقاء أصل الالتزام قائماً وبطلان كافة تصرفاتها وصورية العقد الظاهر صورية مطلقة.', bold: false },
  ]),

  // Clause 10
  createHeadingP('البند العاشر: الإقرار بالتصديق بالشهر العقاري أو الوكالة الرسمية', { underline: true }),
  createBodyP(
    'تقر الطرف الثاني باستعدادها التام للمثول أمام مصلحة الشهر العقاري والتوثيق المختصة للتصديق على توقيعها على هذا المحرر لإكسابه التاريخ الثابت والشكل الرسمي متى طلب منها الطرف الأول ذلك، أو تحرير توكيل رسمي خاص يخول الطرف الأول إلغاء العقد المؤرخ في ٥ / ١ / ٢٠٢٢ م والتعامل مع كافة الجهات الحكومية والجهات ذات الشأن وشركات المرافق (كهرباء، مياه، غاز).'
  ),

  // Clause 11
  createHeadingP('البند الحادي عشر: الموطن المختار والاختصاص القضائي', { underline: true }),
  createBodyP(
    'يقر الطرفان بأن موطنهما المختار هو العنوان الموضح بصدر هذا العقد، وتصح عليه كافة الإعلانات والإخطارات والمكاتبات القضائية والقانونية. كما تختص محاكم الإسكندرية الابتدائية والجزئية بنظر أي نزاع قد ينشأ مستقبلاً بشأن تفسير أو تنفيذ هذا المحرر، مع استبعاد أي محكمة أخرى.'
  ),

  // Clause 12
  createHeadingP('البند الثاني عشر: عدد النسخ وتحرير العقد', { underline: true }),
  createBodyP(
    'تحرر هذا العقد (ورقة الضد) من نسختين أصليتين، استلم الطرف الأول نسخة أصلية واستلمت الطرف الثاني نسخة أصلية للعمل بموجبها والالتزام التام بكافة آثارها القانونية، واضعين في الاعتبار أن العقد شريعة المتعاقدين وأن الإقرار حجة قاطعة على المقر.'
  ),

  new Paragraph({ spacing: { before: 140, after: 100 } }),

  buildSignaturesTable(),
];

// Document Section definition with borders and 1 inch margins
const doc = new Document({
  sections: [
    {
      properties: {
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
                new TextRun({ text: '  —  مكتب الأستاذ أحمد منصور المحامي بالنقض والدستورية العليا', font: FONT_NAME, size: 20, bold: true }),
              ],
            }),
          ],
        }),
      },
      children: children,
    },
  ],
});

// Output targets
const desktopPath = 'C:/Users/احمد منصور/Desktop/ورقة_ضد_وإقرار_بصورية_عقد_بيع_شقة_الهانوفيل.docx';
const repoDir = 'd:/قانوني 7/الصياغات_القانونية_الخاصة/01_عقود_واتفاقيات';
const repoPath = path.join(repoDir, 'ورقة_ضد_وإقرار_بصورية_عقد_بيع_شقة_الهانوفيل.docx');
const dPath = 'D:/المذكرات القانونية/ورقة_ضد_وإقرار_بصورية_عقد_بيع_شقة_الهانوفيل.docx';

if (!fs.existsSync(repoDir)) {
  fs.mkdirSync(repoDir, { recursive: true });
}

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(desktopPath, buffer);
  console.log(`Saved successfully to Desktop: ${desktopPath}`);

  try {
    fs.writeFileSync(repoPath, buffer);
    console.log(`Saved successfully to repo: ${repoPath}`);
  } catch (e) {
    console.error(`Repo save failed: ${e.message}`);
  }

  try {
    fs.writeFileSync(dPath, buffer);
    console.log(`Saved successfully to D: ${dPath}`);
  } catch (e) {
    console.error(`D drive save failed: ${e.message}`);
  }
}).catch(err => {
  console.error('Generation error:', err);
});
