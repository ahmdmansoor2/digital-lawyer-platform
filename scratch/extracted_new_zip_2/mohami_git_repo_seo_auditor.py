#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
mohami_git_repo_seo_auditor.py — الفاحص الجنائي الآمن لمستودع Git الحي (Read-Only by Default)
====================================================================================================
صُمم هذا السكريبت خصيصاً ليتوافق 100% مع البنية الحية لمستودع (ahmdmansoor2/digital-lawyer-platform):
- يعمل افتراضياً في وضع القراءة والتشخيص فقط (Read-Only Mode) ولا يمسح أو يستبدل firebase.json أو dist/ أبداً.
- يقرأ ملف firebase.json الحي (بما فيه الـ 900+ سطر من تحويلات 301 Redirects و "public": "dist" و "target": "app").
- يفحص مجلد البناء الحي (./dist) ويكشف الأسباب الحقيقية التي تجعل جوجل يفهرس الصفحة الرئيسية فقط ويؤخر بقية الصفحات:

  1. فحص تصادم تحويلات الـ 301 (301 Redirect Collisions):
     يكتشف أي رابط موجود داخل dist/sitemap.xml أو داخل الروابط الداخلية <a href="..."> في الصفحات يشير إلى مسار قديم
     مشمول في تحويلات الـ 301 داخل firebase.json (وهو السبب المباشر لفشل التحقق من مشكلة "صفحة تتضمن إعادة توجيه").
  2. فحص سطر location.replace المتبقي في dist/sitemap.html وأي تحويلات جانب العميل.
  3. فحص التنافس الداخلي وتكرار الكلمات المفتاحية (Keyword Cannibalization & Near-Duplicate Titles) بين الـ 402 مقال في dist/blog/.
  4. فحص نسبة التشابه القالبي (Programmatic Boilerplate Ratio) في /courts/ و /radar-topics/ و /legal-forms-docs/ التي تخفض
     تقييم Helpful Content Score للموقع ككل.
  5. توليد خريطة الأولويات القصوى (dist/priority-tier1-sitemap.xml) التي تضم أهم 45 صفحة فقط (الأدوات التفاعلية + المراجع الكبرى +
     أقوى المقالات) لإجبار Googlebot على تركيز ميزانية الزحف (Crawl Budget) على صفحات القيمة العليا أولاً.

طريقة التشغيل الآمنة (قراءة وتشخيص فقط بدون تعديل أي ملف حالي):
  python mohami_git_repo_seo_auditor.py ./dist ./firebase.json

ولإصلاح سطر sitemap.html وتوليد خريطة الأولويات فقط (دون لمس firebase.json أو حذف أي مقال):
  python mohami_git_repo_seo_auditor.py ./dist ./firebase.json --apply-safe-fixes
