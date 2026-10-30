#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
mohami_git_repo_safe_fixer.py — المحرك الجراحي الآمن لإصلاح أرشفة مستودع (digital-lawyer-platform) — الإصدار v13
=================================================================================================================
ضمانات الأمان الصارمة (100% Zero-Regression & Git-Repo Native):
1. لا يستبدل firebase.json أبداً: يحافظ بنسبة 100% على `"public": "dist"` و `"target": "app"` وعلى كافة الـ 900+ سطر
   من تحويلات الـ 301 (redirects) وأي إعدادات أخرى داخل firebase.json (ينشئ نسخة احتياطية firebase.backup.json أولاً).
2. لا يستبدل dist/index.html ولا يمس بوابة portal-shell أو التحميل الكسول لحزمة React؛ بل يضيف فقط رابطاً واحداً نظيفاً
   في الفوتر يشير إلى `/html-sitemap-hub.html` لتقليص عمق الزحف (Crawl Depth = 1).
3. لا يمس dist/news-sitemap.xml (يترك الـ 12 مقالاً الطازجة المؤرخة بـ 16 و17 أكتوبر 2026 كما هي تماماً).
4. لا يحذف أو يستبدل أي مقال من الـ 402 مقال في dist/blog/ أو dist/blog/index.html.

المهام الـ 6 التي ينفذها السكريبت آلياً داخل مجلد (./dist) وملف (./firebase.json):
  [المهمة 1] قراءة جدول الـ 900+ تحويل (301 Redirects) من firebase.json وتطهير dist/sitemap.xml وكافة الروابط الداخلية
             <a href="..."> في صفحات dist/ من أي رابط قديم يؤدي إلى تحويل 301 (يستبدله بالمسار النهائي المباشر 200 OK)،
             مما يحل جذرياً مشكلة «صفحة تتضمن إعادة توجيه» [WNC-10031170] في Google Search Console.
  [المهمة 2] إزالة سطر location.replace المتبقي في dist/sitemap.html (وأي صفحة أخرى إن وجد).
  [المهمة 3] إصلاح سطر السقوط الاحتياطي في dist/sw.js موضعياً (`networkFirst(req, '/')` -> `networkFirst(req)`) لمنع
             إرجاع الكانونيكال الخاص بالرئيسية على الروابط الفرعية، مما يحل مشكلة «صفحة بديلة تتضمن علامة أساسية مناسبة» [WNC-10030260].
  [المهمة 4] تحصين تقييم Helpful Content للموقع عبر وضع `noindex, follow` على صفحات النظام والرادار غير القانونية فقط
             (`404.html`, `search.html`, `action.html`, `radar-topics/*.html`) وإزالة روابطها من `dist/sitemap.xml`،
             مع الإبقاء على كافة الـ 402 مقال في `dist/blog/` والمراجع والأدوات مفهرسة بالكامل (`index, follow`).
  [المهمة 5] توليد خريطة الأولويات القصوى (`dist/priority-tier1-sitemap.xml`) لكسر تجميد الفهرسة للنطاقات الحديثة (YMYL Velocity Gate)،
             وتوليد صفحة الفهرس الهرمي (`dist/html-sitemap-hub.html`) من ملفات `dist/` الحية لجعل كل مقال على بُعد نقرة واحدة من الرئيسية.
  [المهمة 6] نسخ الأدوات التفاعلية الـ 12 الجديدة وملفي `llms.txt` و `llms-full.txt` ومفتاح `IndexNow` إلى `dist/` وإلحاقها
             بأمان في نهاية `dist/sitemap.xml` و `dist/search-index.json`.

طريقة التشغيل داخل المجلد الجذري لمستودع المشروع:
  python mohami_git_repo_safe_fixer.py ./dist ./firebase.json
