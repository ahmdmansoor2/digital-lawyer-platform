/**
 * توليد مسودة حكم قضائي احترافية مطابقة تماماً للنموذج القضائي الاسترشادي المعتمد
 * لمحكمة الساحل الجزئية لشئون الأسرة - جدول أسرة متنوع
 * في الدعوى رقم ١٣٦٥ لسنة ٢٠٢٦ أسرة الساحل
 * المدعية: هانم عادل السيد مصطفى
 * المدعى عليه: مبروك نصر سعد البمبي
 * الصغير: معاذ مبروك نصر سعد البمبي
 * الموضوع: ولاية تعليمية
 * الحكم: رفض الدعوى لقيام العلاقة الزوجية ومساكنة الزوجية
 * بالتنسيق القضائي المعتمد: أرقام هندية حصراً، خط Times New Roman، إطار كامل، بدون تذييل، وإخراج لسطح المكتب
 */

const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  PageBorderOffsetFrom,
  PageBorderDisplay,
  PageBorderZOrder
} = require('docx');

const hindiDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
function toHindiDigits(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[0-9]/g, w => hindiDigits[+w]);
}

function buildCourtJudgmentExactDocument() {
  const fontFamily = "Times New Roman";
  const blackColor = "000000";

  function p(text, opts = {}) {
    const isBold = opts.bold || false;
    const size = opts.size || 32; // 16pt default
    const align = opts.align || AlignmentType.BOTH;
    const before = opts.before !== undefined ? opts.before : 80;
    const after = opts.after !== undefined ? opts.after : 80;
    const line = opts.line || 340;
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

  function heading(text) {
    const convertedText = toHindiDigits(text);
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { before: 200, after: 140, line: 360 },
      children: [
        new TextRun({
          text: convertedText,
          font: fontFamily,
          size: 34,
          bold: true,
          color: blackColor
        })
      ]
    });
  }

  function divider() {
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { before: 100, after: 100 },
      children: [
        new TextRun({
          text: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
          font: fontFamily,
          size: 20,
          color: "666666"
        })
      ]
    });
  }

  const docChildren = [];

  // عنوان مسودة الحكم طبقاً للنموذج الاسترشادي
  docChildren.push(
    p("مسودة بأسباب ومنطوق الحكم الصادر في الدعوى رقم ١٣٦٥ لسنة ٢٠٢٦ أسرة الساحل", {
      align: AlignmentType.CENTER,
      size: 34,
      bold: true,
      before: 0,
      after: 60
    }),
    p("جدول أسرة متنوع — محكمة الساحل الجزئية لشئون الأسرة", {
      align: AlignmentType.CENTER,
      size: 32,
      bold: true,
      before: 0,
      after: 60
    }),
    p("والصادرة بجلسة    /    / ٢٠٢٦ م", {
      align: AlignmentType.CENTER,
      size: 32,
      bold: true,
      before: 0,
      after: 140
    }),
    divider()
  );

  // ديباجة الجلسة والوقائع مطابقة تماماً لصياغة النموذج
  docChildren.push(
    p("بعد سماع المرافعة ومطالعة الأوراق وسماع رأي النيابة العامة والمداولة قانوناً ..."),
    p("حيث تـتحصل وقائع الدعوى في أن المدعية (هانم عادل السيد مصطفى) قد أقامتها بموجب صحيفة أودعت قلم كتاب المحكمة بتاريخ    /    / ٢٠٢٦ وأعلنت قانوناً طلباً في ختامها: «الحكم بإثبات ونقل الولاية التعليمية للمدعية على ابنها الصغير (معاذ) من المدعى عليه (مبروك نصر سعد البمبي)، مع إلزام المدعى عليه بالمصروفات ومقابل أتعاب المحاماة والنفاذ المعجل»."),
    p("على سند من القول: إن المدعية زوجة للمدعى عليه بصحيح العقد الشرعي الرسمي ورزقت منه على فراش الزوجية بالصغير (معاذ) وهو في سن التعليم، وزعمت بصحيفة دعواها وجود خلافات زوجية أدت إلى تعنت المدعى عليه وإهماله مصلحة الصغير التعليمية، الأمر الذي حدا بالمدعية إلى إقامة دعواها بغية الحكم لها بطلباتها سالفة الذكر."),
    p("وقدمت سندا لدعواها حافظة مستندات طالعتها المحكمة وألمت بها أهم ما طويت عليه: صورة ضوئية من وثيقة عقد زواج المدعية من المدعى عليه، وصورة ضوئية من شهادة ميلاد الصغير (معاذ)، وما يفيد اللجوء لمكتب تسوية المنازعات الأسرية بمحكمة الساحل."),
    p("وتداولت الدعوى بالجلسات أمام المحكمة على النحو الثابت بمحاضرها، ومثلت المدعية بوكيل عنها محامٍ، ومثل المدعى عليه بوكيل عنه محامٍ وقدم حافظة مستندات طويت على وثيقة عقد الزواج الثابت بها استمرار قيام الرابطة الزوجية، وما يفيد سداد المصروفات المدرسية للصغير (معاذ) وانتظامه بالدراسة، ودفع برفض الدعوى تأسيساً على استمرار العلاقة الزوجية ومساكنة الزوجية وعدم وجود أي إهمال لمصلحة الصغير."),
    p("وإذ أودع الخبيرين النفسي والاجتماعي تقريراً طالعته المحكمة، والنيابة فوضت الرأي للمحكمة، والمحكمة عرضت الصلح دون جدوى ... وبجلسة المرافعة الأخيرة قررت المحكمة حجز الدعوى للحكم لجلسة اليوم."),
    divider()
  );

  // حيثيات وأسباب الحكم
  docChildren.push(
    heading("وحيث إنه عن موضوع الدعوى:"),
    p("فلما كان من النص في المادة (٥٤/ فقرة ثانية) من القانون رقم ١٢ لسنة ١٩٩٦ المعدل بالقانون رقم ١٢٦ لسنة ٢٠٠٨ بشأن الطفل أنه: «التعليم حق لجميع الأطفال في مدارس الدولة بالمجان... وتكون الولاية التعليمية على الطفل للحاضن، وعند الخلاف على ما يحقق مصلحة الطفل الفضلى يرفع الأمر إلى رئيس محكمة الأسرة بصفته قاضياً للأمور الوقتية ليصدر قراره بأمر على عريضة، مراعياً مدى يسار ولي الأمر، وذلك دون الإخلال بحق الحاضن في الولاية التعليمية»."),
    p("ولما كان من المستقر عليه فقهاً وقضاءً أن الولاية على الصغير — ومنها الولاية التعليمية — تثبت أصلًا للأب بصفته الولي الطبيعي والشرعي والمسئول عن الإنفاق على الصغير وإعداده للحياة، ما دامت رابطة الزوجية قائمة والأسرة مستقرة بمسكن الزوجية المشترك؛ إذ تتكامل رعاية الأبوين للطفل تحت سقف واحد وتندمج واجبات الحضانة والرعاية."),
    p("وإن ما استحدثه المشرع بنص المادة (٥٤) سالفة البيان بجعل الولاية التعليمية للحاضن، إنما مناطه وغايته التشريعية حالات انفصام عرى الزوجية بالطلاق أو الخلع أو قيام فرقة فعلية مستمرة بين الزوجين واستقلال الحاضنة بمسكن مستقل؛ تيسيراً لشئون المحضون ومنعاً لتعنت ولي الأمر ومكايدته للحاضنة بتعطيل مسار الصغير الدراسي."),
    p("أما في حالة استمرار قيام الرابطة الزوجية حقيقةً وحكماً ومساكنة الزوجين بمسكن الزوجية؛ فإن الولاية التعليمية تظل ثابتة ومستقرة للأب بقوة القانون ولا تسلب منه إلا إذا ثبت قطعيّاً إهداره لمصلحة الصغير التعليمية أو تقصيره الجسيم فيها على نحو يهدد مستقبله الدراسي."),
    p("وحيث إنه لما كان ما تقدم، وهدياً به، وكان الثابت للمحكمة من مطالعة سائر أوراق الدعوى ومستنداتها وما حواه تقرير الخبيرين: قيام العلاقة الزوجية بين طرفي التداعي (المدعية والمدعى عليه) واستمرارها شرعاً وقانوناً دون انفصام، واستقرار مساكنة الزوجية، وقد خلت الأوراق تماماً من ثمة دليل يثبت تعنت المدعى عليه أو تقصيره في حق ابنه الصغير (معاذ) أو امتناعه عن سداد نفقاته الدراسية، بل ثبت انتظامه في دراسته وسداد مصروفاته واستقرار مساره التعليمي؛ وكان مجرد حصول خلافات عارضة بين الزوجين لا يسوغ بذاته سلب ولاية الأب التعليمية حال قيام الزوجية لما في ذلك من افتئات على ولايته الطبيعية وقوامته الشرعية؛ ومن ثم تضحى دعوى المدعية قد أقيمت على غير سند صحيح من الواقع أو القانون خليقة بالرفض، وهو ما تقضي به المحكمة على نحو ما سيرد بالمنطوق."),
    p("وحيث إنه عن المصاريف شاملة أتعاب المحاماة فالمحكمة تلزم بها المدعية عملاً بالمادة (١/١٨٤) من قانون المرافعات والمادة (١/١٨٧) من قانون المحاماة المعدل."),
    divider()
  );

  // المنطوق
  docChildren.push(
    heading("فلهذه الأسباب"),
    p("حكمت المحكمة: برفض الدعوى، وألزمت المدعية بالمصاريف وخمسة وسبعين جنيهاً مقابل أتعاب المحاماة.", {
      align: AlignmentType.CENTER,
      size: 34,
      bold: true,
      before: 120,
      after: 160
    }),
    divider(),
    p("رئيس المحكمة", {
      align: AlignmentType.CENTER,
      size: 32,
      bold: true,
      before: 180,
      after: 60
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              bottom: 1440,
              left: 1440,
              right: 1440
            },
            pageBorders: {
              offsetFrom: PageBorderOffsetFrom.PAGE,
              display: PageBorderDisplay.ALL_PAGES,
              zOrder: PageBorderZOrder.FRONT,
              top: { style: BorderStyle.SINGLE, size: 16, color: blackColor },
              bottom: { style: BorderStyle.SINGLE, size: 16, color: blackColor },
              left: { style: BorderStyle.SINGLE, size: 16, color: blackColor },
              right: { style: BorderStyle.SINGLE, size: 16, color: blackColor }
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
  console.log("Building exact replica Court Judgment Draft matching template...");
  const doc = buildCourtJudgmentExactDocument();
  const buffer = await Packer.toBuffer(doc);

  const desktopPath = "C:\\Users\\احمد منصور\\Desktop\\مسودة_حكم_ولاية_تعليمية_اسرة_الساحل_١٣٦٥_لسنة_٢٠٢٦.docx";
  const repoSpecialPath = "d:\\قانوني 7\\الصياغات_القانونية_الخاصة\\06_أبحاث_وقواعد_النقض\\مسودة_حكم_ولاية_تعليمية_اسرة_الساحل_١٣٦٥_لسنة_٢٠٢٦.docx";
  const dDrivePath = "D:\\المذكرات القانونية\\مسودة_حكم_ولاية_تعليمية_اسرة_الساحل_١٣٦٥_لسنة_٢٠٢٦.docx";

  // Write to Desktop
  fs.writeFileSync(desktopPath, buffer);
  console.log("Successfully written to Desktop:", desktopPath);

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

  console.log("All matching DOCX files generated and saved successfully!");
}

main().catch(err => {
  console.error("Error generating matching court judgment document:", err);
  process.exit(1);
});
