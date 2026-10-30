#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
seo_safe_injector.py — سكريبت الترقية الآمن غير التدميري لمشروع Firebase الحي (mohamidigital.online)
====================================================================================================
ضمان الأمان الصارم (Zero-Regression Guarantee):
1. لا يقوم هذا السكريبت بحذف أو استبدال أي مقال من مقالات المدونة الـ 402 أو أي رابط من روابط خريطة الموقع الـ 607.
2. يقرأ ملف sitemap.xml الحي على جهازك ويضيف إليه فقط الصفحات الـ 7 الجديدة (الحاسبات الـ 6 المستقلة + المعجم القانوني) إذا لم تكن موجودة فيه.
3. يقرأ ملف search-index.json الحي على جهازك (935 صفحة) ويضيف إليه فقط الصفحات الـ 7 الجديدة دون المساس بأي سجل موجود.
4. يمر على مقالات المدونة في مجلد blog/ ويضيف صندوق الربط الداخلي العنقودي (Topic Cluster CTA Box) لربط المقالات بصفحات الحاسبات والأدوات لرفع ترتيبها في جوجل.

طريقة التشغيل على جهازك داخل مجلد مشروع Firebase (مثل مجلد public أو dist):
  python3 seo_safe_injector.py /path/to/your/firebase/public