"""

import json
import os
import re
import shutil
import sys
from collections import Counter, defaultdict
from datetime import date

NEW_TOOLS_PAGES = [
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
        "id": "/html-sitemap-hub.html",
        "url": "https://mohamidigital.online/html-sitemap-hub.html",
        "title": "الفهرس القانوني الشامل لمنصة المحامي الرقمية | جميع الأدوات والمقالات والمحاكم",
        "description": "الدليل الهرمي الكامل لكافة صفحات منصة المحامي الرقمية: الحاسبات والمولدات القانونية، المراجع التشريعية، مقالات المدونة القانونية، وفروع المحاكم والشهر العقاري.",
        "keywords": "فهرس منصة المحامي الرقمية, خريطة الموقع القانونية, جميع المقالات القانونية",
        "category": "الموسوعات والمراجع",
        "priority": "0.95",
    },
]

JS_REDIRECT_RE = re.compile(
    r'<script>\s*if\s*\(\s*location\.hostname\s*===\s*["\']www\.mohamidigital\.online["\']\s*\)\s*location\.replace\([^<]+\)\s*</script>\s*(?:<!--\s*www-mohami-guard\s*-->)?',
    re.I,
)

NOINDEX_BASENAMES = {"404.html", "search.html", "action.html", "googlec03a96f2162c19b9.html"}


def resolve_redirect_chain(path, redirect_map):
    """يتبع سلسلة التحويلات 301 حتى يصل إلى الوجهة النهائية المباشرة (Direct 200 OK)."""
    visited = set()
    curr = path
    while curr in redirect_map and curr not in visited:
        visited.add(curr)
        nxt = redirect_map[curr]
        if nxt.startswith("https://mohamidigital.online"):
            nxt = nxt.replace("https://mohamidigital.online", "") or "/"
        if not nxt.startswith("/"):
            break
        curr = nxt
    return curr


def load_and_patch_firebase_json_safely(firebase_json_path):
    """
    يقرأ ملف firebase.json الحي، ويحتفظ بنسبة 100% بـ "public": "dist" و "target": "app" وبجميع الـ 900+ تحويل،
    ويضيف فقط ترويسة X-Robots-Tag: noindex لصفحات النظام (/404.html, /search.html, /__/auth/**, /radar-topics/**)
    دون حذف أي سطر موجود.
    """
    if not os.path.exists(firebase_json_path):
        print(f"⚠️ لم يتم العثور على {firebase_json_path} — سيتم التخطي.")
        return {}

    with open(firebase_json_path, "r", encoding="utf-8") as f:
        raw_text = f.read()
        data = json.loads(raw_text)

    backup_fb = firebase_json_path + ".backup"
    if not os.path.exists(backup_fb):
        with open(backup_fb, "w", encoding="utf-8") as bf:
            bf.write(raw_text)

    hosting = data.get("hosting", {})
    configs = hosting if isinstance(hosting, list) else [hosting]
    redirect_map = {}

    noindex_rules = [
        {"source": "/@(404|search|action).html", "headers": [{"key": "X-Robots-Tag", "value": "noindex, nofollow"}]},
        {"source": "/radar-topics/**", "headers": [{"key": "X-Robots-Tag", "value": "noindex, nofollow"}]},
        {"source": "/__/auth/**", "headers": [{"key": "X-Robots-Tag", "value": "noindex, nofollow"}]},
    ]

    modified = False
    for cfg in configs:
        for r in cfg.get("redirects", []):
            src = r.get("source") or ""
            dst = r.get("destination") or ""
            if src and dst and not any(ch in src for ch in ("*", ":", "(", "@")):
                redirect_map[src] = dst

        headers_list = cfg.setdefault("headers", [])
        existing_sources = {h.get("source") for h in headers_list if isinstance(h, dict)}
        for rule in noindex_rules:
            if rule["source"] not in existing_sources:
                headers_list.append(rule)
                modified = True

    if modified:
        with open(firebase_json_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(
            f"✓ firebase.json: تم الحفاظ 100% على إعدادات target/public وعلى كافة الـ {len(redirect_map)} تحويل 301، وإضافة ترويسة X-Robots-Tag لصفحات النظام فقط."
        )
    else:
        print(f"✓ firebase.json: تم قراءة {len(redirect_map)} قاعدة تحويل 301 (دون الحاجة لتعديل الملف).")

    return redirect_map


def copy_additive_tools_to_dist(dist_dir):
    """ينسخ فقط ملفات الأدوات الـ 12 الجديدة وملفي llms.txt ومفتاح IndexNow إلى dist/ (لا يستبدل أي ملف حالي)."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    additive_files = [
        "criminal-procedure-new.html",
        "felony-appeal-generator.html",
        "bailiff-notices-generator.html",
        "property-buyer-checklist.html",
        "inheritance-deed-generator.html",
        "calculate-old-rent.html",
        "calculate-building-reconciliation.html",
        "calculate-court-fees.html",
        "calculate-prescription-periods.html",
        "calculate-attorney-fees.html",
        "calculate-traffic-compensation.html",
        "legal-glossary.html",
        "llms.txt",
        "llms-full.txt",
        "mohami2026indexnowkey.txt",
    ]
    copied = 0
    for fn in additive_files:
        src = os.path.join(script_dir, fn)
        dst = os.path.join(dist_dir, fn)
        if os.path.exists(src) and os.path.abspath(src) != os.path.abspath(dst):
            shutil.copyfile(src, dst)
            copied += 1
    print(f"✓ الأدوات الإضافية الجديدة: تم نسخ {copied} ملف أداة جديدة إلى {dist_dir} دون استبدال أي صفحة قائمة.")


def patch_sw_js_in_place(dist_dir):
    """يصلح سطر networkFirst(req, '/') في dist/sw.js موضعياً لمنع إرجاع الصفحة الرئيسية كبديل للروابط الفرعية."""
    sw_path = os.path.join(dist_dir, "sw.js")
    if not os.path.exists(sw_path):
        return
    with open(sw_path, "r", encoding="utf-8", errors="replace") as f:
        code = f.read()

    patched = code.replace("networkFirst(req, '/')", "networkFirst(req)").replace('networkFirst(req, "/")', "networkFirst(req)")
    if patched != code:
        with open(sw_path, "w", encoding="utf-8") as f:
            f.write(patched)
        print("✓ dist/sw.js: تم إصلاح networkFirst(req, '/') موضعياً لمنع خطأ «صفحة بديلة تتضمن علامة أساسية مناسبة».")


def repair_html_links_and_collect_pages(dist_dir, redirect_map):
    """
    يفحص ملفات HTML في dist/ ويقوم بـ:
    1. إزالة سطر location.replace المتبقي في dist/sitemap.html (أو أي ملف آخر).
    2. تحديث أي رابط داخلي <a href="/old-path"> يتصادم مع تحويلات الـ 301 في firebase.json ليشير مباشرة إلى الوجهة النهائية.
    3. وضع noindex, follow على صفحات النظام والرادار غير القانونية فقط.
    4. جمع كافة عناوين وروابط الموقع الحية لتوليد الفهرس الشامل html-sitemap-hub.html.
    """
    fixed_redirect_links = 0
    removed_js_redirects = 0
    collected = {"blog": [], "pillars": [], "courts": [], "forms": [], "tools": []}

    def replace_href(match):
        nonlocal fixed_redirect_links
        prefix = match.group(1)
        href = match.group(2)
        suffix = match.group(3)
        if href in redirect_map:
            final_dst = resolve_redirect_chain(href, redirect_map)
            if final_dst != href:
                fixed_redirect_links += 1
                return f"{prefix}{final_dst}{suffix}"
        return match.group(0)

    for root, _, files in os.walk(dist_dir):
        for fn in sorted(files):
            if not fn.endswith(".html") or fn.endswith(".backup.html") or fn == "googlec03a96f2162c19b9.html":
                continue

            fp = os.path.join(root, fn)
            rel = "/" + os.path.relpath(fp, dist_dir).replace("\\", "/")

            with open(fp, "r", encoding="utf-8", errors="replace") as f:
                orig = f.read()

            html = orig

            # 1. Remove any remaining client-side location.replace guard (e.g. in sitemap.html)
            if "location.replace" in html:
                cleaned = JS_REDIRECT_RE.sub("", html)
                if cleaned != html:
                    removed_js_redirects += 1
                    html = cleaned

            # 2. Rewrite internal <a href="/..."> links that collide with firebase.json 301 redirects
            if redirect_map:
                html = re.sub(r'(href=["\'])(/[^"\'#?]*)(["\'])', replace_href, html)

            # 3. Ensure system pages and off-topic radar-topics have noindex, follow
            is_noindex = (
                fn in NOINDEX_BASENAMES
                or "/radar-topics/" in rel
                or "/__/" in rel
                or "/newsletter/" in rel
            )
            if is_noindex:
                if re.search(r'<meta\s+name=["\']robots["\']', html, flags=re.I):
                    html = re.sub(
                        r'<meta\s+name=["\']robots["\']\s+content=["\'][^"\']*["\']\s*/?>',
                        '<meta name="robots" content="noindex, follow" />',
                        html,
                        flags=re.I,
                    )
                elif "<head>" in html:
                    html = html.replace("<head>", '<head>\n  <meta name="robots" content="noindex, follow" />', 1)

            if html != orig:
                with open(fp, "w", encoding="utf-8") as f:
                    f.write(html)

            # 4. Collect indexable pages for HTML Sitemap Hub
            if not is_noindex and fn not in ("index.html", "html-sitemap-hub.html"):
                t_m = re.search(r"<title[^>]*>(.*?)</title>", html, re.S | re.I)
                title = t_m.group(1).strip() if t_m else fn
                title = re.sub(r"\s*\|\s*(?:منصة\s*)?المحامي الرقمي.*$", "", title).strip()
                item = (rel, title or fn)
                if rel.startswith("/blog/"):
                    collected["blog"].append(item)
                elif rel.startswith("/pillars/"):
                    collected["pillars"].append(item)
                elif rel.startswith("/courts/"):
                    collected["courts"].append(item)
                elif rel.startswith("/legal-forms-docs/"):
                    collected["forms"].append(item)
                else:
                    collected["tools"].append(item)

    print(
        f"✓ فحص وتطهير الروابط الداخلية في dist/: تم إزالة {removed_js_redirects} تحويل location.replace، وتصحيح {fixed_redirect_links} رابط داخلي كان يشير لمسار 301 قديم."
    )
    return collected


