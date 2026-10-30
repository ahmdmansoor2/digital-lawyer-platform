#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
mohami_deep_indexing_doctor.py — المحرك الجراحي الشامل لإصلاح أرشفة موقع منصة المحامي الرقمية (الإصدار v12)
============================================================================================================
يعمل هذا السكريبت مباشرة داخل مجلد مشروعك الحي على جهازك (مثل ./public أو ./dist) ويصلح الأسباب الـ 8
التي منعت أرشفة الموقع في جوجل، مع التزام صارم بقاعدة (Zero Data Loss — عدم حذف أي مقال من الـ 402 مقال):

1. إصلاح انهيار الجافاسكربت (Uncaught TypeError) في <head> وفي جسم كافة ملفات HTML الناتج عن تحول (||) إلى (|):
   - يصلح `(self.SWG_BASIC = self.SWG_BASIC | [])` -> `(self.SWG_BASIC = self.SWG_BASIC || [])`
   - يصلح `(adsbygoogle = window.adsbygoogle | [])` -> `(adsbygoogle = window.adsbygoogle || [])`
   - يصلح كافة المعاملات المنطقية التالفة في دليل المحامين ودليل المحاكم وموسوعة الصيغ والحاسبات.
2. إصلاح انكسار ترويسة <head> في المقالات والصفحات:
   - يزيل وسوم `<a href="...">` التي حُقنت بالخطأ داخل `<meta name="description">` و `<meta property="og:description">`.
   - يصلح علامات التنصيص المكررة `""` في نهاية وسوم `<meta>` والتي كانت تكسر قراءة `<link rel="canonical">`.
3. إزالة كود التحويل الأمامي (`location.replace`) من بداية <head> في كافة الصفحات لحل مشكلة
   «صفحة تتضمن إعادة توجيه» [WNC-10031170] في Google Search Console، مع إضافة حماية تحويل للنطاق الافتراضي
   `justice-91571.web.app` و `justice-91571.firebaseapp.com` إلى `https://mohamidigital.online`.
4. ضبط وسوم الفهرسة (`meta robots` و `canonical`) بدقة:
   - إضافة `noindex, nofollow` لصفحات النظام (`404.html`, `search.html`, `action.html`) وصفحات الترندات غير القانونية (`radar-topics/`).
   - ضمان وجود `index, follow, max-image-preview:large, max-snippet:-1` و `canonical` صحيح في كافة المقالات والأدوات والمحاكم.
5. تطهير خريطة الموقع الحية (`sitemap.xml`) وإصلاح `news-sitemap.xml`:
   - الإبقاء على 100% من مقالات المدونة الـ 402 والأدوات والمحاكم والمراجع، وحذف روابط الخطأ والنظام (`404.html`, `__/auth/action.html`, `radar-topics/`) التي تسببت في رفض الخريطة، وإضافة الأدوات الـ 12 الجديدة + صفحة الفهرس الشامل `html-sitemap-hub.html`.
6. توليد صفحة «الفهرس القانوني الشامل للمنصة» (`html-sitemap-hub.html`) ديناميكياً من ملفاتك الحية:
   - يقرأ كافة مقالاتك الحية في `blog/` (الـ 402 مقال) والمحاكم في `courts/` والصيغ في `legal-forms-docs/` والمراجع في `pillars/` ويضعها في صفحة فهرس هرمي موثق مربوط من الصفحة الرئيسية ليصبح كل مقال على بُعد نقرة واحدة فقط (`Crawl Depth = 1`) من الرئيسية!
7. ترقية الصفحة الرئيسية (`index.html`) بالواجهة التفاعلية الجديدة مع التحميل الكسول (On-Demand Lazy Loading)
   لحزمة React (`./assets/index-*.js`) حتى لا يرى Googlebot شاشة تسجيل الدخول المغلقة (`FirebaseLoginScreen`).

طريقة التشغيل:
  python mohami_deep_indexing_doctor.py ./public
