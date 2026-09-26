/**
 * توليد قالب شهادة استعلام عن قضايا - نسخة طبق الأصل 100% من الشهادة الرسمية
 * تطابق كامل: الإطار الخارجي، الشعار الأصلي، الخطوط، التنسيق، والجدول من اليمين لليسار
 */

const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  VerticalAlign,
  BorderStyle,
  ImageRun,
  UnderlineType
} = require('docx');

function createExactInquiryTemplate() {
  const fontFamily = "Arial"; // الخط الأصلي المستخدم في منظومة الحاسب الآلي للنيابة
  const logoPath = path.join(__dirname, 'prosecution_logo.png');
  const hasLogo = fs.existsSync(logoPath);

  // حدود الجدول السوداء الرفيعة المطابقة تماماً للأصل
  const blackBorder = {
    top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    right: { style: BorderStyle.SINGLE, size: 4, color: "000000" }
  };

  const noBorder = {
    top: { style: BorderStyle.NONE },
    bottom: { style: BorderStyle.NONE },
    left: { style: BorderStyle.NONE },
    right: { style: BorderStyle.NONE }
  };

  // رؤوس الأعمدة من اليمين إلى اليسار
  const headers = [
    "م",
    "رقم الدعوى",
    "السنة",
    "نوع الدعوى",
    "تاريخ القيد",
    "طرف أول",
    "طرف ثاني",
    "نوع الطلب",
    "اسم النيابه",
    "موقف آخر جلسه",
    "تاريخ آخر جلسه"
  ];

  // نسب عرض الأعمدة (مجموعها 100%)
  const colWidths = [4, 8, 6, 9, 10, 14, 14, 13, 11, 8, 8];

  const tableRows = [];

  // 1. صف رأس الجدول
  tableRows.push(
    new TableRow({
      tableHeader: true,
      children: headers.map((h, i) => new TableCell({
        width: { size: colWidths[i], type: WidthType.PERCENTAGE },
        borders: blackBorder,
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            children: [
              new TextRun({
                text: h,
                bold: true,
                size: 19, // 9.5pt
                font: fontFamily,
                rightToLeft: true,
                color: "000000"
              })
            ]
          })
        ]
      }))
    })
  );

  // 2. بيانات القضايا الأربع الأصلية من الشهادة
  const sampleData = [
    ["1", "278", "2022", "أسرة متنوع", "2022/01/29", "مبروك نصر سعد البمبى", "هانم عادل السيد", "رؤية صغار", "الدخيلة الجزئية لشئون الاسرة", "رفض الدعوى", "27-04-2022"],
    ["2", "1599", "2022", "أسرة متنوع", "2022/06/08", "نصر سعد شبل", "مبروك نصر سعد البمبى", "نفقة أقارب", "الدخيلة الجزئية لشئون الاسرة", "حكم قطعى", "26-07-2022"],
    ["3", "1600", "2022", "أسرة متنوع", "2022/06/08", "ساميه محمد احمد", "مبروك نصر سعد البمبى", "نفقة أقارب", "الدخيلة الجزئية لشئون الاسرة", "حكم قطعى", "26-07-2022"],
    ["4", "3867", "2022", "أسرة متنوع", "2022/12/25", "مبروك نصر سعد البمبى\nساميه محمد احمد", "هانم عادل السيد\nحسنه احمد ابراهيم", "ضم صغار للجدة للأب - سقوط حضانة", "الدخيلة الجزئية لشئون الاسرة", "حكم قطعى", "22-06-2023"]
  ];

  sampleData.forEach(row => {
    tableRows.push(
      new TableRow({
        children: row.map((cellText, i) => new TableCell({
          width: { size: colWidths[i], type: WidthType.PERCENTAGE },
          borders: blackBorder,
          verticalAlign: VerticalAlign.CENTER,
          children: cellText.split('\n').map(line => 
            new Paragraph({
              alignment: AlignmentType.CENTER,
              bidirectional: true,
              children: [
                new TextRun({
                  text: line,
                  size: 18, // 9pt
                  font: fontFamily,
                  rightToLeft: true,
                  color: "000000"
                })
              ],
              spacing: { after: 20 }
            })
          )
        }))
      })
    );
  });

  // 3. صفوف فارغة إضافية جاهزة للتعبئة
  for (let r = 5; r <= 8; r++) {
    tableRows.push(
      new TableRow({
        children: colWidths.map((w, colIdx) => new TableCell({
          width: { size: w, type: WidthType.PERCENTAGE },
          borders: blackBorder,
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              bidirectional: true,
              children: [
                new TextRun({
                  text: colIdx === 0 ? `${r}` : " ",
                  size: 18,
                  font: fontFamily,
                  rightToLeft: true,
                  color: "000000"
                })
              ]
            })
          ]
        }))
      })
    );
  }

  // جدول الترويسة العليا (يمين: النيابة / يسار: الشعار)
  const headerTable = new Table({
    visuallyRightToLeft: true,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          // الخلية اليمنى: اسم النيابة
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            borders: noBorder,
            verticalAlign: VerticalAlign.TOP,
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                children: [
                  new TextRun({
                    text: "نيابة  الاسكندرية الكلية لشئون الاسرة\n",
                    bold: true,
                    size: 22, // 11pt
                    font: fontFamily,
                    rightToLeft: true
                  }),
                  new TextRun({
                    text: "الدخيلة الجزئية لشئون الاسرة\n",
                    bold: true,
                    size: 22,
                    font: fontFamily,
                    rightToLeft: true
                  }),
                  new TextRun({
                    text: "(ولاية على النفس)",
                    size: 20,
                    font: fontFamily,
                    rightToLeft: true
                  })
                ]
              })
            ]
          }),
          // الخلية اليسرى: الشعار
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            borders: noBorder,
            verticalAlign: VerticalAlign.TOP,
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: hasLogo ? [
                  new ImageRun({
                    data: fs.readFileSync(logoPath),
                    transformation: { width: 70, height: 45 }
                  })
                ] : []
              })
            ]
          })
        ]
      })
    ]
  });

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 720,    // هوامش دقيقة تماثل الأصل (1.27 سم)
            bottom: 720,
            right: 800,
            left: 800
          },
          borders: {
            pageBorders: {
              top: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
              bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
              left: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
              right: { style: BorderStyle.SINGLE, size: 6, color: "000000" }
            }
          }
        }
      },
      children: [
        // رقم الإصدار أعلى اليمين
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({
              text: "Version 31/12/2023",
              size: 16, // 8pt
              font: fontFamily,
              color: "333333"
            })
          ],
          spacing: { after: 60 }
        }),

        // الترويسة (النيابة والشعار)
        headerTable,

        // العنوان الرئيسي مع خط تحته
        new Paragraph({
          alignment: AlignmentType.CENTER,
          bidirectional: true,
          children: [
            new TextRun({
              text: "شهاده إيجابيه بالاستعلام عن قضايا",
              bold: true,
              size: 34, // 17pt Bold
              font: fontFamily,
              rightToLeft: true,
              underline: { type: UnderlineType.SINGLE },
              color: "000000"
            })
          ],
          spacing: { before: 140, after: 180 }
        }),

        // بيانات الديباجة والاستعلام - مطابقة بالحرف للأصل
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          children: [
            new TextRun({ text: "بناء على الطلب المقدم من /     ", size: 22, font: fontFamily, rightToLeft: true }),
            new TextRun({ text: "مبروك نصر سعد البمبى          ", bold: true, size: 22, font: fontFamily, rightToLeft: true }),
            new TextRun({ text: "رقم قومى / ", size: 22, font: fontFamily, rightToLeft: true }),
            new TextRun({ text: "28609141701312\n", bold: true, size: 22, font: fontFamily, rightToLeft: true }),

            new TextRun({ text: "والراغب اعطاؤه شهادة بالاستعلام عن قضايا تبين الآتى :\n", size: 22, font: fontFamily, rightToLeft: true }),

            new TextRun({ text: "بالبحث على الحاسب الآلى بالقضايا المسجله بالرقم القومى / ", size: 22, font: fontFamily, rightToLeft: true }),
            new TextRun({ text: "28609141701312\n", bold: true, size: 22, font: fontFamily, rightToLeft: true }),

            new TextRun({ text: "من تاريخ ", size: 22, font: fontFamily, rightToLeft: true }),
            new TextRun({ text: "2017-01-01      ", bold: true, size: 22, font: fontFamily, rightToLeft: true }),
            new TextRun({ text: "الى تاريخ ", size: 22, font: fontFamily, rightToLeft: true }),
            new TextRun({ text: "2025-08-23\n", bold: true, size: 22, font: fontFamily, rightToLeft: true }),

            new TextRun({ text: "وتم الاستعلام بالرقم القومى فقط دون ادنى مسئولية على النيابة\n", size: 20, font: fontFamily, rightToLeft: true }),
            new TextRun({ text: "وقد استدل على قيد دعاوى سالف الذكر :\n", size: 22, font: fontFamily, rightToLeft: true })
          ],
          spacing: { line: 300, after: 100 }
        }),

        // الجدول الرئيسي المتطابق
        new Table({
          visuallyRightToLeft: true,
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows
        }),

        // بيانات تحرير الصورة والقسيمة أسفل الجدول
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          children: [
            new TextRun({ text: "\nحررت هذه الصورة بناء على الطلب\n", size: 22, font: fontFamily, rightToLeft: true }),
            new TextRun({ text: "بالقسيمة رقم   ", size: 22, font: fontFamily, rightToLeft: true }),
            new TextRun({ text: "24777\n", bold: true, size: 22, font: fontFamily, rightToLeft: true }),

            new TextRun({ text: "وقيدت برقم صور   ", size: 22, font: fontFamily, rightToLeft: true }),
            new TextRun({ text: "3139-2025      ", bold: true, size: 22, font: fontFamily, rightToLeft: true }),
            new TextRun({ text: "بتاريخ   ", size: 22, font: fontFamily, rightToLeft: true }),
            new TextRun({ text: "2025/08/23      ", bold: true, size: 22, font: fontFamily, rightToLeft: true }),
            new TextRun({ text: "رقم طلب الاستخراج   ", size: 22, font: fontFamily, rightToLeft: true }),
            new TextRun({ text: "2025/21004\n", bold: true, size: 22, font: fontFamily, rightToLeft: true }),

            new TextRun({ text: "بعد سداد الرسوم المقرره برقم مدفوعة   ", size: 22, font: fontFamily, rightToLeft: true }),
            new TextRun({ text: "8713106513121855243", bold: true, size: 22, font: fontFamily, rightToLeft: true })
          ],
          spacing: { before: 100, after: 120 }
        }),

        // شريط النظام أسفل الصفحة (System Footer Line)
        new Paragraph({
          alignment: AlignmentType.BOTH,
          bidirectional: true,
          children: [
            new TextRun({ text: "تاريخ 23/08/2025 9:15 AM      null      صفحه رقم 1 من 1      رقم الجهاز: family03.pgo.local/10", size: 16, font: fontFamily, color: "555555" })
          ],
          spacing: { before: 120 }
        })
      ]
    }]
  });

  const outputDir = path.join(__dirname, '..', 'الصياغات_القانونية_الخاصة', '02_صحف_الدعاوى');
  const outputPath = path.join(outputDir, 'قالب_شهادة_استعلام_عن_قضايا_الأصلي.docx');

  return Packer.toBuffer(doc).then(buffer => {
    fs.writeFileSync(outputPath, buffer);
    console.log(`✅ تم إنشاء المستند بنجاح: ${outputPath}`);

    // إخراج الملف وقصه فوراً إلى سطح المكتب
    const desktopPath = path.join(process.env.USERPROFILE || '', 'Desktop');
    if (fs.existsSync(desktopPath)) {
      const desktopDest = path.join(desktopPath, 'قالب_شهادة_استعلام_عن_قضايا.docx');
      fs.copyFileSync(outputPath, desktopDest);
      console.log(`🚀 تم تحديث النسخة المطابقة الأصلية على سطح المكتب: ${desktopDest}`);
    }

    return outputPath;
  });
}

createExactInquiryTemplate();