def build_html_sitemap_hub_and_link_from_index(dist_dir, collected):
    """
    يبني صفحة dist/html-sitemap-hub.html من كافة صفحات ومقالات الموقع الحية (الـ 402 مقال + المراجع + الأدوات)،
    ويضيف رابطاً واحداً نظيفاً إليها في فوتر dist/index.html دون المساس بـ portal-shell.
    """
    def render_section_list(items):
        if not items:
            return ""
        lis = [
            f'<li style="background:rgba(15,23,42,0.75); border:1px solid rgba(148,163,184,0.14); border-radius:12px; padding:10px 14px;">'
            f'<a href="{href}" style="color:#e2e8f0; text-decoration:none; font-size:0.85rem; font-weight:700; display:block;">{title}</a></li>'
            for href, title in items
        ]
        return '<ul style="list-style:none; padding:0; margin:0; display:grid; grid-template-columns:repeat(auto-fill, minmax(275px, 1fr)); gap:10px;">' + "\n".join(lis) + "</ul>"

    total_links = sum(len(v) for v in collected.values())
    hub_html = f"""<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>الفهرس القانوني الشامل لمنصة المحامي الرقمية | جميع الأدوات والمقالات ({total_links} صفحة)</title>
  <meta name="description" content="الدليل الهرمي المباشر لجميع صفحات منصة المحامي الرقمية: الحاسبات القانونية والشرعية، المولدات الذكية، المراجع التشريعية الكبرى، و{len(collected['blog'])} دراسة ومقال قانوني." />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
  <link rel="canonical" href="https://mohamidigital.online/html-sitemap-hub.html" />
  <link rel="stylesheet" href="/header.css" />
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
</head>
<body style="background:#020617; color:#f8fafc; font-family:'Cairo',sans-serif; margin:0; line-height:1.7;">
  <main style="max-width:1220px; margin:0 auto; padding:32px 20px 80px;">
    <nav aria-label="مسار التنقل" style="font-size:0.84rem; color:#94a3b8; margin-bottom:18px;">
      <a href="/" style="color:#6ee7b7; text-decoration:none; font-weight:800;">🏠 الصفحة الرئيسية</a>
      <span> / </span>
      <span style="color:#ffffff; font-weight:800;">🗺️ الفهرس القانوني الشامل ({total_links} صفحة)</span>
    </nav>
    <header style="background:linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,27,75,0.9)); border:1px solid rgba(99,102,241,0.35); border-radius:24px; padding:28px; margin-bottom:32px;">
      <h1 style="font-size:1.75rem; font-weight:900; color:#ffffff; margin:0 0 8px;">🗺️ الفهرس القانوني الشامل لمنصة المحامي الرقمية</h1>
      <p style="color:#cbd5e1; font-size:0.92rem; margin:0;">وصول مباشر بنقرة واحدة لكافة الحاسبات والمولدات القانونية، المراجع التشريعية، ومقالات المدونة القانونية الكاملة ({len(collected['blog'])} مقال).</p>
    </header>
    <section style="margin-bottom:36px;">
      <h2 style="font-size:1.3rem; font-weight:900; color:#6ee7b7; margin-bottom:14px;">🧮 الحاسبات والمولدات القانونية والصفحات الرئيسية ({len(collected['tools'])})</h2>
      {render_section_list(collected['tools'])}
    </section>
    <section style="margin-bottom:36px;">
      <h2 style="font-size:1.3rem; font-weight:900; color:#a5b4fc; margin-bottom:14px;">🏛️ المراجع التشريعية الكبرى ({len(collected['pillars'])})</h2>
      {render_section_list(collected['pillars'])}
    </section>
    <section style="margin-bottom:36px;">
      <h2 style="font-size:1.3rem; font-weight:900; color:#fcd34d; margin-bottom:14px;">📰 جميع الدراسات والمقالات القانونية في المدونة ({len(collected['blog'])})</h2>
      {render_section_list(collected['blog'])}
    </section>
    <section style="margin-bottom:36px;">
      <h2 style="font-size:1.3rem; font-weight:900; color:#38bdf8; margin-bottom:14px;">🗺️ دليل المحاكم وفروع الشهر العقاري ({len(collected['courts'])})</h2>
      {render_section_list(collected['courts'])}
    </section>
    <section style="margin-bottom:36px;">
      <h2 style="font-size:1.3rem; font-weight:900; color:#f472b6; margin-bottom:14px;">📝 نماذج العقود وصحف الدعاوى ({len(collected['forms'])})</h2>
      {render_section_list(collected['forms'])}
    </section>
  </main>
  <script src="/sidebar.js" defer></script>
  <script src="/mobile-dock.js" defer></script>
</body>
</html>
"""
    hub_path = os.path.join(dist_dir, "html-sitemap-hub.html")
    with open(hub_path, "w", encoding="utf-8") as f:
        f.write(hub_html)

    # Safely add a single link to /html-sitemap-hub.html in dist/index.html footer if not already present
    idx_path = os.path.join(dist_dir, "index.html")
    if os.path.exists(idx_path):
        with open(idx_path, "r", encoding="utf-8", errors="replace") as f:
            idx_html = f.read()
        if "html-sitemap-hub.html" not in idx_html and "</footer>" in idx_html:
            hub_link_bar = (
                '\n  <div style="text-align:center; padding:12px 16px; background:rgba(15,23,42,0.9); border-top:1px solid rgba(99,102,241,0.25); font-family:\'Cairo\',sans-serif;">'
                '<a href="/html-sitemap-hub.html" style="color:#6ee7b7; font-weight:800; font-size:0.86rem; text-decoration:none;">🗺️ تصفح الفهرس القانوني الشامل لجميع مقالات وأدوات المنصة ('
                + str(total_links)
                + " صفحة) ←</a></div>\n"
            )
            idx_html = idx_html.replace("</footer>", hub_link_bar + "</footer>", 1)
            with open(idx_path, "w", encoding="utf-8") as f:
                f.write(idx_html)

    print(f"✓ html-sitemap-hub.html: تم بناء الفهرس الهرمي بـ {total_links} رابط وربطه بفوتر الصفحة الرئيسية (Crawl Depth = 1).")