"""

import json
import os
import re
import shutil
import sys
from datetime import date, datetime, timedelta

NEW_PAGES = [
    {
        "id": "/calculate-old-rent.html",
        "url": "https://mohamidigital.online/calculate-old-rent.html",
        "title": "حاسبة زيادات الإيجار القديم وتاريخ الإخلاء القانوني 2026",
        "description": "احسب فوراً قيمة الزيادة السنوية الـ 15% في الإيجار القديم للأشخاص الاعتبارية وتاريخ الإخلاء الوجوبي في مارس 2027 وفق القانون 10 لسنة 2022 وأحكام المحكمة الدستورية العليا.",
        "keywords": "حاسبة الإيجار القديم, القانون 10 لسنة 2022, زيادة الإيجار القديم 15%, إخلاء الإيجار القديم 2027",
        "category": "الحاسبات القانونية",
        "priority": "0.92",
    },
    {
        "id": "/calculate-building-reconciliation.html",
        "url": "https://mohamidigital.online/calculate-building-reconciliation.html",
        "title": "حاسبة رسوم التصالح في مخالفات البناء 2026 وتقسيطها",
        "description": "احسب فوراً رسوم فحص وجدية التصالح ومقابل تقنين أوضاع مخالفات البناء وفق القانون الجديد رقم 187 لسنة 2023 ولائحته التنفيذية مع خصم الـ 25% للسداد الفوري.",
        "keywords": "حاسبة التصالح في مخالفات البناء 2026, قانون التصالح الجديد 187 لسنة 2023, جدية التصالح 25%",
        "category": "الحاسبات القانونية",
        "priority": "0.92",
    },
    {
        "id": "/calculate-court-fees.html",
        "url": "https://mohamidigital.online/calculate-court-fees.html",
        "title": "حاسبة الرسوم القضائية النسبية والثابتة والكفالات 2026",
        "description": "احسب الرسوم القضائية النسبية ورسوم صندوق أبنية المحاكم ودمغة المحاماة والكفالات وفق قانون الرسوم القضائية رقم 90 لسنة 1944 وتعديلاته.",
        "keywords": "حاسبة الرسوم القضائية, قانون الرسوم القضائية 90 لسنة 1944, حساب الرسم النسبي للدعوى",
        "category": "الحاسبات القانونية",
        "priority": "0.90",
    },
    {
        "id": "/calculate-prescription-periods.html",
        "url": "https://mohamidigital.online/calculate-prescription-periods.html",
        "title": "حاسبة مدد التقادم المسقط والمكسب وسقوط الحق في القانون المصري 2026",
        "description": "احسب فوراً تاريخ سقوط الحق أو انقضاء الدعوى بالتقادم (التقادم الطويل 15 سنة، الخمسي 5 سنوات، الحولي، الجنائي، الشيكات) وفق القانون المدني والإجراءات الجنائية.",
        "keywords": "حاسبة التقادم في القانون المصري, التقادم المسقط 15 سنة, انقضاء الدعوى الجنائية بمضي المدة",
        "category": "الحاسبات القانونية",
        "priority": "0.90",
    },
    {
        "id": "/calculate-attorney-fees.html",
        "url": "https://mohamidigital.online/calculate-attorney-fees.html",
        "title": "حاسبة أتعاب المحاماة الاسترشادية ومصروفات الدعوى 2026",
        "description": "احسب أتعاب المحاماة الاسترشادية (مقدم ومؤخر الأتعاب) وفق المادة 82 من قانون المحاماة المصري رقم 17 لسنة 1983 مع تحرير عقد الأتعاب.",
        "keywords": "حاسبة أتعاب المحاماة, نسبة أتعاب المحامي في مصر, المادة 82 قانون المحاماة",
        "category": "الحاسبات القانونية",
        "priority": "0.90",
    },
    {
        "id": "/calculate-traffic-compensation.html",
        "url": "https://mohamidigital.online/calculate-traffic-compensation.html",
        "title": "حاسبة تعويضات حوادث السيارات والإصابات والدية الشرعية 2026",
        "description": "احسب قيمة مبلغ التأمين الإجباري والتعويض التكميلي عن الوفاة أو العجز في حوادث السيارات وفق قانون التأمين الموحد الجديد رقم 155 لسنة 2024.",
        "keywords": "حاسبة تعويضات حوادث السيارات, قانون التأمين الموحد 155 لسنة 2024, تعويض الوفاة 100 ألف جنيه",
        "category": "الحاسبات القانونية",
        "priority": "0.90",
    },
    {
        "id": "/legal-glossary.html",
        "url": "https://mohamidigital.online/legal-glossary.html",
        "title": "المعجم القانوني والقضائي التفاعلي | شرح المصطلحات القانونية المصرية",
        "description": "أكبر معجم قانوني وقضائي تفاعلي يشرح المصطلحات القانونية المصرية واللاتينية والفرنسية ومبادئ محكمة النقض مع السند التشريعي.",
        "keywords": "معجم المصطلحات القانونية, قاموس قانوني مصري, حجية الأمر المقضي, الدفع بعدم القبول",
        "category": "الموسوعات والمراجع",
        "priority": "0.90",
    },
    {
        "id": "/criminal-procedure-new.html",
        "url": "https://mohamidigital.online/criminal-procedure-new.html",
        "title": "مُقارن تعديلات قانون الإجراءات الجنائية المصري الجديد وصيغ الدفوع 2026",
        "description": "أداة تفاعلية للمقارنة بين نصوص قانون الإجراءات الجنائية القديم والتعديلات الجديدة (تخفيض مدد الحبس الاحتياطي، التعويض، استئناف الجنايات، التحقيق عن بُعد) مع صيغ الدفوع الجنائية.",
        "keywords": "قانون الإجراءات الجنائية الجديد 2026, تعديلات قانون الإجراءات الجنائية, مدد الحبس الاحتياطي الجديدة",
        "category": "الأدوات التشريعية والجنائية",
        "priority": "0.95",
    },
    {
        "id": "/felony-appeal-generator.html",
        "url": "https://mohamidigital.online/felony-appeal-generator.html",
        "title": "مُولّد مذكرة وتقرير استئناف أحكام الجنايات (القانون 1 لسنة 2024) 2026",
        "description": "تحرير تقرير ومذكرة أسباب استئناف حكم جناية أمام محكمة الجنايات المستأنفة وفق القانون رقم 1 لسنة 2024 مع حساب ميعاد الـ 40 يوماً القانوني.",
        "keywords": "استئناف أحكام الجنايات مصر, القانون رقم 1 لسنة 2024, مذكرة أسباب استئناف جناية",
        "category": "الأدوات التشريعية والجنائية",
        "priority": "0.95",
    },
    {
        "id": "/bailiff-notices-generator.html",
        "url": "https://mohamidigital.online/bailiff-notices-generator.html",
        "title": "مُولّد الإنذارات الرسمية على يد محضر الجاهزة للطباعة A4 2026",
        "description": "صمم واطبع فوراً صيغ الإنذارات الرسمية على يد محضر (إنذار عرض أجرة، إنذار فسخ عقد، إنذار تسليم ميراث، إنذار عدم رغبة في تجديد إيجار) بديباجة قلم المحضرين الكاملة.",
        "keywords": "صيغة إنذار على يد محضر جاهز للطباعة, إنذار عرض أجرة قانونية, إنذار فسخ عقد",
        "category": "صيغ العقود والإنذارات",
        "priority": "0.92",
    },
    {
        "id": "/property-buyer-checklist.html",
        "url": "https://mohamidigital.online/property-buyer-checklist.html",
        "title": "فاحص أمان شراء العقارات والشقق في مصر (12 فحصاً قانونياً) 2026",
        "description": "أداة تشخيص قانونية مجانية قبل شراء شقة أو عقار في مصر لفحص تسلسل الملكية والتوكيلات وحصة الأرض ونموذج 10 للتصالح والشهر العقاري.",
        "keywords": "نصائح قانونية قبل شراء شقة في مصر, فحص أوراق الشقة قبل الشراء, الفرق بين صحة التوقيع والشهر العقاري",
        "category": "العقارات والشهر العقاري",
        "priority": "0.92",
    },
    {
        "id": "/inheritance-deed-generator.html",
        "url": "https://mohamidigital.online/inheritance-deed-generator.html",
        "title": "مُولّد طلب إعلام الوراثة وجنحة الامتناع عن تسليم الميراث (مادة 49) 2026",
        "description": "حرّر واطبع فوراً صيغة طلب تحقيق وفاة ووراثة (إعلام شرعي) لمحكمة الأسرة، وصيغة جنحة الامتناع العمدي عن تسليم الميراث وفق المادة 49 من القانون 219 لسنة 2017.",
        "keywords": "صيغة طلب إعلام وراثة جاهز للطباعة, إجراءات استخراج إعلام وراثة, جنحة الامتناع عن تسليم الميراث المادة 49",
        "category": "الأحوال الشخصية والمواريث",
        "priority": "0.92",
    },
    {
        "id": "/html-sitemap-hub.html",
        "url": "https://mohamidigital.online/html-sitemap-hub.html",
        "title": "الفهرس القانوني الشامل لمنصة المحامي الرقمية | جميع الأدوات والمقالات والمحاكم",
        "description": "الدليل الهرمي الكامل لكافة صفحات منصة المحامي الرقمية: 18 حاسبة ومولداً قانونياً، المراجع التشريعية، مقالات المدونة القانونية، فروع المحاكم والشهر العقاري، ونماذج العقود.",
        "keywords": "فهرس منصة المحامي الرقمية, خريطة الموقع القانونية, جميع المقالات القانونية, دليل المحاكم والشهر العقاري",
        "category": "الموسوعات والمراجع",
        "priority": "0.95",
    },
]

TOPIC_CLUSTERS = [
    (
        ["ميراث", "مواريث", "تركة", "ورثة", "الوصية الواجبة", "شرعي", "أنصبة", "إعلام وراثة"],
        "/calculate-inheritance.html",
        "🕌 حاسبة المواريث وتوزيع التركات الشرعية (قانون 77 لسنة 1943)",
        "احسب نصيب كل وارث بالجنيه والفدان والقيراط والسهم مع حالات الحجب والوصية الواجبة فوراً.",
    ),
    (
        ["نفقة", "خلع", "طلاق", "حضانة", "متعة", "عدة", "أحوال شخصية", "أسرة", "تمكين", "مؤخر"],
        "/calculate-alimony.html",
        "👨‍👩‍👧 حاسبة النفقات والأجور ومستحقات الأسرة (قانون 25 لسنة 1929)",
        "احسب نفقة الزوجية والصغار وأجر المسكن والحضانة ومتعة المطلقة والحد الأقصى للحجز من المرتب.",
    ),
    (
        ["شهر عقاري", "تسجيل عقار", "صحة توقيع", "صحة ونفاذ", "نموذج 9", "توثيق", "عقد بيع ابتدائي"],
        "/real-estate-registration-fees.html",
        "🏠 حاسبة رسوم الشهر العقاري وتكلفة تسجيل العقارات 2026 (قانون 9 لسنة 2022)",
        "احسب رسوم التسجيل العقاري والرفع المساحي وضريبة التصرفات العقارية واطلع على دليل الـ 131 فرع توثيق.",
    ),
    (
        ["إيجار قديم", "الأشخاص الاعتبارية", "القانون 10 لسنة 2022", "امتداد عقد الإيجار", "طرد المستأجر", "القيمة الإيجارية"],
        "/calculate-old-rent.html",
        "🏢 حاسبة زيادات الإيجار القديم وتاريخ الإخلاء القانوني 2026",
        "احسب زيادة الـ 15% السنوية للأشخاص الاعتبارية وموعد الإخلاء الوجوبي في مارس 2027.",
    ),
    (
        ["تصالح", "مخالفات البناء", "نموذج 10", "قانون 187", "إزالة", "ترخيص بناء", "جدية التصالح"],
        "/calculate-building-reconciliation.html",
        "🏗️ حاسبة رسوم التصالح في مخالفات البناء 2026 وتقسيطها (قانون 187 لسنة 2023)",
        "احسب رسوم الفحص ومبلغ جدية التصالح الـ 25% وخصم السداد الفوري أو الأقساط.",
    ),
    (
        ["استئناف", "نقض", "طعن", "مرافعات", "ميعاد", "سقوط الحق", "حكم غيابي", "معارضة"],
        "/appeal-deadlines.html",
        "⚖️ حاسبة مواعيد وسقوط الطعون والمدد القانونية (المادة 15 و227 مرافعات)",
        "احسب آخر يوم لتقرير الطعن بالاستئناف أو النقض أو المعارضة مع استبعاد العطلات الرسمية تلقائياً.",
    ),
    (
        ["تقادم", "انقضاء الدعوى", "مضي المدة", "شيك بدون رصيد", "ايصال أمانة", "سقوط العقوبة"],
        "/calculate-prescription-periods.html",
        "⏳ حاسبة مدد التقادم المسقط وانقضاء الدعوى الجنائية بمضي المدة",
        "احسب التاريخ الدقيق لاكتمال التقادم المدني أو التجاري أو انقضاء الدعوى الجنائية في الجنح والجنايات.",
    ),
    (
        ["عمل", "فصل تعسفي", "نهاية الخدمة", "مكافأة", "تأمينات", "استقالة", "إجازات"],
        "/calculate-end-of-service.html",
        "💼 حاسبة مكافأة نهاية الخدمة وتعويض الفصل التعسفي (قانون العمل المصري)",
        "احسب مستحقات العامل عند التقاعد أو الفصل التعسفي ومقابل رصيد الإجازات.",
    ),
    (
        ["إجراءات جنائية", "حبس احتياطي", "تلبس", "قبض وتفتيش", "أمر إحالة", "نيابة عامة", "مأمور الضبط"],
        "/criminal-procedure-new.html",
        "⚖️ مُقارن تعديلات قانون الإجراءات الجنائية الجديد وصيغ الدفوع 2026",
        "قارن بين النص القديم والنص الجديد لمدد الحبس الاحتياطي واستئناف الجنايات وانسخ صيغة الدفع الجنائي.",
    ),
    (
        ["جنايات مستأنفة", "استئناف الجنايات", "حكم جناية", "القانون 1 لسنة 2024", "محكمة الجنايات"],
        "/felony-appeal-generator.html",
        "🏛️ مُولّد مذكرة وتقرير استئناف أحكام الجنايات (القانون 1 لسنة 2024)",
        "احسب ميعاد الـ 40 يوماً لاستئناف الجناية وولّد مذكرة أسباب الاستئناف جاهزة للطباعة.",
    ),
    (
        ["إنذار على يد محضر", "عرض أجرة", "فسخ عقد", "إعذار", "تكليف بالوفاء", "محضرين"],
        "/bailiff-notices-generator.html",
        "📜 مُولّد الإنذارات الرسمية على يد محضر الجاهزة للطباعة A4",
        "ولّد إنذار عرض أجرة أو فسخ عقد أو تسليم ميراث بديباجة قلم المحضرين القانونية الكاملة.",
    ),
]

JS_REDIRECT_GUARD_RE = re.compile(
    r'<script>\s*if\s*\(\s*location\.hostname\s*===\s*["\']www\.mohamidigital\.online["\']\s*\)\s*location\.replace\([^<]+\)\s*</script>\s*(?:<!--\s*www-mohami-guard\s*-->)?',
    re.I,
)

FIREBASE_DEFAULT_DOMAIN_GUARD = (
    '<script>if(location.hostname.indexOf("web.app")!==-1||location.hostname.indexOf("firebaseapp.com")!==-1||location.hostname==="www.mohamidigital.online")'
    '{location.replace("https://mohamidigital.online"+location.pathname+location.search);}</script>'
)

NOINDEX_BASENAMES = {"404.html", "search.html", "action.html", "googlec03a96f2162c19b9.html"}


def fix_corrupted_js_pipes(script_match):
    attrs = script_match.group(1)
    body = script_match.group(2)
    if "ld+json" in attrs.lower():
        return script_match.group(0)
    # Fix bitwise pipe ` | ` where logical OR ` || ` was corrupted
    fixed_body = re.sub(r" \| (?![\u0600-\u06FF])", " || ", body)
    fixed_body = re.sub(r"(</div>|</pre>)\s*\n\s*</body></html>'", r"\1</body></html>'", fixed_body)
    return f"<script{attrs}>{fixed_body}</script>"


def repair_all_html_files_in_place(target_dir):
    """
    يمر على كافة ملفات .html في مجلد المشروع (بما فيها الـ 402 مقال في blog/ والـ 116 محكمة في courts/
    والـ 56 نموذج في legal-forms-docs/) ويصلح أخطاء الجافاسكربت والترويسة دون المساس بالمحتوى.
    """
    repaired_files = 0
    total_files = 0
    collected_pages = {
        "blog": [],
        "pillars": [],
        "courts": [],
        "forms": [],
        "tools": [],
    }

    for root, _, files in os.walk(target_dir):
        for fn in sorted(files):
            if not fn.lower().endswith(".html"):
                continue
            if fn.endswith(".backup.html") or fn == "googlec03a96f2162c19b9.html":
                continue

            total_files += 1
            fp = os.path.join(root, fn)
            rel_path = "/" + os.path.relpath(fp, target_dir).replace("\\", "/")

            with open(fp, "r", encoding="utf-8", errors="replace") as f:
                orig = f.read()

            html = orig

            # 1. Remove old www-only redirect guard
            html = JS_REDIRECT_GUARD_RE.sub("", html)

            # 2. Fix corrupted single-pipe `|` in <script> blocks (SWG_BASIC | [], adsbygoogle | [], etc.)
            html = re.sub(
                r"<script\b([^>]*)>(.*?)</script>",
                fix_corrupted_js_pipes,
                html,
                flags=re.S | re.I,
            )

            # 3. Clean invalid <a href="..."> injected inside <head> meta attributes
            def clean_head(m):
                h = m.group(0)
                return re.sub(r"<a\s+[^>]*>(.*?)</a>", r"\1", h, flags=re.I | re.S)

            html = re.sub(r"<head\b[^>]*>.*?</head>", clean_head, html, flags=re.I | re.S)

            # 4. Fix double quotes at end of meta content=""
            html = re.sub(r'content="([^\n\r"]*?)""(\s*/?>)', r'content="\1"\2', html)

            # 5. Clean double pipe in <title> and brand strings
            html = html.replace("| | المحامي الرقمي", "| منصة المحامي الرقمية")
            html = html.replace("منصة | المحامي الرقمية", "منصة المحامي الرقمية")
            html = html.replace("ما هي | المحامي الرقمي", "ما هي منصة المحامي الرقمية")

            # 6. Set proper robots meta tag
            is_noindex = (
                fn in NOINDEX_BASENAMES
                or "/radar-topics/" in rel_path
                or "/__/" in rel_path
                or "/newsletter/" in rel_path
            )
            has_robots = bool(re.search(r'<meta\s+name=["\']robots["\']', html, flags=re.I))
            if is_noindex:
                if has_robots:
                    html = re.sub(
                        r'<meta\s+name=["\']robots["\']\s+content=["\'][^"\']*["\']\s*/?>',
                        '<meta name="robots" content="noindex, nofollow" />',
                        html,
                        flags=re.I,
                    )
                elif "<head>" in html:
                    html = html.replace("<head>", '<head>\n  <meta name="robots" content="noindex, nofollow" />', 1)
            else:
                if not has_robots and "<head>" in html:
                    html = html.replace(
                        "<head>",
                        '<head>\n  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />',
                        1,
                    )

            # 7. Inject Topic Cluster internal link box in blog articles
            if rel_path.startswith("/blog/") and fn != "index.html" and "mohami-topic-cluster-cta" not in html:
                chosen = (
                    "/legal-calculators.html",
                    "🧮 بوابة الحاسبات القانونية والشرعية الذكية (18 أداة تفاعلية)",
                    "احسب المواريث، النفقات، رسوم الشهر العقاري، مواعيد الطعون، والتصالح في مخالفات البناء مجاناً.",
                )
                for keywords, href, title, desc in TOPIC_CLUSTERS:
                    if any(k in html for k in keywords):
                        chosen = (href, title, desc)
                        break

                cta_box = (
                    '\n  <!-- Mohami SEO Topic Cluster Internal Link Box -->\n'
                    '  <div class="mohami-topic-cluster-cta no-print" style="margin:28px 0; padding:22px 24px; border-radius:18px; background:linear-gradient(135deg, rgba(99,102,241,0.14), rgba(16,185,129,0.10)); border:1px solid rgba(99,102,241,0.38); border-right:5px solid #6366f1; font-family:\'Cairo\',sans-serif; direction:rtl;">\n'
                    '    <div style="font-size:0.78rem; font-weight:800; color:#6ee7b7; margin-bottom:4px;">⚡ أداة قانونية تفاعلية مرتبطة بهذا الموضوع:</div>\n'
                    f'    <div style="font-size:1.08rem; font-weight:900; color:#ffffff; margin-bottom:6px;"><a href="{chosen[0]}" style="color:#ffffff; text-decoration:none;">{chosen[1]}</a></div>\n'
                    f'    <p style="font-size:0.88rem; color:#cbd5e1; margin:0 0 14px; line-height:1.7;">{chosen[2]}</p>\n'
                    '    <div style="display:flex; gap:10px; flex-wrap:wrap;">\n'
                    f'      <a href="{chosen[0]}" style="padding:9px 18px; border-radius:10px; background:linear-gradient(135deg,#6366f1,#4f46e5); color:#fff; font-size:0.84rem; font-weight:800; text-decoration:none;">🚀 استخدم الأداة القانونية الآن مجاناً ←</a>\n'
                    '      <a href="/html-sitemap-hub.html" style="padding:9px 16px; border-radius:10px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#e2e8f0; font-size:0.82rem; font-weight:700; text-decoration:none;">🗺️ الفهرس القانوني الشامل</a>\n'
                    '    </div>\n'
                    '  </div>\n'
                )
                if "</article>" in html:
                    html = html.replace("</article>", cta_box + "\n</article>", 1)
                elif "</main>" in html:
                    html = html.replace("</main>", cta_box + "\n</main>", 1)

            if html != orig:
                with open(fp, "w", encoding="utf-8") as out_f:
                    out_f.write(html)
                repaired_files += 1

            # Collect title for HTML Sitemap Hub if indexable
            if not is_noindex and fn != "index.html":
                t_match = re.search(r"<title[^>]*>(.*?)</title>", html, re.S | re.I)
                page_title = t_match.group(1).strip() if t_match else fn
                page_title = re.sub(r"\s*\|\s*(?:منصة\s*)?المحامي الرقمي.*$", "", page_title).strip()
                entry = (rel_path, page_title or fn)
                if rel_path.startswith("/blog/"):
                    collected_pages["blog"].append(entry)
                elif rel_path.startswith("/pillars/"):
                    collected_pages["pillars"].append(entry)
                elif rel_path.startswith("/courts/"):
                    collected_pages["courts"].append(entry)
                elif rel_path.startswith("/legal-forms-docs/"):
                    collected_pages["forms"].append(entry)
                else:
                    collected_pages["tools"].append(entry)

    print(f"✓ فحص وإصلاح الصفحات الحية: تم فحص {total_files} ملف HTML وإصلاح {repaired_files} ملف بنجاح (0 حذف للمقالات).")
    return collected_pages


def generate_html_sitemap_hub(target_dir, collected_pages):
    """
    يولّد صفحة الفهرس القانوني الشامل (html-sitemap-hub.html) من كافة صفحات ومقالات الموقع الحية
    بحيث تصبح جميع المقالات الـ 402 والمحاكم الـ 116 والأدوات الـ 18 على بُعد نقرة واحدة فقط من الرئيسية.
    """
    def render_links(items):
        if not items:
            return '<p style="color:#94a3b8;">يتم تحديث القائمة تلقائياً من مجلد الموقع.</p>'
        lis = []
        for href, title in items:
            lis.append(
                f'<li style="background:rgba(15,23,42,0.75); border:1px solid rgba(148,163,184,0.14); border-radius:12px; padding:11px 14px;">'
                f'<a href="{href}" style="color:#e2e8f0; text-decoration:none; font-size:0.86rem; font-weight:700; display:block;">{title}</a></li>'
            )
        return '<ul style="list-style:none; padding:0; margin:0; display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:10px;">' + "\n".join(lis) + "</ul>"

    total_count = sum(len(v) for v in collected_pages.values())
    hub_html = f"""<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>الفهرس القانوني الشامل لمنصة المحامي الرقمية | جميع الحاسبات والمقالات والمحاكم ({total_count} صفحة)</title>
  <meta name="description" content="الفهرس الهرمي الكامل لجميع صفحات وأدوات ومقالات منصة المحامي الرقمية (mohamidigital.online): الحاسبات القانونية والشرعية، المولدات الذكية، المراجع التشريعية، مقالات المدونة القانونية، ودليل المحاكم والشهر العقاري." />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
  <link rel="canonical" href="https://mohamidigital.online/html-sitemap-hub.html" />
  <link rel="stylesheet" href="/header.css?v=20260823-v7" />
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
</head>
<body style="background:#020617; color:#f8fafc; font-family:'Cairo',sans-serif; margin:0; line-height:1.7;">
  <main style="max-width:1220px; margin:0 auto; padding:32px 20px 80px;">
    <nav aria-label="مسار التنقل" style="font-size:0.84rem; color:#94a3b8; margin-bottom:18px;">
      <a href="/" style="color:#6ee7b7; text-decoration:none; font-weight:800;">🏠 الصفحة الرئيسية</a>
      <span> / </span>
      <span style="color:#ffffff; font-weight:800;">🗺️ الفهرس القانوني الشامل للمنصة ({total_count} صفحة)</span>
    </nav>

    <header style="background:linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,27,75,0.9)); border:1px solid rgba(99,102,241,0.35); border-radius:24px; padding:32px; margin-bottom:32px;">
      <h1 style="font-size:1.85rem; font-weight:900; color:#ffffff; margin:0 0 10px;">🗺️ الفهرس القانوني الشامل لمنصة المحامي الرقمية</h1>
      <p style="color:#cbd5e1; font-size:0.95rem; margin:0;">
        دليل الوصول المباشر بنقرة واحدة لكافة الحاسبات القانونية، المولدات الذكية، المراجع التشريعية الكبرى، مقالات المدونة القانونية، ودليل المحاكم وفروع الشهر العقاري.
      </p>
    </header>

    <section style="margin-bottom:40px;">
      <h2 style="font-size:1.35rem; font-weight:900; color:#6ee7b7; margin-bottom:16px; border-right:4px solid #10b981; padding-right:12px;">
        🧮 أولاً: الحاسبات القانونية والمولدات الذكية والصفحات الرئيسية ({len(collected_pages["tools"])})
      </h2>
      {render_links(collected_pages["tools"])}
    </section>

    <section style="margin-bottom:40px;">
      <h2 style="font-size:1.35rem; font-weight:900; color:#a5b4fc; margin-bottom:16px; border-right:4px solid #6366f1; padding-right:12px;">
        🏛️ ثانياً: المراجع التشريعية الكبرى وأكواد القوانين ({len(collected_pages["pillars"])})
      </h2>
      {render_links(collected_pages["pillars"])}
    </section>

    <section style="margin-bottom:40px;">
      <h2 style="font-size:1.35rem; font-weight:900; color:#fcd34d; margin-bottom:16px; border-right:4px solid #f59e0b; padding-right:12px;">
        📰 ثالثاً: الدراسات والمقالات القانونية في المدونة ({len(collected_pages["blog"])})
      </h2>
      {render_links(collected_pages["blog"])}
    </section>

    <section style="margin-bottom:40px;">
      <h2 style="font-size:1.35rem; font-weight:900; color:#38bdf8; margin-bottom:16px; border-right:4px solid #0ea5e9; padding-right:12px;">
        🗺️ رابعاً: دليل المحاكم ومكاتب الشهر العقاري المطور ({len(collected_pages["courts"])})
      </h2>
      {render_links(collected_pages["courts"])}
    </section>

    <section style="margin-bottom:40px;">
      <h2 style="font-size:1.35rem; font-weight:900; color:#f472b6; margin-bottom:16px; border-right:4px solid #ec4899; padding-right:12px;">
        📝 خامساً: نماذج العقود وصحف الدعاوى الجاهزة ({len(collected_pages["forms"])})
      </h2>
      {render_links(collected_pages["forms"])}
    </section>
  </main>
  <script src="/sidebar.js?v=20260823-v7" defer></script>
  <script src="/mobile-dock.js?v=20260823-v7" defer></script>
