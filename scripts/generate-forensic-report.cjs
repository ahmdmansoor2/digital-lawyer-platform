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

function createP(text, opts = {}) {
  let runs = [];
  if (typeof text === 'string') {
    runs = [new TextRun({
      text: toArabicDigits(text),
      font: FONT_NAME,
      size: opts.size || 32, // 16pt
      bold: opts.bold || false,
      underline: opts.underline ? {} : undefined,
      color: opts.color || '000000',
    })];
  } else if (Array.isArray(text)) {
    runs = text.map(item => {
      if (typeof item === 'string') {
        return new TextRun({ text: toArabicDigits(item), font: FONT_NAME, size: opts.size || 32, bold: opts.bold || false });
      }
      return new TextRun({
        text: toArabicDigits(item.text),
        font: FONT_NAME,
        size: item.size || opts.size || 32,
        bold: item.bold !== undefined ? item.bold : (opts.bold || false),
        underline: item.underline ? {} : undefined,
        color: item.color || '000000',
      });
    });
  }

  return new Paragraph({
    alignment: opts.alignment || AlignmentType.RIGHT,
    bidirectional: true,
    spacing: {
      before: opts.spacingBefore !== undefined ? opts.spacingBefore : 80,
      after: opts.spacingAfter !== undefined ? opts.spacingAfter : 80,
      line: opts.line || 300, // 1.25 line spacing
    },
    children: runs,
  });
}

