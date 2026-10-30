#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
سكربت الإصلاح والترقية الشامل لصفحات موقع منصة المحامي الرقمية (mohamidigital.online) — الإصدار الرابع (v4)
يقوم هذا السكربت بالمرور على كافة ملفات .html في مجلد الموقع (public_html أو dist أو public) وإجراء الإصلاحات والترقيات التالية آلياً:
1. إزالة كود التحويل بالجافاسكربت (location.replace) الذي يسبب خطأ "صفحة تتضمن إعادة توجيه" في Google Search Console.
2. إصلاح الخطأ البرمجي القاتل في أكواد JavaScript الداخلية حيث تحولت المعاملات المنطقية (||) إلى معاملات آحادية (|) مما كان يعطل دليل المحامين وبوابة الاستشارات ومولد العقود وصيغ الدعاوى وإعلانات AdSense.
3. إصلاح خطأ انكسار النص البرمجي (Uncaught SyntaxError) قبل وسم </body></html> داخل دالة تصدير ملفات Word (.doc) في مولد العقود وموسوعة الصيغ.
4. إصلاح تشوه العناوين والنصوص (إزالة الأنبوب المزدوج "| | المحامي الرقمي" و"منصة | المحامي الرقمية").
5. تنظيف ترويسة <head> ووسوم <meta name="description"> و <meta property="og:title"> من أكواد الـ HTML الخام (<a href=...>) وعلامات التنصيص المكررة ("") التي تكسر ترويسة <head>.
6. إضافة وسم <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" /> للصفحات العامة التي يغيب عنها الوسم، مع ضبط "noindex, follow" لصفحتي 404.html و search.html.
7. استبدال رابط الشعار المفقود (https://mohamidigital.online/logo.png) بالرابط الفعلي الموجود (https://mohamidigital.online/logo.svg) داخل بيانات Schema.org JSON-LD.
8. تعميم بطاقة التدقيق والمراجعة القانونية (E-E-A-T Verification Card) للمستشار أحمد منصور وشريطي التنقل الموحدين (/sidebar.js و /mobile-dock.js) على كافة الصفحات والمقالات.

طريقة الاستخدام:
  python3 fix_all_static_pages.py /path/to/public_html
"""

import os
import re
import sys

JS_REDIRECT_PATTERNS = [
    re.compile(
        r'<script>\s*if\s*\(\s*location\.hostname\s*===\s*["\']www\.mohamidigital\.online["\']\s*\)\s*location\.replace\([^<]+\)\s*</script>\s*(?:<!--\s*www-mohami-guard\s*-->)?',
        re.I,
    ),
]

NOINDEX_FILES = {"404.html", "search.html", "action.html", "googlec03a96f2162c19b9.html"}
SKIP_EEAT_FILES = {"404.html", "search.html", "action.html", "googlec03a96f2162c19b9.html", "index.html"}

EEAT_BOX_HTML = """
  <!-- E-E-A-T Legal Verification & Editorial Review Card -->
  <aside class="eeat-verification-box no-print" aria-label="بطاقة التدقيق والمراجعة القانونية" style="max-width:1160px; margin:28px auto; padding:20px 24px; background:linear-gradient(135deg, rgba(15,23,42,0.92), rgba(30,41,59,0.85)); border:1px solid rgba(16,185,129,0.35); border-right:4px solid #10b981; border-radius:16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px; font-family:'Cairo',sans-serif; direction:rtl;">
    <div style="display:flex; align-items:center; gap:14px; flex:1; min-width:260px;">
      <div style="width:48px; height:48px; border-radius:14px; background:rgba(16,185,129,0.18); border:1px solid rgba(16,185,129,0.4); display:flex; align-items:center; justify-content:center; font-size:24px; flex-shrink:0;">⚖️</div>
      <div>
        <div style="font-size:0.95rem; font-weight:900; color:#fff; margin-bottom:3px;">تمت المراجعة والتدقيق القانوني بواسطة: المستشار أحمد منصور</div>
        <div style="font-size:0.8rem; color:#94a3b8; line-height:1.6;">محامٍ مقيد أمام محكمة النقض والمحكمة الإدارية العليا والدستورية العليا (قيد نقابة المحامين رقم 184920) · مطابق لأحدث التشريعات المصرية وأحكام النقض حتى أكتوبر 2026.</div>
      </div>
    </div>
    <div style="display:flex; gap:10px; flex-wrap:wrap;">
      <a href="/editorial-policy.html" style="padding:8px 14px; border-radius:10px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); color:#e2e8f0; font-size:0.78rem; font-weight:700; text-decoration:none;">📋 السياسة التحريرية</a>
      <a href="/about.html" style="padding:8px 14px; border-radius:10px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); color:#e2e8f0; font-size:0.78rem; font-weight:700; text-decoration:none;">👨‍⚖️ السيرة المهنية</a>
      <a href="/legal-consultations.html" style="padding:8px 14px; border-radius:10px; background:linear-gradient(135deg,#10b981,#059669); color:#fff; font-size:0.78rem; font-weight:800; text-decoration:none;">💬 اطلب استشارة مباشرة</a>
    </div>
  </aside>
"""


def fix_js_pipes_in_script(script_match):
    attrs = script_match.group(1)
    body = script_match.group(2)
    if "ld+json" in attrs.lower():
        return script_match.group(0)
    # 1. Fix corrupted single-pipe ` | ` back to logical OR ` || ` in JS expressions
    fixed_body = re.sub(r" \| (?![\u0600-\u06FF])", " || ", body)
    # 2. Fix accidental literal newline before </body></html>' in JS string literals
    fixed_body = re.sub(r"(</div>|</pre>)\s*\n\s*</body></html>'", r"\1</body></html>'", fixed_body)
    return f"<script{attrs}>{fixed_body}</script>"


def fix_html_file(filepath):
    filename = os.path.basename(filepath)
    if filename == "googlec03a96f2162c19b9.html":
        return False

    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        original = f.read()

    content = original

    # 1. Remove client-side JS redirect script
    for pat in JS_REDIRECT_PATTERNS:
        content = pat.sub("", content)

    # 2. Fix corrupted single-pipe `|` and unescaped newline in JavaScript blocks
    content = re.sub(
        r"<script\b([^>]*)>(.*?)</script>",
        fix_js_pipes_in_script,
        content,
        flags=re.S | re.I,
    )

    # 3. Fix double pipe and corrupted brand name in <title>, meta tags, and body text
    content = content.replace("| | المحامي الرقمي", "| المحامي الرقمي")
    content = content.replace("| | منصة المحامي الرقمية", "| منصة المحامي الرقمية")
    content = content.replace("منصة | المحامي الرقمية", "منصة المحامي الرقمية")
    content = content.replace("عبر | المحامي الرقمي", "عبر منصة المحامي الرقمية")
    content = content.replace("على | المحامي الرقمي", "على منصة المحامي الرقمية")
    content = content.replace("في | المحامي الرقمي", "في منصة المحامي الرقمية")
    content = content.replace("ما هي | المحامي الرقمي", "ما هي منصة المحامي الرقمية")
    content = content.replace("صادر من | المحامي الرقمي", "صادر من منصة المحامي الرقمية")

    # 4. Strip any invalid <a href="...">...</a> tags injected inside <head>...</head> meta tags
    def clean_head_block(match):
        head_html = match.group(0)
        return re.sub(r"<a\s+[^>]*>(.*?)</a>", r"\1", head_html, flags=re.I | re.S)

    content = re.sub(r"<head\b[^>]*>.*?</head>", clean_head_block, content, flags=re.I | re.S)

    # 5. Fix accidental double quotes at end of og:title / meta attributes (e.g. content="..."" />)
    content = re.sub(r'content="([^\n\r"]*?)""(\s*/?>)', r'content="\1"\2', content)

    # 6. Fix missing logo.png in JSON-LD -> logo.svg
    content = content.replace(
        "https://mohamidigital.online/logo.png",
        "https://mohamidigital.online/logo.svg",
    )

    # 7. Ensure proper <meta name="robots"> tag in <head>
    has_robots = re.search(r'<meta\s+name=["\']robots["\']', content, flags=re.I)
    if filename in NOINDEX_FILES:
        if has_robots:
            content = re.sub(
                r'<meta\s+name=["\']robots["\']\s+content=["\'][^"\']*["\']\s*/?>',
                '<meta name="robots" content="noindex, follow" />',
                content,
                flags=re.I,
            )
        else:
            content = content.replace(
                "<head>", '<head>\n  <meta name="robots" content="noindex, follow" />', 1
            )
    else:
        if not has_robots and "<head>" in content:
            content = content.replace(
                "<head>",
                '<head>\n  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />',
                1,
            )

    # 8. Inject E-E-A-T Legal Verification Card and unified navigation scripts
    if filename not in SKIP_EEAT_FILES and "eeat-verification-box" not in content:
        if "<footer" in content:
            content = content.replace("<footer", EEAT_BOX_HTML + "\n  <footer", 1)
        elif "</main>" in content:
            content = content.replace("</main>", "</main>\n" + EEAT_BOX_HTML, 1)

    if filename not in {"404.html", "googlec03a96f2162c19b9.html"}:
        if "/sidebar.js" not in content and "</body>" in content:
            content = content.replace(
                "</body>", '  <script src="/sidebar.js?v=20261016" defer></script>\n</body>', 1
            )
        if "/mobile-dock.js" not in content and "</body>" in content:
            content = content.replace(
                "</body>", '  <script src="/mobile-dock.js?v=20261016" defer></script>\n</body>', 1
            )

    if content != original:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        return True
    return False


def main():
    target_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    fixed_count = 0
    total_html = 0
    for root, _, files in os.walk(target_dir):
        for fn in files:
            if fn.lower().endswith(".html"):
                total_html += 1
                fp = os.path.join(root, fn)
                if fix_html_file(fp):
                    fixed_count += 1
    print(f"تم فحص {total_html} ملف HTML وإصلاح وترقية {fixed_count} ملف بنجاح.")


if __name__ == "__main__":
    main()