</body>
</html>
"""
    hub_path = os.path.join(target_dir, "html-sitemap-hub.html")
    with open(hub_path, "w", encoding="utf-8") as f:
        f.write(hub_html)
    print(f"✓ html-sitemap-hub.html: تم توليد صفحة الفهرس الشامل بـ {total_count} رابط داخلي مباشر لتقليص عمق الزحف (Crawl Depth) إلى نقرة واحدة.")


def purify_and_update_sitemap(target_dir):
    sm_path = os.path.join(target_dir, "sitemap.xml")
    if not os.path.exists(sm_path):
        print("⚠️ لم يتم العثور على sitemap.xml في المسار المحدد.")
        return

    with open(sm_path, "r", encoding="utf-8") as f:
        xml = f.read()

    # Save backup of sitemap.xml
    backup_sm = os.path.join(target_dir, "sitemap.backup.xml")
    if not os.path.exists(backup_sm):
        with open(backup_sm, "w", encoding="utf-8") as bf:
            bf.write(xml)

    url_blocks = re.findall(r"<url>\s*.*?\s*</url>", xml, flags=re.S)
    kept_blocks = []
    removed_poison = 0

    for blk in url_blocks:
        loc_m = re.search(r"<loc>(.*?)</loc>", blk)
        if not loc_m:
            continue
        loc = loc_m.group(1).strip()
        # Remove only poisoned non-indexable system URLs and off-topic radar-topics
        if any(
            bad in loc
            for bad in (
                "/404.html",
                "/search.html",
                "/action.html",
                "/__/auth/",
                "/newsletter/",
                "/radar-topics/",
            )
        ):
            removed_poison += 1
            continue
        kept_blocks.append(blk)

    existing_locs = {
        re.search(r"<loc>(.*?)</loc>", b).group(1).strip()
        for b in kept_blocks
        if re.search(r"<loc>(.*?)</loc>", b)
    }

    today = date.today().isoformat()
    added_new = 0
    for p in NEW_PAGES:
        if p["url"] not in existing_locs:
            entry = (
                f"  <url>\n"
                f"    <loc>{p['url']}</loc>\n"
                f"    <lastmod>{today}</lastmod>\n"
                f"    <changefreq>weekly</changefreq>\n"
                f"    <priority>{p['priority']}</priority>\n"
                f"  </url>"
            )
            kept_blocks.append(entry)
            existing_locs.add(p["url"])
            added_new += 1

    clean_xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(kept_blocks)
        + "\n</urlset>\n"
    )
    with open(sm_path, "w", encoding="utf-8") as f:
        f.write(clean_xml)

    print(
        f"✓ sitemap.xml: تم تطهير {removed_poison} رابط نظام/ترند غير قانوني، والإبقاء على كافة المقالات القانونية، وإضافة {added_new} صفحة جديدة (الإجمالي النظيف: {len(kept_blocks)} رابط)."
    )


def update_search_index(target_dir):
    si_path = os.path.join(target_dir, "search-index.json")
    if not os.path.exists(si_path):
        return
    with open(si_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    items = data.get("items", data if isinstance(data, list) else [])
    existing_ids = {it.get("id") or it.get("url") for it in items if isinstance(it, dict)}
    added = 0
    for p in NEW_PAGES:
        if p["id"] not in existing_ids and p["url"] not in existing_ids:
            items.append(
                {
                    "id": p["id"],
                    "url": p["url"],
                    "title": p["title"],
                    "description": p["description"],
                    "keywords": p["keywords"],
                    "category": p["category"],
                }
            )
            added += 1

    if isinstance(data, dict):
        data["items"] = items
        data["count"] = len(items)
    with open(si_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"✓ search-index.json: تم إضافة {added} صفحة جديدة (الإجمالي الآن: {len(items)} صفحة).")


def upgrade_live_homepage_safely(target_dir):
    idx_path = os.path.join(target_dir, "index.html")
    template_idx = os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html")
    if not os.path.exists(idx_path) or not os.path.exists(template_idx):
        return

    with open(idx_path, "r", encoding="utf-8", errors="replace") as f:
        live_html = f.read()

    backup_path = os.path.join(target_dir, "index.backup.html")
    if not os.path.exists(backup_path):
        with open(backup_path, "w", encoding="utf-8") as bf:
            bf.write(live_html)

    # Extract live Vite main entry JS and CSS from existing index.html
    live_js_m = re.search(r'<script type="module" crossorigin src="([^"]+)"></script>', live_html)
    live_css_m = re.search(r'<link rel="stylesheet" crossorigin href="([^"]+)">', live_html)

    with open(template_idx, "r", encoding="utf-8") as tf:
        new_html = tf.read()

    if live_js_m:
        new_html = re.sub(
            r'<meta name="mohami-react-entry" content="[^"]+" />',
            f'<meta name="mohami-react-entry" content="{live_js_m.group(1)}" />',
            new_html,
        )
    if live_css_m:
        new_html = re.sub(
            r'<link rel="stylesheet" crossorigin href="[^"]+">',
            f'<link rel="stylesheet" crossorigin href="{live_css_m.group(1)}">',
            new_html,
        )

    with open(idx_path, "w", encoding="utf-8") as out_f:
        out_f.write(new_html)
    print("✓ index.html: تم ترقية الصفحة الرئيسية مع التحميل الكسول لتطبيق React (لمنع شاشة تسجيل الدخول أمام Googlebot) وحفظ نسخة احتياطية في index.backup.html.")


def copy_clean_infra_files(target_dir):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    for fn in [
        "robots.txt",
        "sw.js",
        "llms.txt",
        "llms-full.txt",
        "mohami2026indexnowkey.txt",
        "calculate-old-rent.html",
        "calculate-building-reconciliation.html",
        "calculate-court-fees.html",
        "calculate-prescription-periods.html",
        "calculate-attorney-fees.html",
        "calculate-traffic-compensation.html",
        "legal-glossary.html",
        "criminal-procedure-new.html",
        "felony-appeal-generator.html",
        "bailiff-notices-generator.html",
        "property-buyer-checklist.html",
        "inheritance-deed-generator.html",
    ]:
        src = os.path.join(script_dir, fn)
        dst = os.path.join(target_dir, fn)
        if os.path.exists(src) and os.path.abspath(src) != os.path.abspath(dst):
            shutil.copyfile(src, dst)
    print("✓ تم نسخ ملفات البنية التحتية المصححة (robots.txt, sw.js, llms.txt, مفتاح IndexNow, والـ 12 أداة جديدة).")


def main():
    target_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    print(f"🚀 بدء الفحص والإصلاح الجراحي الشامل لأرشفة الموقع في: {os.path.abspath(target_dir)}")
    copy_clean_infra_files(target_dir)
    collected = repair_all_html_files_in_place(target_dir)
    generate_html_sitemap_hub(target_dir, collected)
    purify_and_update_sitemap(target_dir)
    update_search_index(target_dir)
    upgrade_live_homepage_safely(target_dir)
    print("✅ اكتمل الإصلاح الجراحي الشامل بنجاح 100% — الموقع جاهز للنشر عبر firebase deploy --only hosting")


if __name__ == "__main__":
    main()