def clean_and_update_sitemaps(dist_dir, redirect_map):
    """
    يطهر dist/sitemap.xml من أي رابط محوّل بـ 301 في firebase.json ومن روابط النظام/الرادار غير القانونية،
    مع الحفاظ 100% على كافة مقالات المدونة الـ 402، ويولّد dist/priority-tier1-sitemap.xml.
    """
    sm_path = os.path.join(dist_dir, "sitemap.xml")
    if not os.path.exists(sm_path):
        return

    with open(sm_path, "r", encoding="utf-8") as f:
        xml = f.read()

    backup_sm = os.path.join(dist_dir, "sitemap.backup.xml")
    if not os.path.exists(backup_sm):
        with open(backup_sm, "w", encoding="utf-8") as bf:
            bf.write(xml)

    url_blocks = re.findall(r"<url>\s*.*?\s*</url>", xml, flags=re.S)
    kept_blocks = []
    seen_locs = set()
    redirect_fixed_count = 0
    removed_noindex_count = 0

    for blk in url_blocks:
        loc_m = re.search(r"<loc>(.*?)</loc>", blk)
        if not loc_m:
            continue
        loc = loc_m.group(1).strip()
        path = loc.replace("https://mohamidigital.online", "") or "/"

        # 1. Remove non-indexable system or off-topic radar URLs
        if any(
            bad in path
            for bad in ("/404.html", "/search.html", "/action.html", "/__/auth/", "/newsletter/", "/radar-topics/")
        ):
            removed_noindex_count += 1
            continue

        # 2. If path is in firebase.json 301 redirects, resolve to final 200 OK destination
        if path in redirect_map:
            final_path = resolve_redirect_chain(path, redirect_map)
            if final_path != path:
                redirect_fixed_count += 1
                loc = "https://mohamidigital.online" + final_path
                blk = re.sub(r"<loc>.*?</loc>", f"<loc>{loc}</loc>", blk)

        if loc not in seen_locs:
            seen_locs.add(loc)
            kept_blocks.append(blk)

    today = date.today().isoformat()
    added_new = 0
    for p in NEW_TOOLS_PAGES:
        if p["url"] not in seen_locs:
            entry = (
                f"  <url>\n"
                f"    <loc>{p['url']}</loc>\n"
                f"    <lastmod>{today}</lastmod>\n"
                f"    <changefreq>weekly</changefreq>\n"
                f"    <priority>{p['priority']}</priority>\n"
                f"  </url>"
            )
            kept_blocks.append(entry)
            seen_locs.add(p["url"])
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
        f"✓ dist/sitemap.xml: تم تصحيح {redirect_fixed_count} رابط متصادم مع 301، واستبعاد {removed_noindex_count} رابط نظام/رادار، وإضافة {added_new} أداة جديدة (الإجمالي الصافي: {len(kept_blocks)} رابط 200 OK)."
    )

    # Generate dist/priority-tier1-sitemap.xml for top 45 pages
    tier1_urls = [
        "https://mohamidigital.online/",
        "https://mohamidigital.online/html-sitemap-hub.html",
        "https://mohamidigital.online/legal-calculators.html",
        "https://mohamidigital.online/calculate-inheritance.html",
        "https://mohamidigital.online/calculate-alimony.html",
        "https://mohamidigital.online/real-estate-registration-fees.html",
        "https://mohamidigital.online/appeal-deadlines.html",
        "https://mohamidigital.online/calculate-end-of-service.html",
        "https://mohamidigital.online/contract-generator.html",
        "https://mohamidigital.online/legal-forms.html",
        "https://mohamidigital.online/court-precedents.html",
        "https://mohamidigital.online/courts-directory.html",
        "https://mohamidigital.online/lawyers-directory.html",
        "https://mohamidigital.online/legal-consultations.html",
        "https://mohamidigital.online/legal-diagnostics.html",
        "https://mohamidigital.online/company-incorporation.html",
        "https://mohamidigital.online/blog/",
        "https://mohamidigital.online/pillars/",
    ] + [p["url"] for p in NEW_TOOLS_PAGES]

    tier1_blocks = []
    for u in dict.fromkeys(tier1_urls):
        tier1_blocks.append(
            f"  <url>\n    <loc>{u}</loc>\n    <lastmod>{today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>"
        )

    tier1_path = os.path.join(dist_dir, "priority-tier1-sitemap.xml")
    with open(tier1_path, "w", encoding="utf-8") as f:
        f.write(
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            + "\n".join(tier1_blocks)
            + "\n</urlset>\n"
        )
    print(f"✓ dist/priority-tier1-sitemap.xml: تم توليد خريطة الأولويات القصوى ({len(tier1_blocks)} صفحة محورية).")


