/**
 * أداة توليد مستندات Word الرسمية للمحاكم والصياغات القانونية (.docx)
 * مخصصة للمستشار أحمد منصور - الصياغات القانونية الخاصة
 */

const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, PageNumber, Footer } = require('docx');

function createLegalDocx({
  title = "صحيفة دعوى / مذكرة دفاع",
  subTitle = "مكتب الأستاذ أحمد منصور المحامي بالنقض والدستورية العليا",
  sections = [],
  fontFamily = "Times New Roman", // أو Arial حسب الاختيار
  outputPath = "document.docx"
}) {
  const docParagraphs = [];

  // ترويسة الصفحة الأولى
  docParagraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      children: [
        new TextRun({
          text: "بسم الله الرحمن الرحيم",
          bold: true,
          size: 28, // 14pt
          font: fontFamily,
          color: "1e293b"
        })
      ],
      spacing: { after: 140 }
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 40, // 20pt Bold للعنوان الرئيسي
          font: fontFamily,
          color: "0f172a"
        })
      ],
      spacing: { after: 100 }
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      children: [
        new TextRun({
          text: subTitle,
          size: 24, // 12pt
          font: fontFamily,
          color: "475569"
        })
      ],
      spacing: { after: 280 }
    })
  );

  // معالجة الأقسام والفقرات - المتن بحجم 16pt بالضبط (size: 32 في docx)
  for (const sec of sections) {
    if (sec.heading) {
      docParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          children: [
            new TextRun({
              text: sec.heading,
              bold: true,
              size: 36, // 18pt Bold للعناوين الداخلية
              font: fontFamily,
              color: "1e3a8a" // أزرق قضائي وقور
            })
          ],
          spacing: { before: 240, after: 120 }
        })
      );
    }

    if (Array.isArray(sec.paragraphs)) {
      for (const p of sec.paragraphs) {
        docParagraphs.push(
          new Paragraph({
            alignment: AlignmentType.BOTH, // محاذاة مضبوطة من الجانبين
            bidirectional: true,           // من اليمين إلى اليسار
            children: [
              new TextRun({
                text: p,
                size: 32, // 16pt خط المتن الإلزامي الدستوري
                font: fontFamily,
                color: "0f172a"
              })
            ],
            spacing: { line: 360, after: 140 } // تباعد أسطر مريح ومضبوط
          })
        );
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,    // 2.54 cm (1 inch)
              bottom: 1440,
              right: 1440,
              left: 1440
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
                  new TextRun({
                    children: ["صفحة ", PageNumber.CURRENT, " من ", PageNumber.TOTAL_PAGES],
                    font: fontFamily,
                    size: 22
                  })
                ]
              })
            ]
          })
        },
        children: docParagraphs
      }
    ]
  });

  return Packer.toBuffer(doc).then(buffer => {
    fs.writeFileSync(outputPath, buffer);
    console.log(`✅ تم إنشاء المستند بنجاح: ${outputPath}`);

    // إخراج نسخة إلى سطح المكتب مباشرة إذا طُلب ذلك
    const desktopPath = path.join(process.env.USERPROFILE || '', 'Desktop');
    if (fs.existsSync(desktopPath)) {
      const desktopDest = path.join(desktopPath, path.basename(outputPath));
      fs.copyFileSync(outputPath, desktopDest);
      console.log(`🚀 تم إخراج المستند إلى سطح المكتب: ${desktopDest}`);
    }

    return outputPath;
  });
}

module.exports = { createLegalDocx };
