/**
 * توليد نموذج رسمي مطابق 100% للشكل الصوري والهندسي للنموذج المرفق:
 * - موضوع بالكامل داخل جدول بإطار خارجي وداخلي مطابق للنموذج.
 * - الترويسة العلوية، جدول البيانات الرسمي (بناء على الطلب المقدم من / مبروك نصر سعد البمبي).
 * - خلية جدول مسودة الحكم المحتوية على متن الأسباب والمنطوق وخانة التوقيعات.
 * - جدول الرسوم وتذييل الصورة الرسمية.
 * - جميع الأرقام هندية حصراً، خط Times New Roman.
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
  PageBorderOffsetFrom,
  PageBorderDisplay,
  PageBorderZOrder,
  ShadingType
} = require('docx');

const hindiDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
function toHindiDigits(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[0-9]/g, w => hindiDigits[+w]);
}

function buildExactTableJudgment() {
  const fontFamily = "Times New Roman";
  const blackColor = "000000";

  function p(text, opts = {}) {
    const isBold = opts.bold || false;
    const size = opts.size || 24; // 12pt
    const align = opts.align || AlignmentType.BOTH;
    const before = opts.before !== undefined ? opts.before : 30;
    const after = opts.after !== undefined ? opts.after : 30;
    const line = opts.line || 280;
    const convertedText = toHindiDigits(text);

    return new Paragraph({
      alignment: align,
      bidirectional: true,
      spacing: { before: before, after: after, line: line },
      children: [
        new TextRun({
          text: convertedText,
          font: fontFamily,
          size: size,
          bold: isBold,
          color: blackColor
        })
      ]
    });
  }

  function makeCell(children, widthPct, opts = {}) {
    const borders = opts.borders || {
      top: { style: BorderStyle.SINGLE, size: 4, color: blackColor },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: blackColor },
      left: { style: BorderStyle.SINGLE, size: 4, color: blackColor },
      right: { style: BorderStyle.SINGLE, size: 4, color: blackColor }
    };
    return new TableCell({
      width: { size: widthPct, type: WidthType.PERCENTAGE },
      verticalAlign: VerticalAlign.CENTER,
      shading: opts.isHeader ? { fill: "F2F2F2", type: ShadingType.CLEAR } : { fill: "FFFFFF", type: ShadingType.CLEAR },
      margins: opts.margins || { top: 60, bottom: 60, left: 100, right: 100 },
      borders: borders,
      children: children
    });
  }

  const docChildren = [];

  // ==========================
  // الجدول الرئيسي الشامل المحاكي للنموذج المرفق
  // ==========================

  // صف 1: الترويسة العلوية
  const rowHeader = new TableRow({
    children: [
      makeCell([
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          children: [
            new TextRun({ text: "موقع الطباعة: مجمع محاكم الساحل", font: fontFamily, size: 20, bold: true })
          ]
        })
      ], 40, {
        borders: {
          top: { style: BorderStyle.SINGLE, size: 8, color: blackColor },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.SINGLE, size: 8, color: blackColor }
        }
      }),
      makeCell([
        new Paragraph({
          alignment: AlignmentType.LEFT,
          bidirectional: true,
          children: [
            new TextRun({ text: "نيابة شمال القاهرة الكلية لشئون الاسرة\nنيابة الساحل الجزئية لشئون الاسرة", font: fontFamily, size: 22, bold: true })
          ]
        })
      ], 60, {
        borders: {
          top: { style: BorderStyle.SINGLE, size: 8, color: blackColor },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.SINGLE, size: 8, color: blackColor },
          right: { style: BorderStyle.NONE }
        }
      })
    ]
  });

  // صف 2: عنوان صورة رسمية من مستندات القضية
  const rowDocTitle = new TableRow({
    children: [
      makeCell([
        new Paragraph({
          alignment: AlignmentType.CENTER,
          bidirectional: true,
          spacing: { before: 40, after: 40 },
          children: [
            new TextRun({ text: "صورة رسمية من مستندات القضية", font: fontFamily, size: 28, bold: true, underline: { type: "single" } })
          ]
        })
      ], 100, {
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: blackColor },
          left: { style: BorderStyle.SINGLE, size: 8, color: blackColor },
          right: { style: BorderStyle.SINGLE, size: 8, color: blackColor }
        }
      })
    ]
  });

  // صف 3: بناء على الطلب المقدم من / مبروك نصر سعد البمبي
  const rowApplicant1 = new TableRow({
    children: [
      makeCell([
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          children: [
            new TextRun({ text: "بناء على الطلب المقدم من / مبروك نصر سعد البمبي", font: fontFamily, size: 26, bold: true })
          ]
        })
      ], 100, {
        borders: {
          top: { style: BorderStyle.SINGLE, size: 6, color: blackColor },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: blackColor },
          left: { style: BorderStyle.SINGLE, size: 8, color: blackColor },
          right: { style: BorderStyle.SINGLE, size: 8, color: blackColor }
        }
      })
    ]
  });

  // صف 4: العنوان والرقم القومي والجنسية
  const rowApplicant2 = new TableRow({
    children: [
      makeCell([
        new Paragraph({
          alignment: AlignmentType.BOTH,
          bidirectional: true,
          children: [
            new TextRun({ text: toHindiDigits("العنوان / الساحل - القاهرة                  رقم قومي 28609141701312                  الجنسية / مصرية"), font: fontFamily, size: 24, bold: true })
          ]
        })
      ], 100, {
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: blackColor },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: blackColor },
          left: { style: BorderStyle.SINGLE, size: 8, color: blackColor },
          right: { style: BorderStyle.SINGLE, size: 8, color: blackColor }
        }
      })
    ]
  });

  // صف 5: رقم القضية، جدول أسرة، النيابة الجزئية
  const rowCaseInfo = new TableRow({
    children: [
      makeCell([
        new Paragraph({
          alignment: AlignmentType.CENTER,
          bidirectional: true,
          children: [
            new TextRun({ text: toHindiDigits("نيابة الساحل الجزئية لشئون الاسرة               جدول أسرة متنوع               رقم القضية ١٣٦٥ لسنة ٢٠٢٦"), font: fontFamily, size: 24, bold: true })
          ]
        })
      ], 100, {
        borders: {
          top: { style: BorderStyle.SINGLE, size: 6, color: blackColor },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: blackColor },
          left: { style: BorderStyle.SINGLE, size: 8, color: blackColor },
          right: { style: BorderStyle.SINGLE, size: 8, color: blackColor }
        }
      })
    ]
  });

  // صف 6: الرقم الموحد
  const rowUnifiedNo = new TableRow({
    children: [
      makeCell([
        new Paragraph({
          alignment: AlignmentType.CENTER,
          bidirectional: true,
          children: [
            new TextRun({ text: toHindiDigits("الرقم الموحد: 2207220221225386"), font: fontFamily, size: 24, bold: true })
          ]
        })
      ], 100, {
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: blackColor },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: blackColor },
          left: { style: BorderStyle.SINGLE, size: 8, color: blackColor },
          right: { style: BorderStyle.SINGLE, size: 8, color: blackColor }
        }
      })
    ]
  });

  // صف 7: رؤوس جدول (نوع المستند / تاريخ تقديم المستند / مقدم المستند)
  const rowDocHeaders = new TableRow({
    children: [
      makeCell([
        new Paragraph({ alignment: AlignmentType.CENTER, bidirectional: true, children: [new TextRun({ text: "مقدم المستند", font: fontFamily, size: 22, bold: true })] })
      ], 33, { isHeader: true }),
      makeCell([
        new Paragraph({ alignment: AlignmentType.CENTER, bidirectional: true, children: [new TextRun({ text: "تاريخ تقديم المستند", font: fontFamily, size: 22, bold: true })] })
      ], 33, { isHeader: true }),
      makeCell([
        new Paragraph({ alignment: AlignmentType.CENTER, bidirectional: true, children: [new TextRun({ text: "نوع المستند", font: fontFamily, size: 22, bold: true })] })
      ], 34, { isHeader: true })
    ]
  });

  // صف 8: بيانات جدول المستند
  const rowDocValues = new TableRow({
    children: [
      makeCell([
        new Paragraph({ alignment: AlignmentType.CENTER, bidirectional: true, children: [new TextRun({ text: "المدعى عليه", font: fontFamily, size: 24, bold: true })] })
      ], 33),
      makeCell([
        new Paragraph({ alignment: AlignmentType.CENTER, bidirectional: true, children: [new TextRun({ text: toHindiDigits("جلسة    /    / ٢٠٢٦"), font: fontFamily, size: 24, bold: true })] })
      ], 33),
      makeCell([
        new Paragraph({ alignment: AlignmentType.CENTER, bidirectional: true, children: [new TextRun({ text: "مسودة الحكم", font: fontFamily, size: 26, bold: true })] })
      ], 34)
    ]
  });

  // ==========================
  // صف 9: الخلية الكبرى لمسودة الحكم (المطابقة لمتن النموذج)
  // ==========================
  const judgmentParagraphs = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { before: 80, after: 40 },
      children: [
        new TextRun({ text: toHindiDigits("مسودة بأسباب ومنطوق الحكم الصادر في الدعوى رقم ١٣٦٥ لسنة ٢٠٢٦ أسرة الساحل"), font: fontFamily, size: 26, bold: true })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { before: 0, after: 80 },
      children: [
        new TextRun({ text: toHindiDigits("والصادرة بجلسة    /    / ٢٠٢٦ م"), font: fontFamily, size: 24, bold: true })
      ]
    }),
    p("بعد سماع المرافعة ومطالعة الاوراق وسماع رأي النيابة العامة والمداولة قانوناً ..."),
    p("حيث تـتحصل وقائع الدعوى في أن المدعية أقامتها بموجب صحيفة أودعت قلم كتاب المحكمة بتاريخ    /    / ٢٠٢٦ وأعلنت قانوناً طلباً في ختامها الحكم: «بنقل وإثبات الولاية التعليمية للمدعية على ابنها الصغير (معاذ) ونقلها إليها من المدعى عليه (مبروك نصر سعد البمبي)، مع إلزام المدعى عليه بالمصروفات ومقابل اتعاب المحاماة والنفاذ المعجل»."),
    p("على سند من القول: إن المدعية زوجة للمدعى عليه بصحيح العقد الشرعي ورزقت منه على فراش الزوجية بالصغير (معاذ) وهو في سن التعليم، وزعمت بصحيفة دعواها وجود خلافات أدت إلى تعنت المدعى عليه وإهماله مصلحة الصغير التعليمية، الأمر الذي حدا بها لإقامة دعواها بغية الحكم لها بطلباتها سالفة الذكر."),
    p("وقدمت سنداً لدعواها حافظة مستندات طالعتها المحكمة وألمت بها أهم ما طويت عليها: صورة ضوئية من وثيقة عقد زواج المدعية من المدعى عليه، وصورة ضوئية من قيد ميلاد الصغير (معاذ)، وما يفيد اللجوء لمكتب تسوية المنازعات الأسرية."),
    p("وتداولت الدعوى بالجلسات أمام المحكمة ومثل كلا المدعيان بوكيل عنهما محامٍ وقدم المدعى عليه حافظة مستندات طويت على وثيقة عقد الزواج الثابت بها استمرار قيام الرابطة الزوجية، وما يفيد سداد المصروفات المدرسية للصغير (معاذ) وانتظامه بالدراسة، ودفع برفض الدعوى تأسيساً على استمرار العلاقة الزوجية ومساكنة الزوجية وعدم وجود أي إهمال لمصلحة الصغير."),
    p("وإذ أودع الخبيرين النفسي والاجتماعي تقريراً طالعته المحكمة، والنيابة فوضت الرأي للمحكمة، والمحكمة عرضت الصلح دون جدوى ... وبجلسة المرافعة الأخيرة قررت المحكمة حجز الدعوى للحكم لجلسة اليوم."),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      spacing: { before: 80, after: 40 },
      children: [
        new TextRun({ text: "وحيث إنه عن موضوع الدعوى:", font: fontFamily, size: 26, bold: true, underline: { type: "single" } })
      ]
    }),
    p("فلما كان من النص في المادة (٥٤/ فقرة ثانية) من قانون الطفل رقم ١٢ لسنة ١٩٩٦ المعدل بالقانون رقم ١٢٦ لسنة ٢٠٠٨ أنه: «التعليم حق لجميع الأطفال في مدارس الدولة بالمجان... وتكون الولاية التعليمية على الطفل للحاضن، وعند الخلاف على ما يحقق مصلحة الطفل الفضلى يرفع الأمر إلى رئيس محكمة الأسرة بصفته قاضياً للأمور الوقتية ليصدر قراره بأمر على عريضة، مراعياً مدى يسار ولي الأمر، وذلك دون الإخلال بحق الحاضن في الولاية التعليمية»."),
    p("ولما كان من المستقر عليه فقهاً وقضاءً أن الولاية على الصغير — ومنها الولاية التعليمية — تثبت أصلًا للأب بصفته الولي الطبيعي والشرعي والمسئول عن الإنفاق على الصغير وإعداده للحياة، ما دامت رابطة الزوجية قائمة والأسرة مستقرة بمسكن الزوجية المشترك؛ إذ تتكامل رعاية الأبوين للطفل تحت سقف واحد وتندمج واجبات الحضانة والرعاية."),
    p("وإن ما استحدثه المشرع بنص المادة (٥٤) سالفة البيان بجعل الولاية التعليمية للحاضن، إنما مناطه وغايته التشريعية حالات انفصام عرى الزوجية بالطلاق أو الخلع أو قيام فرقة فعلية مستمرة بين الزوجين واستقلال الحاضنة بمسكن مستقل؛ تيسيراً لشئون المحضون ومنعاً لتعنت ولي الأمر ومكايدته للحاضنة بتعطيل مسار الصغير الدراسي."),
    p("أما في حالة استمرار قيام الرابطة الزوجية حقيقةً وحكماً ومساكنة الزوجين بمسكن الزوجية؛ فإن الولاية التعليمية تظل ثابتة ومستقرة للأب بقوة القانون ولا تسلب منه إلا إذا ثبت قطعيّاً إهداره لمصلحة الصغير التعليمية أو تقصيره الجسيم فيها على نحو يهدد مستقبله الدراسي."),
    p("وحيث إنه لما كان ما تقدم، وهدياً به، وكان الثابت للمحكمة من مطالعة سائر أوراق الدعوى ومستنداتها وما حواه تقرير الخبيرين: قيام العلاقة الزوجية بين طرفي التداعي (المدعية والمدعى عليه) واستمرارها شرعاً وقانوناً دون انفصام، واستقرار مساكنة الزوجية، وقد خلت الأوراق تماماً من ثمة دليل يثبت تعنت المدعى عليه أو تقصيره في حق ابنه الصغير (معاذ) أو امتناعه عن سداد نفقاته الدراسية، بل ثبت انتظامه في دراسته وسداد مصروفاته واستقرار مساره التعليمي؛ وكان مجرد حصول خلافات عارضة بين الزوجين لا يسوغ بذاته سلب ولاية الأب التعليمية حال قيام الزوجية لما في ذلك من افتئات على ولايته الطبيعية وقوامته الشرعية؛ ومن ثم تضحى دعوى المدعية قد أقيمت على غير سند صحيح من الواقع أو القانون خليقة بالرفض، وهو ما تقضي به المحكمة على نحو ما سيرد بالمنطوق."),
    p("وحيث إنه عن المصاريف شاملة اتعاب المحاماة فالمحكمة تلزم بها المدعية عملاً بالمادة (١/١٨٤) من قانون المرافعات والمادة (١/١٨٧) من قانون المحاماة المعدل."),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { before: 80, after: 40 },
      children: [
        new TextRun({ text: "فلهذه الأسباب", font: fontFamily, size: 28, bold: true })
      ]
    }),
    p("حكمت المحكمة: برفض الدعوى، وألزمت المدعية بالمصاريف ومبلغ خمسة وسبعون جنيهاً مقابل أتعاب المحاماة.", {
      align: AlignmentType.CENTER,
      size: 26,
      bold: true,
      before: 40,
      after: 100
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { before: 100, after: 40 },
      children: [
        new TextRun({ text: "رئيس المحكمة", font: fontFamily, size: 26, bold: true })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { before: 0, after: 40 },
      children: [
        new TextRun({ text: "( ................................................ )", font: fontFamily, size: 22 })
      ]
    })
  ];

  const rowJudgmentContent = new TableRow({
    children: [
      makeCell(judgmentParagraphs, 100, {
        margins: { top: 100, bottom: 100, left: 140, right: 140 },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 6, color: blackColor },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: blackColor },
          left: { style: BorderStyle.SINGLE, size: 8, color: blackColor },
          right: { style: BorderStyle.SINGLE, size: 8, color: blackColor }
        }
      })
    ]
  });

  // ==========================
  // صف 10 و 11: تذييل الرسوم والمحرر ورئيس القلم طبقاً لصفحة 3 بالنموذج
  // ==========================
  const rowFees = new TableRow({
    children: [
      makeCell([
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          children: [
            new TextRun({
              text: toHindiDigits("حررت هذه الصورة الرسمية بناء على الطلب بعد سداد الرسوم المقررة وقدرها 45. جنيه بالقسيمة رقم 6466957\nومقابل الخدمة الرقمية وقدره 20 جنيها        عدد النسخ  1        بإجمالي 20 جنيها\nبالقسيمة رقم 13020"),
              font: fontFamily,
              size: 20,
              bold: true
            })
          ]
        })
      ], 100, {
        borders: {
          top: { style: BorderStyle.SINGLE, size: 6, color: blackColor },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: blackColor },
          left: { style: BorderStyle.SINGLE, size: 8, color: blackColor },
          right: { style: BorderStyle.SINGLE, size: 8, color: blackColor }
        }
      })
    ]
  });

  const rowSignatures = new TableRow({
    children: [
      makeCell([
        new Paragraph({
          alignment: AlignmentType.CENTER,
          bidirectional: true,
          children: [
            new TextRun({ text: "رئيس القلم                                                    الصور                                                    المحرر", font: fontFamily, size: 22, bold: true })
          ]
        })
      ], 100, {
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: blackColor },
          bottom: { style: BorderStyle.SINGLE, size: 8, color: blackColor },
          left: { style: BorderStyle.SINGLE, size: 8, color: blackColor },
          right: { style: BorderStyle.SINGLE, size: 8, color: blackColor }
        }
      })
    ]
  });

  // تجميع الجدول الكامل
  const mainMasterTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      rowHeader,
      rowDocTitle,
      rowApplicant1,
      rowApplicant2,
      rowCaseInfo,
      rowUnifiedNo,
      rowDocHeaders,
      rowDocValues,
      rowJudgmentContent,
      rowFees,
      rowSignatures
    ]
  });

  docChildren.push(mainMasterTable);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,    // 0.5 inch
              bottom: 720, // 0.5 inch
              left: 720,   // 0.5 inch
              right: 720   // 0.5 inch
            }
          }
        },
        children: docChildren
      }
    ]
  });

  return doc;
}

async function main() {
  console.log("Generating 100% exact boxed table court judgment replica...");
  const doc = buildExactTableJudgment();
  const buffer = await Packer.toBuffer(doc);

  const desktopPath1 = "C:\\Users\\احمد منصور\\Desktop\\مسودة_حكم_ولاية_تعليمية_اسرة_الساحل_١٣٦٥_لسنة_٢٠٢٦_النموذج_الرسمي_المطابق.docx";
  const desktopPath2 = "C:\\Users\\احمد منصور\\Desktop\\مسودة_حكم_ولاية_تعليمية_اسرة_الساحل_١٣٦٥_لسنة_٢٠٢٦.docx";
  const repoSpecialPath = "d:\\قانوني 7\\الصياغات_القانونية_الخاصة\\06_أبحاث_وقواعد_النقض\\مسودة_حكم_ولاية_تعليمية_اسرة_الساحل_١٣٦٥_لسنة_٢٠٢٦.docx";
  const dDrivePath = "D:\\المذكرات القانونية\\مسودة_حكم_ولاية_تعليمية_اسرة_الساحل_١٣٦٥_لسنة_٢٠٢٦.docx";

  // Write to Desktop with new official replica name
  fs.writeFileSync(desktopPath1, buffer);
  console.log("Successfully written to Desktop (Official Replica):", desktopPath1);

  try {
    fs.writeFileSync(desktopPath2, buffer);
    console.log("Successfully updated original Desktop file:", desktopPath2);
  } catch (e) {
    console.log("Original file on Desktop is currently open in Word, official replica saved alongside it.");
  }

  // Write to Repo special folder
  const repoDir = path.dirname(repoSpecialPath);
  if (!fs.existsSync(repoDir)) fs.mkdirSync(repoDir, { recursive: true });
  fs.writeFileSync(repoSpecialPath, buffer);
  console.log("Successfully written to Repo folder:", repoSpecialPath);

  // Write to D drive legal memos
  const dDir = path.dirname(dDrivePath);
  if (!fs.existsSync(dDir)) fs.mkdirSync(dDir, { recursive: true });
  fs.writeFileSync(dDrivePath, buffer);
  console.log("Successfully written to D-drive:", dDrivePath);

  console.log("All Exact Boxed Table DOCX files generated and saved successfully!");
}

main().catch(err => {
  console.error("Error generating boxed table court judgment document:", err);
  process.exit(1);
});
