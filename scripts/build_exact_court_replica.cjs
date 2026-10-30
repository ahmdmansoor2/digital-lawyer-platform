const docx = require('docx');
const fs = require('fs');
const path = require('path');

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, HeadingLevel, PageBreak,
  ImageRun, ShadingType, VerticalAlign, PageBorderOffsetFrom
} = docx;

// Read logo image
const logoBuffer = fs.readFileSync(path.join(__dirname, 'prosecution_logo.png'));

// Font definitions
const FONT_NAME = 'Simplified Arabic';
const FONT_FALLBACK = 'Arial';

// Helper for Arabic paragraphs
function createP(text, opts = {}) {
  const runs = [];
  if (Array.isArray(text)) {
    for (const item of text) {
      if (typeof item === 'string') {
        runs.push(new TextRun({ text: item, font: FONT_NAME, size: opts.size || 24, bold: opts.bold || false }));
      } else {
        runs.push(new TextRun({
          text: item.text,
          font: FONT_NAME,
          size: item.size || opts.size || 24,
          bold: item.bold !== undefined ? item.bold : (opts.bold || false),
          underline: item.underline ? {} : undefined,
        }));
      }
    }
  } else if (text !== undefined && text !== '') {
    runs.push(new TextRun({
      text: text,
      font: FONT_NAME,
      size: opts.size || 24,
      bold: opts.bold || false,
      underline: opts.underline ? {} : undefined,
    }));
  }

  return new Paragraph({
    alignment: opts.alignment || AlignmentType.RIGHT,
    bidirectional: true,
    spacing: {
      before: opts.spacingBefore !== undefined ? opts.spacingBefore : 40,
      after: opts.spacingAfter !== undefined ? opts.spacingAfter : 40,
      line: opts.lineSpacing || 276, // 1.15
    },
    children: runs,
  });
}