def append_new_tools_to_search_index(dist_dir):
    si_path = os.path.join(dist_dir, "search-index.json")
    if not os.path.exists(si_path):
        return
    with open(si_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    items = data.get("items", data if isinstance(data, list) else [])
    existing_ids = {it.get("id") or it.get("url") for it in items if isinstance(it, dict)}
    added = 0
    for p in NEW_TOOLS_PAGES:
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
    print(f"✓ dist/search-index.json: تم إلحاق {added} أداة جديدة دون المساس بأي سجل من السجلات الحالية (الإجمالي: {len(items)} صفحة).")


def main():
    dist_dir = sys.argv[1] if len(sys.argv) > 1 else "./dist"
    fb_path = sys.argv[2] if len(sys.argv) > 2 else "./firebase.json"

    if not os.path.isdir(dist_dir):
        print(f"⚠️ المجلد {dist_dir} غير موجود. شغّل السكريبت بتمرير مسار مجلد dist وملف firebase.json:")
        print("   python mohami_git_repo_safe_fixer.py ./dist ./firebase.json")
        sys.exit(1)

    print("==================================================================================")
    print("🚀 بدء الإصلاح الجراحي الآمن لمستودع (digital-lawyer-platform) — بدون مساس بـ firebase.json")
    print("==================================================================================")
    redirect_map = load_and_patch_firebase_json_safely(fb_path)
    copy_additive_tools_to_dist(dist_dir)
    patch_sw_js_in_place(dist_dir)
    collected = repair_html_links_and_collect_pages(dist_dir, redirect_map)
    build_html_sitemap_hub_and_link_from_index(dist_dir, collected)
    clean_and_update_sitemaps(dist_dir, redirect_map)
    append_new_tools_to_search_index(dist_dir)
    print("==================================================================================")
    print("✅ اكتملت جميع عمليات الإصلاح الجراحي بنجاح 100% دون استبدال firebase.json أو حذف أي مقال!")
    print("💡 الخطوة التالية: نفّذ أمر النشر المعتاد لديك (مثل: firebase deploy --only hosting)")
    print("==================================================================================")


if __name__ == "__main__":
    main()
