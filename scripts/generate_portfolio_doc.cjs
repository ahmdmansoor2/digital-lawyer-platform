const docx = require('docx');
const fs = require('fs');
const path = require('path');

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, Header, Footer, PageNumber,
  PageBorderOffsetFrom
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
    spacing: { before: 140, after: 140, line: 300 },
    children: [
      new TextRun({
        text: toArabicDigits(text),
        font: FONT_NAME,
        size: opts.size || 38,
        bold: true,
      }),
    ],
  });
}

function createHeadingP(text, opts = {}) {
  return new Paragraph({
    alignment: opts.alignment || AlignmentType.RIGHT,
    bidirectional: true,
    spacing: { before: 160, after: 80, line: 300 },
    children: [
      new TextRun({
        text: toArabicDigits(text),
        font: FONT_NAME,
        size: opts.size || 34,
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
        size: opts.size || 32,
        bold: opts.bold || false,
      }),
    ];
  } else if (Array.isArray(runs)) {
    textRuns = runs.map(r => {
      if (typeof r === 'string') {
        return new TextRun({
          text: toArabicDigits(r),
          font: FONT_NAME,
          size: opts.size || 32,
          bold: opts.bold || false,
        });
      }
      return new TextRun({
        text: toArabicDigits(r.text),
        font: FONT_NAME,
        size: r.size || opts.size || 32,
        bold: r.bold !== undefined ? r.bold : (opts.bold || false),
        underline: r.underline ? {} : undefined,
      });
    });
  }

  return new Paragraph({
    alignment: opts.alignment || AlignmentType.JUSTIFIED,
    bidirectional: true,
    spacing: { before: 80, after: 80, line: 320 },
    children: textRuns,
  });
}

function buildIndexTable() {
  const headers = ['م', 'اسم القانون / القرار / الكتاب الدوري', 'تاريخ وسند النشر بالجريدة الرسمية', 'مضمون الحجية القانونية'];
  const rowsData = [
    [
      '١',
      'القرار الوزاري رقم ٦١٥ لسنة ٢٠١٦',
      'الوقائع المصرية — العدد (٩٢ تابع) بتاريخ ١٩ / ٤ / ٢٠١٦ م',
      'المادة (٤) والمادة (٥): حصر البت والتسليم والاعتماد لوكيل الوزارة بالمديرية وحظر تعامل الإدارات الفرعية ببرج العرب مباشرة مع النيابة.'
    ],
    [
      '٢',
      'القرار الوزاري رقم ١٩١٩ لسنة ٢٠١٦',
      'الوقائع المصرية — العدد (٢٤٨ تابع) بتاريخ ٣ / ١١ / ٢٠١٦ م',
      'تعديل وإحكام ضوابط واشتراطات المشروعات وحماية الأراضي واللجان الفنية المركزية بالمديرية.'
    ],
    [
      '٣',
      'القرار الوزاري رقم ١٨٣٦ لسنة ٢٠١١',
      'الوقائع المصرية — العدد (٢٨٤) بتاريخ ١٧ / ١٢ / ٢٠١١ م',
      'تنظيم أجهزة حماية الأراضي وقصر تسليم أصول المعاينات للجهات القضائية على المستوى المركزي بالمديرية.'
    ],
    [
      '٤',
      'قانون الأراضي الصحراوية رقم ١٤٣ لسنة ١٩٨١',
      'الجريدة الرسمية — العدد (٣٥ مكرر) بتاريخ ٣١ / ٨ / ١٩٨١ م',
      'الولاية الحصرية للهيئة العامة لمشروعات التعمير والتنمية الزراعية على الأراضي الصحراوية وإلزامية خبير الهيئة بنطاق برج العرب.'
    ],
    [
      '٥',
      'قانون الزراعة رقم ٥٣ لسنة ١٩٦٦ وتعديلاته',
      'الجريدة الرسمية وتعديلاته بالقوانين ٧/٢٠١٨ و١٦٤/٢٠٢٢',
      'المادتان (١٥١) و(١٥٦): اختصاص مديرية الزراعة الحصري بالسلطة الرئاسية لحماية الأراضي والمتابعة القضائية.'
    ],
    [
      '٦',
      'قرار رئيس مجلس الوزراء رقم ١٨ لسنة ٢٠١٧',
      'الوقائع المصرية — العدد (٢٨١) بتاريخ ١٤ / ١٢ / ٢٠١٧ م',
      'اللائحة التنفيذية للقانون ١٤٤ لسنة ٢٠١٧ بشأن تقنين أراضي الدولة واختصاص لجان البت الفنية المركزية.'
    ],
    [
      '٧',
      'الكتاب الدوري رقم (١) لسنة ٢٠١٨ لوزير الزراعة',
      'ديوان عام وزارة الزراعة واستصلاح الأراضي',
      'حظر تسليم قرارات المعاينة إلا من خلال مديرية الزراعة بالمحافظة ممهورة بخاتم شعار الجمهورية.'
    ],
    [
      '٨',
      'الكتاب الدوري رقم (٥) لسنة ٢٠٢٠ لحماية الأراضي',
      'الإدارة المركزية لحماية الأراضي — وزارة الزراعة',
      'بطلان أي محضر أو قرار معاينة صادر من الإدارة الفرعية ببرج العرب دون اعتماده من وكيل الوزارة وإحالته للمحاكمة.'
    ],
    [
      '٩',
      'الكتاب الدوري رقم (١) لسنة ٢٠٢٢ لرئيس قطاع الخدمات',
      'قطاع الخدمات الزراعية والمتابعة — وزارة الزراعة',
      'المطابقة الإلزامية للمعاينات بمركز المتغيرات المكانية والتنسيق الملزم مع خبير هيئة التعمير.'
    ]
  ];

  const colWidths = [800, 3200, 2600, 3400]; // Total 10000

  const tableRows = [
    new TableRow({
      tableHeader: true,
      children: headers.map((h, i) => new TableCell({
        width: { size: colWidths[i], type: WidthType.DXA },
        shading: { fill: 'EAEAEA' },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            children: [new TextRun({ text: h, font: FONT_NAME, size: 26, bold: true })]
          })
        ]
      }))
    })
  ];

  rowsData.forEach(row => {
    tableRows.push(new TableRow({
      children: row.map((cellText, i) => new TableCell({
        width: { size: colWidths[i], type: WidthType.DXA },
        children: [
          new Paragraph({
            alignment: i === 0 ? AlignmentType.CENTER : AlignmentType.RIGHT,
            bidirectional: true,
            children: [new TextRun({ text: toArabicDigits(cellText), font: FONT_NAME, size: 24, bold: i === 1 })]
          })
        ]
      }))
    }));
  });

  return new Table({
    width: { size: 10000, type: WidthType.DXA },
    alignment: AlignmentType.CENTER,
    rows: tableRows,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
    }
  });
}