// Build Header for each page
function buildHeader(isFollowUp = false) {
  // 3-column table: Right (Prosecution info), Middle (Print location), Left (Logo)
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
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
          // Left: Logo
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.TOP,
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  new ImageRun({
                    data: logoBuffer,
                    transformation: { width: 85, height: 58 },
                  }),
                ],
              }),
            ],
          }),
          // Middle: موقع الطباعة
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.TOP,
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                spacing: { before: 40, after: 0 },
                children: [
                  new TextRun({ text: 'موقع الطباعة: مجمع محاكم الساحل', font: FONT_NAME, size: 22, bold: true }),
                ],
              }),
            ],
          }),
          // Right: النيابة
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.TOP,
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                spacing: { before: 0, after: 20 },
                children: [
                  new TextRun({ text: 'نيابة شمال القاهرة الكلية لشئون الاسرة', font: FONT_NAME, size: 23, bold: true }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({ text: 'نيابة الساحل الجزئية لشئون الاسرة', font: FONT_NAME, size: 23, bold: true }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// Build Document Title
function buildDocTitle(isFollowUp = false) {
  const titleText = isFollowUp ? 'تابع صورة رسمية من مستندات القضية' : 'صورة رسمية من مستندات القضية';
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    bidirectional: true,
    spacing: { before: 100, after: 120 },
    children: [
      new TextRun({
        text: titleText,
        font: FONT_NAME,
        size: 30, // 15pt
        bold: true,
        underline: {},
      }),
    ],
  });
}

// Build Case Info Bar (Page 1 & 2)
function buildCaseInfoBar() {
  return [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      spacing: { before: 40, after: 30 },
      children: [
        new TextRun({ text: 'نيابة الساحل الجزئية لشئون الاسرة', font: FONT_NAME, size: 24, bold: true }),
        new TextRun({ text: '            جدول أسرة متنوع            ', font: FONT_NAME, size: 24, bold: true }),
        new TextRun({ text: 'رقم القضية  1365  لسنة  2026', font: FONT_NAME, size: 24, bold: true }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      spacing: { before: 0, after: 80 },
      children: [
        new TextRun({ text: 'الرقم الموحد  2207220221225386', font: FONT_NAME, size: 24, bold: true }),
      ],
    }),
  ];
}

// Build 3-column Metadata Table (نوع المستند / تاريخ تقديم المستند / مقدم المستند)
function buildMetaTable() {
  const tableBorders = {
    top: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
    bottom: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
    left: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
    right: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
    insideVertical: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
  };

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows: [
      new TableRow({
        children: [
          // Left: مقدم المستند
          new TableCell({
            width: { size: 37, type: WidthType.PERCENTAGE },
            borders: tableBorders,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                spacing: { before: 40, after: 40 },
                children: [new TextRun({ text: 'مقدم المستند', font: FONT_NAME, size: 24, bold: true })],
              }),
            ],
          }),
          // Middle: تاريخ تقديم المستند
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            borders: tableBorders,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                spacing: { before: 40, after: 40 },
                children: [new TextRun({ text: 'تاريخ تقديم المستند', font: FONT_NAME, size: 24, bold: true })],
              }),
            ],
          }),
          // Right: نوع المستند
          new TableCell({
            width: { size: 33, type: WidthType.PERCENTAGE },
            borders: tableBorders,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                spacing: { before: 40, after: 40 },
                children: [new TextRun({ text: 'نوع المستند', font: FONT_NAME, size: 24, bold: true })],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          // Left value: مقدم المستند (blank / empty in scan)
          new TableCell({
            width: { size: 37, type: WidthType.PERCENTAGE },
            borders: tableBorders,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                spacing: { before: 60, after: 60 },
                children: [new TextRun({ text: ' ', font: FONT_NAME, size: 24 })],
              }),
            ],
          }),
          // Middle value: 2026/06/22
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            borders: tableBorders,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                spacing: { before: 60, after: 60 },
                children: [new TextRun({ text: '2026/06/22', font: FONT_NAME, size: 24, bold: true })],
              }),
            ],
          }),
          // Right value: مسودة الحكم
          new TableCell({
            width: { size: 33, type: WidthType.PERCENTAGE },
            borders: tableBorders,
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                spacing: { before: 60, after: 60 },
                children: [new TextRun({ text: 'مسودة الحكم', font: FONT_NAME, size: 24, bold: true })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// Build Bottom Footer Bar for each page
function buildFooterBar(pageNum) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: '666666' },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          // Left: IP
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { before: 40, after: 0 },
                children: [new TextRun({ text: '10.21.37.114', font: FONT_FALLBACK, size: 18 })],
              }),
            ],
          }),
          // Center: User & Page
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                spacing: { before: 40, after: 0 },
                children: [
                  new TextRun({
                    text: `رقم الجهاز :        3    من    ${pageNum}  صفحه رقم    جمال الدين عبد النعيم موسى فرغلى`,
                    font: FONT_NAME,
                    size: 19,
                  }),
                ],
              }),
            ],
          }),
          // Right: Print Date
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { before: 40, after: 0 },
                children: [new TextRun({ text: '2026/07/15 9:47 AM :تاريخ الطباعة', font: FONT_FALLBACK, size: 18 })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// ==========================================
// ASSEMBLE PAGE 1
// ==========================================
const page1Children = [
  buildHeader(false),
  buildDocTitle(false),

  // Applicant Data
  new Paragraph({
    alignment: AlignmentType.RIGHT,
    bidirectional: true,
    spacing: { before: 30, after: 30 },
    children: [
      new TextRun({ text: 'بناء على الطلب المقدم من/ ', font: FONT_NAME, size: 25, bold: true }),
      new TextRun({ text: 'مبروك نصر سعد البمبي', font: FONT_NAME, size: 25, bold: true }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.RIGHT,
    bidirectional: true,
    spacing: { before: 0, after: 50 },
    children: [
      new TextRun({ text: 'الجنسية/ مصرية', font: FONT_NAME, size: 23, bold: true }),
      new TextRun({ text: '          رقم قومى  28609141701312          ', font: FONT_NAME, size: 23, bold: true }),
      new TextRun({ text: 'العنوان / شبرا - الساحل - القاهرة', font: FONT_NAME, size: 23, bold: true }),
    ],
  }),

  ...buildCaseInfoBar(),
  buildMetaTable(),

  // Spacing before judgment title
  new Paragraph({ spacing: { before: 80, after: 40 } }),

  // Judgment Heading
  new Paragraph({
    alignment: AlignmentType.CENTER,
    bidirectional: true,
    spacing: { before: 60, after: 30 },
    children: [
      new TextRun({
        text: 'مسودة بأسباب ومنطوق الحكم الصادر في الدعوى رقم ١٣٦٥ لسنة ٢٠٢٦ أسرة الساحل',
        font: FONT_NAME,
        size: 23,
        bold: true,
      }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    bidirectional: true,
    spacing: { before: 0, after: 80 },
    children: [
      new TextRun({
        text: 'والصادرة بجلسة ٢٠٢٦/٦/٢٢',
        font: FONT_NAME,
        size: 22,
        bold: true,
      }),
    ],
  }),

  // Judgment Text - Paragraphs
  createP('بعد سماع المرافعة ومطالعة الاوراق وسماع رأي النيابة العامة والمداولة قانونا ...', {
    alignment: AlignmentType.JUSTIFIED,
    bold: false,
    size: 22,
    lineSpacing: 260,
  }),
  createP(
    'حيث تتحصل وقائع الدعوى في أن المدعية أقامتها بموجب صحيفة أودعت قلم كتاب المحكمة بتاريخ ٢٠٢٥/١٢/٢٥ وأعلنت قانوناً للمدعى عليه طلباً في ختامها الحكم بنقل وإسناد الولاية التعليمية على الصغير ( معاذ ) للمدعية مع إلزام المدعى عليه بالمصروفات ومقابل أتعاب المحاماة والنفاذ ... على سند من القول أن المدعى عليه تزوج من المدعية ودخل بها وعاشرها معاشرة الأزواج ورزق منها بالصغير ( معاذ ) ، وعلى إثر خلاف بينهما تركت منزل الزوجية وبرفقتها الصغير ، وامتنعت عن تمكين المدعى عليه من رؤية نجله الصغير ، كما زعمت تعنته في مباشرة شؤونه التعليمية ، الأمر الذي حدا بالمدعية إلى إقامة تلك الدعوى للحكم لها بطلباتها سالفة الذكر . وقدمت سنداً لدعواها حافظة مستندات طالعتها المحكمة وألمت بها طويت على صورة ضوئية من وثيقة عقد زواج المدعية من المدعى عليه ، وصورة ضوئية من قيد ميلاد الصغير ( معاذ ) . وتداول نظر الدعوى بجلسات المرافعة على النحو الثابت بمحاضرها مثلاً خلالها كلٌ بوكيل عنه ، وأودع الخبيرين النفسي والاجتماعي تقريرهما ألمت به المحكمة ، والنيابة فوضت الرأي للمحكمة ، وبجلسة المرافعة الأخيرة قررت المحكمة حجز الدعوى للحكم لجلسة اليوم .',
    { alignment: AlignmentType.JUSTIFIED, size: 22, lineSpacing: 260 }
  ),
  createP('وحيث أنه عن موضوع الدعوى :', {
    alignment: AlignmentType.RIGHT,
    bold: true,
    underline: true,
    size: 22,
  }),
  createP(
    'فلما كان النص في المادة ٥٤ من قانون الطفل رقم ١٢ لسنة ١٩٩٦ المعدل بالقانون رقم ١٢٦ لسنة ٢٠٠٨ قد جرى على أنه " التعليم حق لجميع الأطفال ... وتكون الولاية التعليمية على الطفل للحاضن ، وعند الخلاف على ما يحقق مصلحة الطفل الفضلى يرفع أي من ذوي الشأن الأمر إلى رئيس محكمة الأسرة بصفته قاضياً للأمور الوقتية ليصدر قراره بأمر على عريضة ... " . وكان من المقرر قانوناً وفقاً لنص المادة ٢١ من القانون رقم ١ لسنة ٢٠٠٠ وللقواعد العامة المقررة بأحكام محكمة النقض أن الأصل الشرعي والقانوني أن الولاية على الصغير في نفسه وماله – ومنها الولاية التعليمية – ثابتة بحكم القانون للأب بصفته الولي الطبيعي ، وأن إسناد الولاية التعليمية للحاضنة إنما شرع استثناءً في حالات النزاع والانفصال والفرقة الزوجية أو امتناع الأب وتعنته بما يضر بمصلحة الصغير الفضلى .',
    { alignment: AlignmentType.JUSTIFIED, size: 22, lineSpacing: 260 }
  ),

  // Judge Initials & Date at bottom of Page 1
  new Paragraph({
    alignment: AlignmentType.LEFT,
    bidirectional: true,
    spacing: { before: 80, after: 60 },
    children: [
      new TextRun({ text: 'تأشيرة القاضي:  م . ح   |   ٢٠٢٦/٦/٢٢', font: FONT_NAME, size: 22, bold: true }),
    ],
  }),

  // Footer
  buildFooterBar(1),
];

// ==========================================
// ASSEMBLE PAGE 2
// ==========================================
const page2Children = [
  buildHeader(true),
  buildDocTitle(true),
  ...buildCaseInfoBar(),
  buildMetaTable(),

  new Paragraph({ spacing: { before: 60, after: 40 } }),

  createP(
    'وحيث أنه بالبناء على ما تقدم ، وكان الثابت للمحكمة من مطالعة سائر أوراق الدعوى ومستنداتها وما دار بشأنها بجلسات المرافعة ، قيام العلاقة الزوجية ومساكنة الزوجية بين طرفي التداعي ( المدعية والمدعى عليه ) واستمرار رابطة الزوجية قائمة حقيقة وواقعاً بينهما حتى تاريخه ، ولم تقدم المدعية بالأوراق ثمة ما يفيد وقوع الطلاق أو انفصام عرى الزوجية أو وجود حكم قضائي بالفرقة بينهما ، كما خلت أوراق الدعوى ومستنداتها من ثمة دليل يقطع بتعنت المدعى عليه أو امتناعه أو إساءة استعماله لحق الولاية التعليمية المقرر له قانوناً وشرعاً على نجله الصغير ( معاذ ) ، أو امتناعه عن قيده بالمدارس المناسبة أو سداد مصروفاته الدراسية ، بل الثابت قيامه بواجبه الأبوي والتعليمي على الوجه الأكمل وحرصه التام على مصلحة نجله الفضلى ، ومن ثم تنتفي علة ومناط سلب أو نقل الولاية التعليمية من الأب صاحب الحق الأصيل الطبيعي والشرعي والقانوني ، الأمر الذي تكون معه دعوى المدعية قد أقيمت على غير سند صحيح من الواقع والقانون خليقة بالرفض ، وهو ما تقضي به المحكمة على نحو ما سيرد بالمنطوق .',
    { alignment: AlignmentType.JUSTIFIED, size: 22, lineSpacing: 260 }
  ),
  createP(
    'وحيث أنه وعن طلب النفاذ المعجل فالمحكمة ترى لا موجب له ومن ثم ترفضه مكتفية بايراد ذلك بالاسباب دون النص عليه بالمنطوق .',
    { alignment: AlignmentType.JUSTIFIED, size: 22, lineSpacing: 260 }
  ),
  createP(
    'وحيث أنه عن المصاريف شاملة اتعاب المحاماة فالمحكمة تلزم بها المدعية عملا بالمادة ١/١٨٤ من قانون المرافعات والمادة ١/١٨٧ من قانون المحاماة المعدل .',
    { alignment: AlignmentType.JUSTIFIED, size: 22, lineSpacing: 260 }
  ),

  // Operative Ruling
  new Paragraph({
    alignment: AlignmentType.CENTER,
    bidirectional: true,
    spacing: { before: 100, after: 60 },
    children: [
      new TextRun({ text: 'فلهذه الاسباب', font: FONT_NAME, size: 26, bold: true, underline: {} }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    bidirectional: true,
    spacing: { before: 60, after: 120 },
    children: [
      new TextRun({
        text: 'حكمت المحكمة : برفض الدعوى ، وألزمت المدعية بالمصاريف ومبلغ خمسة وسبعون جنيهاً مقابل أتعاب المحاماة .',
        font: FONT_NAME,
        size: 25,
        bold: true,
      }),
    ],
  }),

  // Judge Signature Block
  new Paragraph({
    alignment: AlignmentType.LEFT,
    bidirectional: true,
    spacing: { before: 120, after: 40 },
    children: [
      new TextRun({ text: 'رئيس المحكمة', font: FONT_NAME, size: 25, bold: true }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.LEFT,
    bidirectional: true,
    spacing: { before: 20, after: 40 },
    children: [
      new TextRun({ text: 'القاضي / ........................................', font: FONT_NAME, size: 24 }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.LEFT,
    bidirectional: true,
    spacing: { before: 20, after: 140 },
    children: [
      new TextRun({ text: 'التوقيع: ............................  ( ٢٠٢٦/٦/٢٢ )', font: FONT_NAME, size: 22 }),
    ],
  }),

  // Footer
  buildFooterBar(2),
];

// ==========================================
// ASSEMBLE PAGE 3
// ==========================================
const receiptTableBorders = {
  top: { style: BorderStyle.SINGLE, size: 10, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 10, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 10, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 10, color: '000000' },
  insideHorizontal: { style: BorderStyle.NONE },
  insideVertical: { style: BorderStyle.NONE },
};

const receiptBox = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: receiptTableBorders,
  rows: [
    new TableRow({
      children: [
        new TableCell({
          borders: receiptTableBorders,
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
              spacing: { before: 80, after: 40 },
              children: [
                new TextRun({
                  text: 'حررت هذه الصورة الرسمية بناء على الطلب بعد سداد الرسوم المقررة وقدرها  45.  جنيه بالقسيمة رقم  6466957',
                  font: FONT_NAME,
                  size: 24,
                  bold: true,
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
              spacing: { before: 20, after: 40 },
              children: [
                new TextRun({
                  text: 'ومقابل الخدمة الرقمية وقدره  20  جنيها          عدد النسخ  1          بإجمالي  20  جنيها',
                  font: FONT_NAME,
                  size: 24,
                  bold: true,
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
              spacing: { before: 0, after: 60 },
              children: [
                new TextRun({
                  text: 'بالقسيمة رقم  13020',
                  font: FONT_NAME,
                  size: 24,
                  bold: true,
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
              spacing: { before: 60, after: 80 },
              children: [
                new TextRun({
                  text: 'وقيدت برقم صور  2026-2516          بتاريخ  2026/07/15          رقم طلب الاستخراج  2026/9798',
                  font: FONT_NAME,
                  size: 24,
                  bold: true,
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  ],
});

// Staff Signatures Table (3 columns: رئيس القلم / الصور / المحرر)
const staffSignaturesTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
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
        // Left: رئيس القلم
        new TableCell({
          width: { size: 33, type: WidthType.PERCENTAGE },
          borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              bidirectional: true,
              spacing: { before: 80, after: 40 },
              children: [new TextRun({ text: 'رئيس القلم', font: FONT_NAME, size: 25, bold: true })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 40, after: 40 },
              children: [new TextRun({ text: '........................', font: FONT_NAME, size: 24 })],
            }),
          ],
        }),
        // Middle: الصور
        new TableCell({
          width: { size: 34, type: WidthType.PERCENTAGE },
          borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              bidirectional: true,
              spacing: { before: 80, after: 40 },
              children: [new TextRun({ text: 'الصور', font: FONT_NAME, size: 25, bold: true })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 40, after: 40 },
              children: [new TextRun({ text: '........................', font: FONT_NAME, size: 24 })],
            }),
          ],
        }),
        // Right: المحرر
        new TableCell({
          width: { size: 33, type: WidthType.PERCENTAGE },
          borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              bidirectional: true,
              spacing: { before: 80, after: 40 },
              children: [new TextRun({ text: 'المحرر', font: FONT_NAME, size: 25, bold: true })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              bidirectional: true,
              spacing: { before: 20, after: 40 },
              children: [new TextRun({ text: 'جمال الدين عبد النعيم موسى فرغلى', font: FONT_NAME, size: 23, bold: true })],
            }),
          ],
        }),
      ],
    }),
  ],
});

const page3Children = [
  buildHeader(true),
  buildDocTitle(true),
  new Paragraph({ spacing: { before: 60, after: 60 } }),
  receiptBox,
  new Paragraph({ spacing: { before: 80, after: 60 } }),
  staffSignaturesTable,
  // Spacing to push watermark or fill page
  new Paragraph({ spacing: { before: 2500, after: 100 } }),
  buildFooterBar(3),
];

// Document sections configuration with PageBorders
const pageProperties = {
  page: {
    margin: { top: 720, bottom: 720, left: 720, right: 720 }, // 0.5 in margins
    borders: {
      pageBorders: {
        top: { style: BorderStyle.SINGLE, size: 10, space: 15, color: '000000' },
        bottom: { style: BorderStyle.SINGLE, size: 10, space: 15, color: '000000' },
        left: { style: BorderStyle.SINGLE, size: 10, space: 15, color: '000000' },
        right: { style: BorderStyle.SINGLE, size: 10, space: 15, color: '000000' },
        offsetFrom: PageBorderOffsetFrom.PAGE,
      },
    },
  },
};

const doc = new Document({
  sections: [
    {
      properties: pageProperties,
      children: page1Children,
    },
    {
      properties: pageProperties,
      children: page2Children,
    },
    {
      properties: pageProperties,
      children: page3Children,
    },
  ],
});

// Paths to save
const desktopTarget = 'C:/Users/احمد منصور/Desktop/مسودة_حكم_ولاية_تعليمية_اسرة_الساحل_١٣٦٥_لسنة_٢٠٢٦_طبق_الأصل.docx';
const repoTarget = path.join(__dirname, '../الصياغات_القانونية_الخاصة/06_أبحاث_وقواعد_النقض/مسودة_حكم_ولاية_تعليمية_اسرة_الساحل_١٣٦٥_لسنة_٢٠٢٦_طبق_الأصل.docx');
const dTarget = 'D:/المذكرات القانونية/مسودة_حكم_ولاية_تعليمية_اسرة_الساحل_١٣٦٥_لسنة_٢٠٢٦_طبق_الأصل.docx';

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