function generateForensicReportDocx(data, outputPath) {
  const tableBorders = {
    top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
    bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
    left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
    right: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
    insideVertical: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
  };

  // Build Metadata Header Table
  const metaRows = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          borders: tableBorders,
          children: [createP('رقم القضية: ' + data.caseNumber, { bold: true, size: 28, alignment: AlignmentType.CENTER })],
        }),
        new TableCell({
          width: { size: 40, type: WidthType.PERCENTAGE },
          borders: tableBorders,
          children: [createP('المحكمة المختصة: ' + data.court, { bold: true, size: 28, alignment: AlignmentType.CENTER })],
        }),
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          borders: tableBorders,
          children: [createP('الجهة الآمرة: ' + data.authority, { bold: true, size: 28, alignment: AlignmentType.CENTER })],
        }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          width: { size: 100, type: WidthType.PERCENTAGE },
          columnSpan: 3,
          borders: tableBorders,
          children: [
            createP('موضوع المأمورية: ' + data.mission, { bold: true, size: 28, alignment: AlignmentType.CENTER }),
          ],
        }),
      ],
    }),
  ];

  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows: metaRows,
  });

  // Build Comparison Matrix Table
  const compRows = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 35, type: WidthType.PERCENTAGE },
          borders: tableBorders,
          children: [createP('أوراق ونماذج المضاهاة الصحيحة', { bold: true, size: 26, alignment: AlignmentType.CENTER })],
        }),
        new TableCell({
          width: { size: 35, type: WidthType.PERCENTAGE },
          borders: tableBorders,
          children: [createP('المستند موضوع الفحص والطعن', { bold: true, size: 26, alignment: AlignmentType.CENTER })],
        }),
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          borders: tableBorders,
          children: [createP('العنصر الفني المفحوص', { bold: true, size: 26, alignment: AlignmentType.CENTER })],
        }),
      ],
    }),
  ];

  if (data.comparisonMatrix && Array.isArray(data.comparisonMatrix)) {
    data.comparisonMatrix.forEach(item => {
      compRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 35, type: WidthType.PERCENTAGE },
              borders: tableBorders,
              children: [createP(item.standard, { size: 26, alignment: AlignmentType.RIGHT })],
            }),
            new TableCell({
              width: { size: 35, type: WidthType.PERCENTAGE },
              borders: tableBorders,
              children: [createP(item.questioned, { size: 26, alignment: AlignmentType.RIGHT })],
            }),
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              borders: tableBorders,
              children: [createP(item.feature, { bold: true, size: 26, alignment: AlignmentType.RIGHT })],
            }),
          ],
        })
      );
    });
  }

  const compTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows: compRows,
  });

  const children = [
    // Top official header
    createP('جمهورية مصر العربية — وزارة العدل', { alignment: AlignmentType.CENTER, bold: true, size: 32 }),
    createP('مصلحة الطب الشرعي — إدارة أبحاث التزييف والتزوير', { alignment: AlignmentType.CENTER, bold: true, size: 30 }),
    createP('تقرير خبير فني قضائي معتمد', { alignment: AlignmentType.CENTER, bold: true, underline: true, size: 36 }),

    new Paragraph({ spacing: { before: 80, after: 80 } }),
    metaTable,
    new Paragraph({ spacing: { before: 80, after: 80 } }),

    // Section 1: Physical Evidence
    createP('أولاً: بيانات الحرز والمستندات المفحوصة (Evidence & Chain of Custody):', { bold: true, underline: true, size: 34 }),
    createP(data.evidenceDetails || 'تم استلام الحرز مغلقاً ومختوماً بخاتم النيابة العامة سليم الفض، وبفضه تبين احتواؤه على المستند موضوع الفحص ومستندات المضاهاة الرسمية.'),

    // Section 2: Laboratory Equipment
    createP('ثانياً: الأجهزة المعملية المستخدمة في الفحص (Laboratory Equipment):', { bold: true, underline: true, size: 34 }),
    createP(data.equipmentDetails || 'تم إجراء الفحص باستخدام الميكروسكوب المجسم المتطور (Stereomicroscope) بتكبيرات ضوئية متعددة، ومصادر إضاءة فوق بنفسجية (UV) وتحت حمراء (IR) ومقاييس ميكرومترية رقمية.'),

    // Section 3: Comparative Analysis & Matrix
    createP('ثالثاً: الفحص المجهري والمضاهاة الفنية المقارنة (Forensic Analysis):', { bold: true, underline: true, size: 34 }),
    createP(data.analysisDetails || 'بإجراء المضاهاة الفنية الدقيقة بين الخصائص الخطية للمستند المطعون فيه وتلك الثابتة بنماذج المضاهاة، تبيّن ما يلي:'),
    compTable,

    // Section 4: Forensic Discussion
    new Paragraph({ spacing: { before: 80, after: 80 } }),
    createP('رابعاً: المناقشة الفنية والتحليل التقريري (Forensic Discussion):', { bold: true, underline: true, size: 34 }),
    createP(data.discussionDetails || 'حيث أظهرت نتائج الفحص المجهري تبايناً جوهرياً في مسار حركة سن القلم ومستوى ضغط الكتابة، وتكرار التوقفات الشاذة غير المبررة، مما يقطع بانتفاء التلقائية في كتابة المحرر المطعون فيه.'),

    // Section 5: Definitive Conclusion
    new Paragraph({ spacing: { before: 80, after: 80 } }),
    createP('خامساً: النتيجة الفنية القاطعة (Definitive Forensic Conclusion):', { bold: true, underline: true, size: 36 }),
    createP([
      { text: 'بناءً على ما تقدم من فحص مجهري ومضاهاة فنية دقيقة، ننتهي بكل يقين إلى أن: ', bold: true },
      { text: data.conclusion || 'التوقيع موضوع الفحص هو توقيع مزور لم يصدر عن يد صاحبه.', bold: true, underline: true },
    ], { size: 34, alignment: AlignmentType.JUSTIFIED }),

    new Paragraph({ spacing: { before: 140, after: 100 } }),
    // Signature block
    createP('خبير أبحاث التزييف والتزوير المنتدب', { alignment: AlignmentType.LEFT, bold: true, size: 32 }),
    createP('المستشار / أحمد منصور', { alignment: AlignmentType.LEFT, bold: true, size: 34 }),
    createP('التوقيع: ........................................', { alignment: AlignmentType.LEFT, size: 30 }),
    createP('تحريراً في: ' + (data.reportDate || '٢٠٢٦/١٠/٢٣'), { alignment: AlignmentType.LEFT, size: 28 }),
  ];

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
                  new TextRun({ text: '  —  مصلحة الطب الشرعي / المستشار أحمد منصور خبير أبحاث التزييف والتزوير', font: FONT_NAME, size: 20, bold: true }),
                ],
              }),
            ],
          }),
        },
        children: children,
      },
    ],
  });

  return Packer.toBuffer(doc).then(buffer => {
    fs.writeFileSync(outputPath, buffer);
    console.log('Report saved to:', outputPath);
    return outputPath;
  });
}

module.exports = { generateForensicReportDocx };