const docChildren = [
  createTitleP('جمهورية مصر العربية\nوزارة الزراعة واستصلاح الأراضي\nمديرية الزراعة بالإسكندرية\nالإدارة العامة للشئون القانونية', { size: 34 }),
  new Paragraph({ spacing: { before: 80, after: 80 } }),
  createTitleP('حافـظـــة مسـتـنـدات رسـمـيـــة', { size: 42 }),
  createHeadingP('مقدمة إلى: السيد الأستاذ المستشار / رئيس نيابة برج العرب الجزئية المحترم', { alignment: AlignmentType.CENTER }),
  createBodyP('رفق الخطاب الرسمي الصادر من مديرية الزراعة بالإسكندرية بتاريخ ٢٥ / ١٠ / ٢٠٢٦ م، تنفيذاً لقرار النيابة العامة الموقرة بشأن موافاتها بالتعليمات والقرارات المنظمة لتسليم قرارات ومحاضر المعاينة إلى مديرية الزراعة بالإسكندرية أو خبير الهيئة بدلاً من الإدارة الزراعية ببرج العرب القديم.', { bold: true, alignment: AlignmentType.CENTER }),
  new Paragraph({ spacing: { before: 100, after: 100 } }),
  createHeadingP('فهرس وبيان المستندات والصور الرسمية المودعة بالحافظة :', { underline: true }),
  buildIndexTable(),
  new Paragraph({ spacing: { before: 140, after: 100 } }),
  createBodyP('نشهد نحن مدير الإدارة العامة للشئون القانونية بمديرية الزراعة بالإسكندرية، بأن كافة القوانين والقرارات الوزارية واللوائح والكتب الدورية المودعة بهذه الحافظة هي صور رسمية مطابقة تماماً لأصولها المنشورة بالجريدة الرسمية والوقائع المصرية وسجلات الإدارة العامة لحماية الأراضي، وممهورة بخاتم شعار الجمهورية الخاص بالمديرية تحت بصر وبصيرة النيابة العامة الموقرة.', { bold: true }),
  new Paragraph({ spacing: { before: 120, after: 80 } }),
  new Table({
    width: { size: 10000, type: WidthType.DXA },
    alignment: AlignmentType.CENTER,
    borders: {
      top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE }
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 5000, type: WidthType.DXA },
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, bidirectional: true, children: [new TextRun({ text: 'يعتمــــد ،،،', font: FONT_NAME, size: 28, bold: true })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, bidirectional: true, children: [new TextRun({ text: 'وكيل وزارة الزراعة بالإسكندرية', font: FONT_NAME, size: 26, bold: true })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, bidirectional: true, children: [new TextRun({ text: '( مدير المديرية )', font: FONT_NAME, size: 24 })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, bidirectional: true, children: [new TextRun({ text: '............................................', font: FONT_NAME, size: 24 })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, bidirectional: true, children: [new TextRun({ text: '( خاتم شعار الجمهورية )', font: FONT_NAME, size: 24, bold: true })] }),
            ]
          }),
          new TableCell({
            width: { size: 5000, type: WidthType.DXA },
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, bidirectional: true, children: [new TextRun({ text: 'مُـودع الحافظة ومراجعها ،،،', font: FONT_NAME, size: 28, bold: true })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, bidirectional: true, children: [new TextRun({ text: 'مدير الإدارة العامة للشئون القانونية', font: FONT_NAME, size: 26, bold: true })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, bidirectional: true, children: [new TextRun({ text: 'المستشار / أحمد منصور', font: FONT_NAME, size: 26, bold: true })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, bidirectional: true, children: [new TextRun({ text: '............................................', font: FONT_NAME, size: 24 })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, bidirectional: true, children: [new TextRun({ text: 'تحريراً في: ٢٥ / ١٠ / ٢٠٢٦ م', font: FONT_NAME, size: 24, bold: true })] }),
            ]
          })
        ]
      })
    ]
  })
];

const doc = new Document({
  sections: [
    {
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          borders: {
            pageBorders: {
              top: { style: BorderStyle.SINGLE, size: 8, space: 18, color: '000000' },
              bottom: { style: BorderStyle.SINGLE, size: 8, space: 18, color: '000000' },
              left: { style: BorderStyle.SINGLE, size: 8, space: 18, color: '000000' },
              right: { style: BorderStyle.SINGLE, size: 8, space: 18, color: '000000' },
              offsetFrom: PageBorderOffsetFrom.PAGE,
            }
          }
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                children: [
                  new TextRun({ text: 'حافظة مستندات رسمية — مديرية الزراعة بالإسكندرية — مرفق لخطاب نيابة برج العرب', font: FONT_NAME, size: 20, bold: true })
                ]
              })
            ]
          })
        }
      },
      children: docChildren
    }
  ]
});

const targetPath = 'C:\\Users\\احمد منصور\\Desktop\\القرارات_والقوانين_الرسمية\\حافظة_مستندات_القرارات_والقوانين_الرسمية.docx';
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(targetPath, buf);
  console.log('Saved Portfolio Docx to:', targetPath);
}).catch(console.error);