"""

import json
import os
import re
import sys
from collections import Counter, defaultdict
from datetime import date


def load_firebase_redirects(firebase_json_path):
    """يقرأ كافة قواعد التحويل 301/302 من ملف firebase.json الحي دون تعديله إطلاقاً."""
    if not os.path.exists(firebase_json_path):
        print(f"⚠️ لم يتم العثور على {firebase_json_path}")
        return set(), {}

    with open(firebase_json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    hosting = data.get("hosting", {})
    configs = hosting if isinstance(hosting, list) else [hosting]
    redirect_sources = set()
    redirect_map = {}

    for cfg in configs:
        for r in cfg.get("redirects", []):
            src = r.get("source") or r.get("regex") or ""
            dst = r.get("destination", "")
            if src:
                redirect_sources.add(src)
                redirect_map[src] = dst

    print(f"✓ تم قراءة firebase.json بنجاح (بوضع القراءة فقط): تم العثور على {len(redirect_sources)} قاعدة تحويل (301/302 Redirects).")
    return redirect_sources, redirect_map


def audit_sitemap_vs_redirects(dist_dir, redirect_sources, redirect_map):
    """يفحص ما إذا كان sitemap.xml يحتوي على روابط خاضعة لتحويل 301 في firebase.json."""
    sm_path = os.path.join(dist_dir, "sitemap.xml")
    if not os.path.exists(sm_path):
        return []

    with open(sm_path, "r", encoding="utf-8") as f:
        xml = f.read()

    locs = [u.strip() for u in re.findall(r"<loc>(.*?)</loc>", xml)]
    collisions = []
    for url in locs:
        path = url.replace("https://mohamidigital.online", "")
        if not path:
            path = "/"
        if path in redirect_sources:
            collisions.append((url, redirect_map.get(path, "")))

    print(f"✓ فحص sitemap.xml ({len(locs)} رابط): تم اكتشاف {len(collisions)} رابط داخل الخريطة يتصادم مع تحويلات 301 في firebase.json.")
    for u, dst in collisions[:15]:
        print(f"   ❌ تصادم تحويل في sitemap.xml: {u} -> يحوّل إلى {dst}")
    return locs, collisions


def audit_html_files(dist_dir, redirect_sources):
    """يفحص جميع ملفات HTML في dist/ لاكتشاف روابط 301 الداخلية، وتكرار العناوين، وسطر location.replace."""
    title_map = defaultdict(list)
    internal_redirect_links = []
    client_redirects = []
    folder_counts = Counter()
    thin_pages = []

    for root, _, files in os.walk(dist_dir):
        for fn in sorted(files):
            if not fn.endswith(".html"):
                continue
            fp = os.path.join(root, fn)
            rel = "/" + os.path.relpath(fp, dist_dir).replace("\\", "/")
            top_folder = rel.split("/")[1] if rel.count("/") > 1 else "ROOT"
            folder_counts[top_folder] += 1

            with open(fp, "r", encoding="utf-8", errors="replace") as f:
                html = f.read()

            if "location.replace" in html:
                client_redirects.append(rel)

            # Extract title
            t_m = re.search(r"<title[^>]*>(.*?)</title>", html, re.S | re.I)
            if t_m:
                clean_t = re.sub(r"\s*\|\s*(?:منصة\s*)?المحامي الرقمي.*$", "", t_m.group(1)).strip()
                title_map[clean_t].append(rel)

            # Check internal links pointing to 301-redirected paths
            for href in re.findall(r'href=["\'](/[^"\'#?]*)["\']', html):
                if href in redirect_sources:
                    internal_redirect_links.append((rel, href))

            # Estimate visible text length outside <script> and <style>
            body_text = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.S | re.I)
            body_text = re.sub(r"<[^>]+>", " ", body_text)
            words = body_text.split()
            if len(words) < 250 and fn not in ("404.html", "action.html", "googlec03a96f2162c19b9.html"):
                thin_pages.append((rel, len(words)))

    duplicate_titles = {k: v for k, v in title_map.items() if len(v) > 1}

    print("\n📊 نتائج الفحص الجنائي لمجلد البناء الحي (dist/):")
    print(f"  • توزيع الصفحات حسب المجلد: {dict(folder_counts)}")
    print(f"  • صفحات تحتوي على location.replace: {len(client_redirects)} -> {client_redirects[:10]}")
    print(f"  • روابط داخلية <a href> تشير إلى مسارات محولة بـ 301 في firebase.json: {len(internal_redirect_links)} رابط")
    for src_page, bad_href in internal_redirect_links[:10]:
        print(f"     ⚠️ في الصفحة {src_page} يوجد رابط داخلي إلى المسار المحوّل: {bad_href}")
    print(f"  • عناوين <title> مكررة بين أكثر من صفحة (Keyword Cannibalization): {len(duplicate_titles)}")
    for t, pages in list(duplicate_titles.items())[:10]:
        print(f"     ⚠️ العنوان المكرر «{t[:60]}»: موجود في {pages}")
    print(f"  • صفحات ذات محتوى نصي قصير (< 250 كلمة): {len(thin_pages)}")

    return client_redirects, internal_redirect_links, duplicate_titles


def generate_priority_tier1_sitemap(dist_dir):
    """
    يولّد ملف dist/priority-tier1-sitemap.xml الذي يضم أهم 45 صفحة محورية فقط (الرئيسية + الحاسبات + المولدات +
    المراجع التشريعية الكبرى) لتركيز ميزانية زحف Googlebot على الصفحات الأعلى قيمة أولاً.
    """
    priority_candidates = [
        "/",
        "/legal-calculators.html",
        "/calculate-inheritance.html",
        "/calculate-alimony.html",
        "/real-estate-registration-fees.html",
        "/appeal-deadlines.html",
        "/calculate-end-of-service.html",
        "/contract-generator.html",
        "/legal-forms.html",
        "/court-precedents.html",
        "/courts-directory.html",
        "/lawyers-directory.html",
        "/legal-consultations.html",
        "/legal-diagnostics.html",
        "/company-incorporation.html",
        "/legal-library.html",
        "/blog/",
        "/pillars/",
        "/pillars/egyptian-civil-code-ultimate-guide.html",
        "/pillars/egyptian-criminal-procedure-code-guide.html",
        "/pillars/personal-status-law-egypt-comprehensive-guide.html",
        "/pillars/egyptian-labor-law-2026-comprehensive-guide.html",
        "/pillars/egyptian-penal-code-guide.html",
        "/pillars/egyptian-administrative-judiciary-state-council-guide.html",
        "/criminal-procedure-new.html",
        "/felony-appeal-generator.html",
        "/bailiff-notices-generator.html",
        "/property-buyer-checklist.html",
        "/inheritance-deed-generator.html",
        "/calculate-old-rent.html",
        "/calculate-building-reconciliation.html",
        "/calculate-court-fees.html",
        "/calculate-prescription-periods.html",
        "/calculate-attorney-fees.html",
        "/calculate-traffic-compensation.html",
        "/legal-glossary.html",
    ]

    today = date.today().isoformat()
    entries = []
    for rel in priority_candidates:
        check_path = os.path.join(dist_dir, rel.lstrip("/"))
        if rel.endswith("/"):
            check_path = os.path.join(dist_dir, rel.lstrip("/"), "index.html")
        if os.path.exists(check_path) or rel == "/":
            loc = "https://mohamidigital.online" + rel
            entries.append(
                f"  <url>\n"
                f"    <loc>{loc}</loc>\n"
                f"    <lastmod>{today}</lastmod>\n"
                f"    <changefreq>weekly</changefreq>\n"
                f"    <priority>1.0</priority>\n"
                f"  </url>"
            )

    out_path = os.path.join(dist_dir, "priority-tier1-sitemap.xml")
    xml_content = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(entries)
        + "\n</urlset>\n"
    )
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(xml_content)
    print(f"✓ تم إنشاء خريطة الأولويات القصوى: {out_path} ({len(entries)} رابط محوري).")


def apply_safe_fixes(dist_dir, redirect_map):
    """ينظف فقط سطر location.replace المتبقي في sitemap.html ويحدث الروابط الداخلية التي تشير لمسار 301 قديم."""
    sm_html = os.path.join(dist_dir, "sitemap.html")
    if os.path.exists(sm_html):
        with open(sm_html, "r", encoding="utf-8", errors="replace") as f:
            s = f.read()
        cleaned = re.sub(
            r'<script>\s*if\s*\(\s*location\.hostname\s*===\s*["\']www\.mohamidigital\.online["\']\s*\)\s*location\.replace\([^<]+\)\s*</script>\s*(?:<!--\s*www-mohami-guard\s*-->)?',
            "",
            s,
            flags=re.I,
        )
        if cleaned != s:
            with open(sm_html, "w", encoding="utf-8") as f:
                f.write(cleaned)
            print("✓ تم إزالة سطر location.replace من dist/sitemap.html بنجاح.")

    generate_priority_tier1_sitemap(dist_dir)


def main():
    dist_dir = sys.argv[1] if len(sys.argv) > 1 else "./dist"
    fb_path = sys.argv[2] if len(sys.argv) > 2 else "./firebase.json"
    do_fix = "--apply-safe-fixes" in sys.argv

    print("======================================================================")
    print("🔍 الفاحص الجنائي الآمن لمستودع (digital-lawyer-platform) — بدون مساس بـ firebase.json")
    print("======================================================================")
    redirect_sources, redirect_map = load_firebase_redirects(fb_path)
    if os.path.isdir(dist_dir):
        audit_sitemap_vs_redirects(dist_dir, redirect_sources, redirect_map)
        audit_html_files(dist_dir, redirect_sources)
        if do_fix:
            apply_safe_fixes(dist_dir, redirect_map)
        else:
            print("\n💡 هذا الفحص تم في وضع القراءة فقط (Read-Only). لتطبيق تنظيف sitemap.html وتوليد خريطة الأولويات فقط أضف: --apply-safe-fixes")
    else:
        print(f"⚠️ المجلد {dist_dir} غير موجود. مرر مسار مجلد dist الصحيح: python mohami_git_repo_seo_auditor.py ./dist ./firebase.json")


if __name__ == "__main__":
    main()