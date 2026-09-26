/**
 * توليد خطابي العرض الرسميين في شأن إشكالية إجازة رعاية الطفل
 * الخطاب 1: لإدارة الفتوى للوزارات والمصالح العامة بالإسكندرية بمجلس الدولة (حي السفارات)
 * الخطاب 2: للشئون القانونية بمحافظة الإسكندرية للعرض على معالي المحافظ
 * تطبيقاً للقاعدة الدستورية الحادية عشرة
 */

const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  PageNumber,
  Footer,
  UnderlineType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle
} = require('docx');

function generateLettersDocx() {
  const fontFamily = "Times New Roman";

  const noBorder = {
    top: { style: BorderStyle.NONE },
    bottom: { style: BorderStyle.NONE },
    left: { style: BorderStyle.NONE },
    right: { style: BorderStyle.NONE }
  };

  const lineBorder = {
    top: { style: BorderStyle.NONE },
    bottom: { style: BorderStyle.SINGLE, size: 6, color: "1e3a8a" },
    left: { style: BorderStyle.NONE },
    right: { style: BorderStyle.NONE }
  };

  // ترويسة مديرية الزراعة بالإسكندرية
  function createLetterhead() {
    return new Table({
      visuallyRightToLeft: true,
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 60, type: WidthType.PERCENTAGE },
              borders: lineBorder,
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  bidirectional: true,
                  children: [
                    new TextRun({ text: "جمهورية مصر العربية\n", bold: true, size: 24, font: fontFamily, rightToLeft: true }),
                    new TextRun({ text: "محافظة الإسكندرية\n", bold: true, size: 24, font: fontFamily, rightToLeft: true }),
                    new TextRun({ text: "مديرية الزراعة بالإسكندرية\n", bold: true, size: 24, font: fontFamily, rightToLeft: true }),
                    new TextRun({ text: "الإدارة العامة للشئون القانونية", size: 22, font: fontFamily, rightToLeft: true, color: "1e3a8a" })
                  ],
                  spacing: { after: 120 }
                })
              ]
            }),
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              borders: lineBorder,
              children: [
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  bidirectional: true,
                  children: [
                    new TextRun({ text: "رقم الصادر: .......................\n", bold: true, size: 22, font: fontFamily, rightToLeft: true }),
                    new TextRun({ text: "التاريخ:       /   / 2026 م\n", bold: true, size: 22, font: fontFamily, rightToLeft: true }),
                    new TextRun({ text: "المرفقات: ملف مستندي كامل (18 ص)", size: 20, font: fontFamily, rightToLeft: true, color: "475569" })
                  ],
                  spacing: { after: 120 }
                })
              ]
            })
          ]
        })
      ]
    });
  }

  // تذييل التوقيعات الثلاثي الرسمي
  function createSignaturesBlock() {
    return new Paragraph({
      alignment: AlignmentType.BOTH,
      bidirectional: true,
      children: [
        new TextRun({
          text: "\nالباحث بالشئون القانونية                     مدير الإدارة العامة للشئون القانونية                     وكيل الوزارة - مدير مديرية الزراعة\n",
          bold: true,
          size: 26,
          font: fontFamily,
          rightToLeft: true
        }),
        new TextRun({
          text: "     ( .................... )                               ( أ / أحمد منصور )                                   ( د.م / أيمن حمودة )\n",
          bold: true,
          size: 26,
          font: fontFamily,
          rightToLeft: true,
          color: "1e3a8a"
        }),
        new TextRun({
          text: "                                                                                                                «خاتم شعار الجمهورية»",
          size: 22,
          font: fontFamily,
          rightToLeft: true,
          color: "64748b"
        })
      ],
      spacing: { before: 240, after: 200 }
    });
  }

  const docParagraphs = [
    // ==========================================
    // الخطاب الأول: إلى إدارة الفتوى بمجلس الدولة
    // ==========================================
    createLetterhead(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      children: [
        new TextRun({
          text: "\n( الخطاب الأول: الموجه لإدارة الفتوى المختصة بمجلس الدولة )",
          bold: true,
          size: 26,
          font: fontFamily,
          rightToLeft: true,
          color: "475569"
        })
      ],
      spacing: { after: 160 }
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      children: [
        new TextRun({ text: "السيد الأستاذ المستشار / نائب رئيس مجلس الدولة\n", bold: true, size: 34, font: fontFamily, rightToLeft: true, color: "0f172a" }),
        new TextRun({ text: "رئيس إدارة الفتوى للوزارات والمصالح العامة بالإسكندرية\n", bold: true, size: 34, font: fontFamily, rightToLeft: true, color: "1e3a8a" }),
        new TextRun({ text: "المقر المجمع الجديد لإدارات ولجان الفتوى: (9 حي السفارات — مدينة نصر — القاهرة)\n", bold: true, size: 26, font: fontFamily, rightToLeft: true, color: "334155" }),
        new TextRun({ text: "تحية طيبة وإجلالاً لشخصكم الكريم ولهيئتكم القضائية الموقرة، وبعد،،،\n", size: 30, font: fontFamily, rightToLeft: true })
      ],
      spacing: { after: 180 }
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      children: [
        new TextRun({
          text: "الموضوع: طلب إبداء الرأي القانوني في مدى مشروعية تجزئة وتكرار إجازة رعاية الطفل\nلأكثر من (3) مرات في ظل أحكام قانون الخدمة المدنية رقم 81 لسنة 2016 وقانون الطفل",
          bold: true,
          size: 32,
          font: fontFamily,
          rightToLeft: true,
          underline: { type: UnderlineType.SINGLE },
          color: "0f172a"
        })
      ],
      spacing: { after: 220 }
    }),
    new Paragraph({
      alignment: AlignmentType.BOTH,
      bidirectional: true,
      children: [
        new TextRun({
          text: "تتشرف مديرية الزراعة بالإسكندرية بأن تعرض على عدالة فضيلتكم الإشكالية القانونية والإدارية والمالية البالغة الأهمية التي أفرزها التطبيق العملي لنصوص إجازة رعاية الطفل، والتي لم تعد مجرد حالة فردية، بل تحولت إلى ظاهرة عامة تؤثر تأثيراً مباشراً على انتظام المرافق العامة، وترهق موازنة الدولة التأمينية وتخل بمبدأ المساواة وتكافؤ الفرص في أعباء الوظيفة العامة.\n",
          size: 32,
          font: fontFamily,
          rightToLeft: true
        }),
        new TextRun({
          text: "بيان الوقائع ومناط الإشكال:\n",
          bold: true,
          size: 32,
          font: fontFamily,
          rightToLeft: true,
          color: "1e3a8a"
        }),
        new TextRun({
          text: "فوجئت جهة الإدارة بتقدم بعض العاملات بمديرية الزراعة بالإسكندرية بطلبات للحصول على إجازات رعاية طفل متكررة ومتتالية لمدد قصيرة (تتراوح بين 3 أشهر و6 أشهر وسنة) عن أطفال متعددين أو لذات الطفل؛ مما أدى إلى حصول بعضهن على (7) و (8) قرارات إجازة رعاية طفل منفصلة طوال مدة خدمتهن، مستندات في ذلك إلى تأويل خاطئ يقضي بالاكتفاء بالسقف الزمني الإجمالي (6 سنوات) دون التقيد بالقيد العددي الصارم المحدد بـ (ثلاث مرات) طوال مدة الخدمة، والوارد بصريح نص المادة (72) من قانون الطفل رقم 12 لسنة 1996 المعدل بالقانون 126 لسنة 2008، والمحالة إليه صراحةً بموجب عجز المادة (53/ فقرة 3) من قانون الخدمة المدنية رقم 81 لسنة 2016.\n",
          size: 32,
          font: fontFamily,
          rightToLeft: true
        }),
        new TextRun({
          text: "وقد تجسدت هذه الإشكالية في واقعتين محددتين بالمديرية:\n",
          bold: true,
          size: 32,
          font: fontFamily,
          rightToLeft: true
        }),
        new TextRun({
          text: "1. الواقعة الأولى: السيدة / إلهام شهاب فرج — حصلت بالفعل على عدد (8) قرارات إجازة رعاية طفل بالمخالفة لقيد المرات الثلاث.\n2. الواقعة الثانية: السيدة / أسماء كمال إبراهيم — حصلت على عدد (7) قرارات إجازة رعاية طفل لذات السبب، ولجأت للجهاز المركزي للتنظيم والإدارة الذي استند لرأي قديم صادر عام 1982 في ظل قانون العاملين المدنيين الملغي رقم 47 لسنة 1978.\n",
          size: 32,
          font: fontFamily,
          rightToLeft: true
        }),
        new TextRun({
          text: "وحيث إنه إزاء هذا التضارب، فقد أعدت الإدارة العامة للشئون القانونية بالمديرية مذكرة موسوعية شاملة (مرفقة طيه بكامل مستنداتها في 18 صفحة)، تؤصل بالأسانيد الدستورية والتشريعية وأحكام المحكمة الإدارية العليا والاتفاقيات الدولية لوجوب الجمع الحتمي بين «القيد العددي: ثلاث مرات» و«القيد الزمني: ست سنوات مجتمعة»، وسقوط الرأي الصادر عام 1982 لتغير القانون الحاكم ومقتضيات النظام العام.\n",
          size: 32,
          font: fontFamily,
          rightToLeft: true
        }),
        new TextRun({
          text: "وحيث إنه سبق لمديرية الزراعة عرض هذا الموضوع على الجمعية العمومية لقسمي الفتوى والتشريع بمجلس الدولة، والتي أعادت الأوراق بكتاب رئيس مكتبها الفني المؤرخ 8/9/2026 لاتباع الإجراءات المقررة قانوناً في شأن رفع طلب الرأي.\n",
          size: 32,
          font: fontFamily,
          rightToLeft: true
        }),
        new TextRun({
          text: "بناءً عليه:\n",
          bold: true,
          size: 34,
          font: fontFamily,
          rightToLeft: true,
          color: "1e3a8a"
        }),
        new TextRun({
          text: "تلتمس مديرية الزراعة بالإسكندرية من سيادتكم —بحكم ولاية إدارتكم الموقرة المنصوص عليها في المادتين (58 و 65) من قانون مجلس الدولة رقم 47 لسنة 1972 ولائحته الداخلية— التفضل بالنظر، والتكرم بـ:\n",
          size: 32,
          font: fontFamily,
          rightToLeft: true
        }),
        new TextRun({
          text: "أولاً: إبداء الرأي القانوني الملزم في شأن مدى جواز استمرار منح العاملة إجازة رعاية طفل لعدد يجاوز (3 مرات) طوال مدة خدمتها متى كان مجموع المدد لم يتجاوز 6 سنوات، ومدى وجوب التزام جهة الإدارة بالقيدين معاً (العددي والزمني).\n",
          bold: true,
          size: 32,
          font: fontFamily,
          rightToLeft: true
        }),
        new TextRun({
          text: "ثانياً: وفي حال ما إذا رأيتم عدالتكم أن المسألة تمثل عدولاً عن مبدأ سابق صادر في ظل قوانين ملغاة أو إرساءً لمبدأ عام يمس كافة المصالح والوزارات، التفضل مشكورين بإحالة الموضوع إلى الجمعية العمومية لقسمي الفتوى والتشريع بمجلس الدولة طبقاً للقانون لإصدار فتوى عامة جامعة تحسم هذا اللبس على مستوى الجمهورية.\n",
          bold: true,
          size: 32,
          font: fontFamily,
          rightToLeft: true
        }),
        new TextRun({
          text: "مرفق طيه: أصل المذكرة القانونية الشاملة بوقائعها وأسانيدها الدستورية والدولية والقضائية وكافة المكاتبات السابقة.\nوتفضلوا بقبول فائق الاحترام والتقدير،،،",
          size: 32,
          font: fontFamily,
          rightToLeft: true
        })
      ],
      spacing: { line: 360, after: 140 }
    }),
    createSignaturesBlock(),

    // فاصـل بين الخطابين
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "\n----------------------------------------------------------------------------------------------------\n",
          color: "94a3b8"
        })
      ],
      spacing: { before: 200, after: 200 }
    }),

    // ==========================================
    // الخطاب الثاني: مذكرة عرض على معالي المحافظ
    // ==========================================
    createLetterhead(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      children: [
        new TextRun({
          text: "\n( الخطاب الثاني: مذكرة عرض رسمية للعرض على معالي المحافظ )",
          bold: true,
          size: 26,
          font: fontFamily,
          rightToLeft: true,
          color: "475569"
        })
      ],
      spacing: { after: 160 }
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
      children: [
        new TextRun({ text: "السيد الأستاذ / مدير عام الإدارة العامة للشئون القانونية بمحافظة الإسكندرية\n", bold: true, size: 34, font: fontFamily, rightToLeft: true, color: "0f172a" }),
        new TextRun({ text: "« للتفضل بالنظر ومراجعة الرأي والعرض على معالي السيد الفريق / محافظ الإسكندرية »\n", bold: true, size: 30, font: fontFamily, rightToLeft: true, color: "1e3a8a" }),
        new TextRun({ text: "تحية طيبة وتقدير عالي وبعد،،،\n", size: 30, font: fontFamily, rightToLeft: true })
      ],
      spacing: { after: 180 }
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      children: [
        new TextRun({
          text: "مذكرة عرض في شأن استيفاء الإجراءات الشكلية لطلب فتوى الجمعية العمومية لمجلس الدولة\nحول ضوابط قيد إجازة رعاية الطفل وحماية موازنة الدولة وانتظام سير المرافق العامة",
          bold: true,
          size: 32,
          font: fontFamily,
          rightToLeft: true,
          underline: { type: UnderlineType.SINGLE },
          color: "0f172a"
        })
      ],
      spacing: { after: 220 }
    }),
    new Paragraph({
      alignment: AlignmentType.BOTH,
      bidirectional: true,
      children: [
        new TextRun({
          text: "تتشرف مديرية الزراعة بالإسكندرية بأن ترفع لمعاليكم وللسيد الأستاذ الدكتور مدير عام الشئون القانونية بالمحافظة هذا العرض العاجل، لرفعه إلى معالي السيد الفريق / محافظ الإسكندرية، في شأن إشكالية تمس جوهر الانضباط الإداري وموازنة التأمينات الاجتماعية في كافة أحياء ومديريات المحافظة:\n",
          size: 32,
          font: fontFamily,
          rightToLeft: true
        }),
        new TextRun({
          text: "1. الإشكالية القانونية:\n",
          bold: true,
          size: 32,
          font: fontFamily,
          rightToLeft: true,
          color: "1e3a8a"
        }),
        new TextRun({
          text: "تزايدت في الآونة الأخيرة ظاهرة تجزئة إجازات رعاية الطفل بين العاملات بالمصالح الحكومية؛ حيث تعمد بعض العاملات إلى أخذ إجازات متقطعة لمدد وجيزة (3 أو 6 أشهر) والعودة لعدة أيام، ثم معاودة طلب الإجازة مرات ومرات، مما ترتب عليه بلوغ عدد قرارات الإجازة الممنوحة للعاملة الواحدة (7) و (8) قرارات متتالية، بالمخالفة الصريحة لقيد «ثلاث مرات طوال مدة الخدمة» الحاسم المنصوص عليه بالمادة (72) من قانون الطفل رقم 12 لسنة 1996 والمحالة إليه صراحةً بموجب المادة (53/3) من قانون الخدمة المدنية رقم 81 لسنة 2016.\n",
          size: 32,
          font: fontFamily,
          rightToLeft: true
        }),
        new TextRun({
          text: "2. الآثار السلبية والمالية المترتبة:\n",
          bold: true,
          size: 32,
          font: fontFamily,
          rightToLeft: true,
          color: "1e3a8a"
        }),
        new TextRun({
          text: "يترتب على هذا المسلك تعطيل متكرر ومفاجئ لدواليب العمل، وتكليف الزملاء بأعباء إضافية تفوق طاقتهم، وتجميد الوظائف دون إمكانية التعاقد مع بدائل مستقرة، فضلاً عن إرهاق الخزانة العامة والموازنة المخصصة للمديرية بتحمل كامل اشتراكات التأمين الاجتماعي المستحقة عن العاملة وصاحب العمل طوال مدد تلك الإجازات المتعاقبة دون حد أقصى للعدد.\n",
          size: 32,
          font: fontFamily,
          rightToLeft: true
        }),
        new TextRun({
          text: "3. العقبة الشكلية وتوجيه الجمعية العمومية لمجلس الدولة:\n",
          bold: true,
          size: 32,
          font: fontFamily,
          rightToLeft: true,
          color: "1e3a8a"
        }),
        new TextRun({
          text: "قامت مديرية الزراعة بإعداد دراسة ومذكرة قضائية موسوعية مدعمة بأحكام الإدارية العليا والاتفاقيات الدولية (مرفقة طيه)، وخاطبت بها الجمعية العمومية لقسمي الفتوى والتشريع بمجلس الدولة لإصدار فتوى جامعة وملزمة تسد باب هذا التحايل. وقد ورد كتاب السيد المستشار رئيس المكتب الفني للجمعية العمومية لمجلس الدولة المؤرخ 8/9/2026 (مرفق صورة منه) موضحاً أن المادة (66/ فقرة أ) من قانون مجلس الدولة رقم 47 لسنة 1972 تحصر حق طلب الرأي من الجمعية العمومية في (السادة الوزراء ورؤساء الهيئات)، وموجهاً باستيفاء الإجراء الشكلي برفع الطلب من خلال المختص دستورياً وقانونياً.\n",
          size: 32,
          font: fontFamily,
          rightToLeft: true
        }),
        new TextRun({
          text: "وحيث إن معالي السيد الفريق / محافظ الإسكندرية هو السلطة التنفيذية العليا بالمحافظة، والمختص بتمثيل المحافظة ورعاية مصالحها ومخاطبة الوزراء ورئيس مجلس الوزراء في المسائل ذات الأهمية العامة المشتركة طبقاً لقانون الإدارة المحلية رقم 43 لسنة 1979؛\n",
          size: 32,
          font: fontFamily,
          rightToLeft: true
        }),
        new TextRun({
          text: "لــــــذلك،،،\n",
          bold: true,
          size: 34,
          font: fontFamily,
          rightToLeft: true,
          color: "1e3a8a"
        }),
        new TextRun({
          text: "تتشرف مديرية الزراعة بالإسكندرية برفع الأوراق لسيادتكم، متمنيةً التكرم بالموافقة على الآتي:\n",
          size: 32,
          font: fontFamily,
          rightToLeft: true
        }),
        new TextRun({
          text: "1. التفضل بعرض المذكرة ومرفقاتها على معالي السيد الفريق / محافظ الإسكندرية للنظر والاعتماد.\n",
          bold: true,
          size: 32,
          font: fontFamily,
          rightToLeft: true
        }),
        new TextRun({
          text: "2. تفضل معالي الوزير المحافظ بمخاطبة السيد الأستاذ المستشار / رئيس الجمعية العمومية لقسمي الفتوى والتشريع بمجلس الدولة مباشرةً، أو التكرم بإحالة الطلب إلى السيد الأستاذ الدكتور / وزير التنمية المحلية أو السيد الأستاذ الدكتور / وزير الزراعة واستصلاح الأراضي، لطلب إبداء الرأي من الجمعية العمومية الموقرة رسمياً إعمالاً لحكم المادة (66/ أ) من قانون مجلس الدولة.\n",
          bold: true,
          size: 32,
          font: fontFamily,
          rightToLeft: true
        }),
        new TextRun({
          text: "المرفقات: أصل المذكرة القانونية الكبرى (15 صفحة) + صورة كتاب الجمعية العمومية لمجلس الدولة المؤرخ 8/9/2026 + حافظة المستندات والوقائع.\nوتفضلوا بقبول فائق الاحترام والتقدير،،،",
          size: 32,
          font: fontFamily,
          rightToLeft: true
        })
      ],
      spacing: { line: 360, after: 140 }
    }),
    createSignaturesBlock()
  ];

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440,    // 2.54 cm
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
                  text: "صفحة ",
                  font: fontFamily,
                  rightToLeft: true,
                  size: 22
                }),
                new TextRun({
                  children: [PageNumber.CURRENT],
                  font: fontFamily,
                  size: 22
                }),
                new TextRun({
                  text: " من ",
                  font: fontFamily,
                  rightToLeft: true,
                  size: 22
                }),
                new TextRun({
                  children: [PageNumber.TOTAL_PAGES],
                  font: fontFamily,
                  size: 22
                })
              ]
            })
          ]
        })
      },
      children: docParagraphs
    }]
  });

  const outputPaths = [
    path.join('D:/المذكرات القانونية', 'خطابات_عرض_فتوى_إجازة_رعاية_الطفل.docx'),
    path.join(__dirname, '..', 'الصياغات_القانونية_الخاصة', '05_الإنذارات_والإخطارات_الرسمية', 'خطابات_عرض_فتوى_إجازة_رعاية_الطفل.docx')
  ];

  return Packer.toBuffer(doc).then(buffer => {
    outputPaths.forEach(p => {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(p, buffer);
      console.log(`✅ تم حفظ ملف الخطابات في: ${p}`);
    });

    const desktopPath = path.join(process.env.USERPROFILE || '', 'Desktop');
    if (fs.existsSync(desktopPath)) {
      const desktopDest = path.join(desktopPath, 'خطابات_عرض_فتوى_إجازة_رعاية_الطفل.docx');
      fs.copyFileSync(outputPaths[0], desktopDest);
      console.log(`🚀 تم إخراج ملف الخطابات فوراً إلى سطح المكتب: ${desktopDest}`);
    }

    return outputPaths[0];
  });
}

generateLettersDocx();