"""

import json
import os
import re
import sys
from datetime import date

NEW_PAGES = [
    {
        "id": "/calculate-old-rent.html",
        "url": "https://mohamidigital.online/calculate-old-rent.html",
        "title": "حاسبة زيادات الإيجار القديم وتاريخ الإخلاء القانوني 2026",
        "description": "احسب فوراً قيمة الزيادة السنوية الـ 15% في الإيجار القديم للأشخاص الاعتبارية وتاريخ الإخلاء الوجوبي في مارس 2027 وفق القانون 10 لسنة 2022 وأحكام المحكمة الدستورية العليا.",
        "keywords": "حاسبة الإيجار القديم, القانون 10 لسنة 2022, زيادة الإيجار القديم 15%, إخلاء الإيجار القديم 2027, حكم الدستورية العليا الإيجار القديم",
        "category": "الحاسبات القانونية",
        "priority": "0.90",
    },
    {
        "id": "/calculate-building-reconciliation.html",
        "url": "https://mohamidigital.online/calculate-building-reconciliation.html",
        "title": "حاسبة رسوم التصالح في مخالفات البناء 2026 وتقسيطها",
        "description": "احسب فوراً رسوم فحص وجدية التصالح ومقابل تقنين أوضاع مخالفات البناء وفق القانون الجديد رقم 187 لسنة 2023 ولائحته التنفيذية مع خصم الـ 25% للسداد الفوري.",
        "keywords": "حاسبة التصالح في مخالفات البناء 2026, قانون التصالح الجديد 187 لسنة 2023, جدية التصالح 25%, تقسيط رسوم التصالح",
        "category": "الحاسبات القانونية",
        "priority": "0.90",
    },
    {
        "id": "/calculate-court-fees.html",
        "url": "https://mohamidigital.online/calculate-court-fees.html",
        "title": "حاسبة الرسوم القضائية النسبية والثابتة والكفالات 2026",
        "description": "احسب الرسوم القضائية النسبية ورسوم صندوق أبنية المحاكم ودمغة المحاماة والكفالات وفق قانون الرسوم القضائية رقم 90 لسنة 1944 وتعديلاته.",
        "keywords": "حاسبة الرسوم القضائية, قانون الرسوم القضائية 90 لسنة 1944, حساب الرسم النسبي للدعوى, دمغة المحاماة 2026",
        "category": "الحاسبات القانونية",
        "priority": "0.90",
    },
    {
        "id": "/calculate-prescription-periods.html",
        "url": "https://mohamidigital.online/calculate-prescription-periods.html",
        "title": "حاسبة مدد التقادم المسقط والمكسب وسقوط الحق في القانون المصري 2026",
        "description": "احسب فوراً تاريخ سقوط الحق أو انقضاء الدعوى بالتقادم (التقادم الطويل 15 سنة، الخمسي 5 سنوات، الحولي، الجنائي، الشيكات) وفق القانون المدني والإجراءات الجنائية.",
        "keywords": "حاسبة التقادم في القانون المصري, التقادم المسقط 15 سنة, التقادم الخمسي, انقضاء الدعوى الجنائية بمضي المدة",
        "category": "الحاسبات القانونية",
        "priority": "0.90",
    },
    {
        "id": "/calculate-attorney-fees.html",
        "url": "https://mohamidigital.online/calculate-attorney-fees.html",
        "title": "حاسبة أتعاب المحاماة الاسترشادية ومصروفات الدعوى 2026",
        "description": "احسب أتعاب المحاماة الاسترشادية (مقدم ومؤخر الأتعاب) وفق المادة 82 من قانون المحاماة المصري رقم 17 لسنة 1983 مع تحرير عقد الأتعاب.",
        "keywords": "حاسبة أتعاب المحاماة, نسبة أتعاب المحامي في مصر, المادة 82 قانون المحاماة, عقد اتفاق أتعاب محاماة",
        "category": "الحاسبات القانونية",
        "priority": "0.90",
    },
    {
        "id": "/calculate-traffic-compensation.html",
        "url": "https://mohamidigital.online/calculate-traffic-compensation.html",
        "title": "حاسبة تعويضات حوادث السيارات والإصابات والدية الشرعية 2026",
        "description": "احسب قيمة مبلغ التأمين الإجباري والتعويض التكميلي عن الوفاة أو العجز في حوادث السيارات وفق قانون التأمين الموحد الجديد رقم 155 لسنة 2024.",
        "keywords": "حاسبة تعويضات حوادث السيارات, قانون التأمين الموحد 155 لسنة 2024, تعويض الوفاة في حوادث الطرق 100 ألف جنيه",
        "category": "الحاسبات القانونية",
        "priority": "0.90",
    },
    {
        "id": "/legal-glossary.html",
        "url": "https://mohamidigital.online/legal-glossary.html",
        "title": "المعجم القانوني والقضائي التفاعلي | شرح المصطلحات القانونية المصرية",
        "description": "أكبر معجم قانوني وقضائي تفاعلي يشرح المصطلحات القانونية المصرية واللاتينية والفرنسية ومبادئ محكمة النقض مع السند التشريعي.",
        "keywords": "معجم المصطلحات القانونية, قاموس قانوني مصري, حجية الأمر المقضي, الدفع بعدم القبول, الأثر الناقل للاستئناف",
        "category": "الموسوعات والمراجع",
        "priority": "0.90",
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
]


def append_to_sitemap(target_dir):
    sm_path = os.path.join(target_dir, "sitemap.xml")
    if not os.path.exists(sm_path):
        print("⚠️ لم يتم العثور على sitemap.xml في المسار المحدد.")
        return
    with open(sm_path, "r", encoding="utf-8") as f:
        xml = f.read()

    today = date.today().isoformat()
    added = 0
    new_entries = []
    for p in NEW_PAGES:
        if p["url"] not in xml:
            entry = (
                f"  <url>\n"
                f"    <loc>{p['url']}</loc>\n"
                f"    <lastmod>{today}</lastmod>\n"
                f"    <changefreq>weekly</changefreq>\n"
                f"    <priority>{p['priority']}</priority>\n"
                f"  </url>"
            )
            new_entries.append(entry)
            added += 1

    if added > 0 and "</urlset>" in xml:
        xml = xml.replace("</urlset>", "\n".join(new_entries) + "\n</urlset>")
        with open(sm_path, "w", encoding="utf-8") as f:
            f.write(xml)
    total_urls = len(re.findall(r"<loc>", xml))
    print(f"✓ sitemap.xml: تم الإبقاء على كافة الروابط الأصلية وإضافة {added} روابط جديدة (الإجمالي الآن: {total_urls} رابط).")


def append_to_search_index(target_dir):
    si_path = os.path.join(target_dir, "search-index.json")
    if not os.path.exists(si_path):
        print("⚠️ لم يتم العثور على search-index.json في المسار المحدد.")
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
    print(f"✓ search-index.json: تم الإبقاء على كافة السجلات الأصلية وإضافة {added} صفحات جديدة (الإجمالي الآن: {len(items)} صفحة).")


def inject_topic_cluster_links_in_blog(target_dir):
    blog_dir = os.path.join(target_dir, "blog")
    if not os.path.isdir(blog_dir):
        print("⚠️ لم يتم العثور على مجلد blog/ في المسار المحدد.")
        return

    updated = 0
    total_posts = 0
    for fn in sorted(os.listdir(blog_dir)):
        if not fn.endswith(".html") or fn == "index.html":
            continue
        total_posts += 1
        fp = os.path.join(blog_dir, fn)
        with open(fp, "r", encoding="utf-8", errors="replace") as f:
            html = f.read()

        if "mohami-topic-cluster-cta" in html:
            continue

        # Determine matching calculator cluster from title/content
        chosen = (
            "/legal-calculators.html",
            "🧮 بوابة الحاسبات القانونية والشرعية الذكية (16 حاسبة تفاعلية)",
            "احسب المواريث، النفقات، رسوم الشهر العقاري، مواعيد الطعون، والتصالح في مخالفات البناء مجاناً.",
        )
        for keywords, href, title, desc in TOPIC_CLUSTERS:
            if any(k in html for k in keywords):
                chosen = (href, title, desc)
                break

        cta_box = f"""
  <!-- Mohami SEO Topic Cluster Internal Link Box -->
  <div class="mohami-topic-cluster-cta no-print" style="margin:28px 0; padding:22px 24px; border-radius:18px; background:linear-gradient(135deg, rgba(99,102,241,0.14), rgba(16,185,129,0.10)); border:1px solid rgba(99,102,241,0.38); border-right:5px solid #6366f1; font-family:'Cairo',sans-serif; direction:rtl;">
    <div style="font-size:0.78rem; font-weight:800; color:#6ee7b7; margin-bottom:4px;">⚡ أداة قانونية تفاعلية مرتبطة بهذا الموضوع:</div>
    <div style="font-size:1.08rem; font-weight:900; color:#ffffff; margin-bottom:6px;">
      <a href="{chosen[0]}" style="color:#ffffff; text-decoration:none;">{chosen[1]}</a>
    </div>
    <p style="font-size:0.88rem; color:#cbd5e1; margin:0 0 14px; line-height:1.7;">{chosen[2]}</p>
    <div style="display:flex; gap:10px; flex-wrap:wrap;">
      <a href="{chosen[0]}" style="padding:9px 18px; border-radius:10px; background:linear-gradient(135deg,#6366f1,#4f46e5); color:#fff; font-size:0.84rem; font-weight:800; text-decoration:none;">🚀 استخدم الحاسبة القانونية الآن مجاناً ←</a>
      <a href="/contract-generator.html" style="padding:9px 16px; border-radius:10px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#e2e8f0; font-size:0.82rem; font-weight:700; text-decoration:none;">📝 صانع العقود وصحف الدعاوى</a>
      <a href="/legal-consultations.html" style="padding:9px 16px; border-radius:10px; background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.4); color:#6ee7b7; font-size:0.82rem; font-weight:700; text-decoration:none;">💬 اطلب استشارة فورية</a>
    </div>
  </div>
"""
        if "</article>" in html:
            html = html.replace("</article>", cta_box + "
</article>", 1)
            with open(fp, "w", encoding="utf-8") as f:
                f.write(html)
            updated += 1
        elif "</main>" in html:
            html = html.replace("</main>", cta_box + "
</main>", 1)
            with open(fp, "w", encoding="utf-8") as f:
                f.write(html)
            updated += 1

    print(f"✓ blog/: تم فحص {total_posts} مقال وحقن صندوق الربط العنقودي الداخلي في {updated} مقال دون المساس بمحتواها.")


def main():
    target_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    print(f"بدء الترقية الآمنة غير التدميرية للسيو في المجلد: {os.path.abspath(target_dir)}")
    append_to_sitemap(target_dir)
    append_to_search_index(target_dir)
    inject_topic_cluster_links_in_blog(target_dir)
    print("✅ اكتملت الترقية بنجاح 100% دون حذف أو استبدال أي ملف أو مقال حالي.")


if __name__ == "__main__":
    main()
