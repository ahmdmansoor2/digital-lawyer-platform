#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
سكربت الإصلاح والترقية الشامل لصفحات موقع منصة المحامي الرقمية (mohamidigital.online) — الإصدار الثامن الشامل مع الوضع النهاري (v8)
يقوم هذا السكربت بالمرور على كافة ملفات .html في مجلد الموقع (public_html أو dist أو public) وإجراء الإصلاحات والترقيات التالية آلياً:
1. إزالة كود التحويل بالجافاسكربت (location.replace) الذي يسبب خطأ "صفحة تتضمن إعادة توجيه" في Google Search Console.
2. إصلاح الخطأ البرمجي القاتل في أكواد JavaScript الداخلية حيث تحولت المعاملات المنطقية (||) إلى معاملات آحادية (|) مما كان يعطل دليل المحامين وبوابة الاستشارات ومولد العقود وصيغ الدعاوى وإعلانات AdSense.
3. إصلاح خطأ انكسار النص البرمجي (Uncaught SyntaxError) قبل وسم </body></html> داخل دالة تصدير ملفات Word (.doc) في مولد العقود وموسوعة الصيغ.
4. إصلاح تشوه العناوين والنصوص (إزالة الأنبوب المزدوج "| | المحامي الرقمي" وكافة عبارات "| المحامي الرقمي" المبتورة وسط الجمل).
5. تنظيف ترويسة <head> ووسوم <meta name="description"> و <meta property="og:title"> من أكواد الـ HTML الخام (<a href=...>) وعلامات التنصيص المكررة ("") التي تكسر ترويسة <head>.
6. ضبط إعدادات Google AdSense: إضافة وسم <meta name="google-adsense-account" content="ca-pub-7725405859334364" /> لجميع الصفحات القابلة للفهرسة، وإزالة سكريبت الإعلانات من صفحتي 404.html و search.html لمنع مخالفة سياسات AdSense.
7. تفعيل محرك الوضع النهاري/الليلي وحجم الخط بدون وميض (Zero-FOUC Theme & Font Init) في <head> وتضمين /header.css?v=20261016v8 و /sidebar.js?v=20261016v8 في كافة الصفحات.
8. تعميم بطاقة التدقيق والمراجعة القانونية (E-E-A-T Verification Card) للمستشار أحمد منصور وشريطي التنقل الموحدين (/sidebar.js و /mobile-dock.js).

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
ADSENSE_CLIENT = "ca-pub-7725405859334364"
ADSENSE_META_TAG = f'<meta name="google-adsense-account" content="{ADSENSE_CLIENT}" />'
ZERO_FOUC_SNIPPET = '<script>(function(){try{var t=localStorage.getItem("mohami_theme_mode");if(t==="light")document.documentElement.classList.add("public-theme-light");var fs=localStorage.getItem("mohami_font_scale");if(fs)document.documentElement.style.fontSize=fs+"%";}catch(e){}})();</script>'

STRAY_PIPE_REPLACEMENTS = [
    ("| | المحامي الرقمي", "| المحامي الرقمي"),
    ("| | منصة المحامي الرقمية", "| منصة المحامي الرقمية"),
    ("منصة | المحامي الرقمية", "منصة المحامي الرقمية"),
    ("فريق | المحامي الرقمي", "فريق منصة المحامي الرقمية"),
    ("جرّب | المحامي الرقمي", "جرّب منصة المحامي الرقمية"),
    ("جرب | المحامي الرقمي", "جرب منصة المحامي الرقمية"),
    ("⚖️ | المحامي الرقمي", "⚖️ منصة المحامي الرقمية"),
    ("© 2026 | المحامي الرقمي", "© 2026 منصة المحامي الرقمية"),
    ("مميزات | المحامي الرقمي", "مميزات منصة المحامي الرقمية"),
    ("اكتشف قوة | المحامي الرقمي", "اكتشف قوة منصة المحامي الرقمية"),
    ("مؤسس | المحامي الرقمي", "مؤسس منصة المحامي الرقمية"),
    ("انطلقت | المحامي الرقمي", "انطلقت منصة المحامي الرقمية"),
    ("تلتزم | المحامي الرقمي", "تلتزم منصة المحامي الرقمية"),
    ("تستخدم | المحامي الرقمي", "تستخدم منصة المحامي الرقمية"),
    ("تقدم | المحامي الرقمي", "تقدم منصة المحامي الرقمية"),
    ("توفر | المحامي الرقمي", "توفر منصة المحامي الرقمية"),
    ("تتيح | المحامي الرقمي", "تتيح منصة المحامي الرقمية"),
    ("تعد | المحامي الرقمي", "تعد منصة المحامي الرقمية"),
    ("تُعد | المحامي الرقمي", "تُعد منصة المحامي الرقمية"),
    ("إن | المحامي الرقمي", "إن منصة المحامي الرقمية"),
    ("أن | المحامي الرقمي", "أن منصة المحامي الرقمية"),
    ("بأن | المحامي الرقمي", "بأن منصة المحامي الرقمية"),
    ("مع | المحامي الرقمي", "مع منصة المحامي الرقمية"),
    ("من | المحامي الرقمي", "من منصة المحامي الرقمية"),
    ("إلى | المحامي الرقمي", "إلى منصة المحامي الرقمية"),
    ("لدى | المحامي الرقمي", "لدى منصة المحامي الرقمية"),
    ("عبر | المحامي الرقمي", "عبر منصة المحامي الرقمية"),
    ("على | المحامي الرقمي", "على منصة المحامي الرقمية"),
    ("في | المحامي الرقمي", "في منصة المحامي الرقمية"),
    ("داخل | المحامي الرقمي", "داخل منصة المحامي الرقمية"),
    ("موقع | المحامي الرقمي", "موقع منصة المحامي الرقمية"),
    ("بوابة | المحامي الرقمي", "بوابة منصة المحامي الرقمية"),
    ("تطبيق | المحامي الرقمي", "تطبيق منصة المحامي الرقمية"),
    ("نظام | المحامي الرقمي", "نظام منصة المحامي الرقمية"),
    ("خدمات | المحامي الرقمي", "خدمات منصة المحامي الرقمية"),
    ("ما هي | المحامي الرقمي", "ما هي منصة المحامي الرقمية"),
    ("صادر من | المحامي الرقمي", "صادر من منصة المحامي الرقمية"),
    ("، | المحامي الرقمي،", "، منصة المحامي الرقمية،"),
    ("المحافظات | المحامي الرقمي", "المحافظات — منصة المحامي الرقمية"),
]

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
    fixed_body = re.sub(r" \| (?![\u0600-\u06FF])", " || ", body)
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
    for old_s, new_s in STRAY_PIPE_REPLACEMENTS:
        content = content.replace(old_s, new_s)

    # 4. Strip any invalid <a href="...">...</a> tags injected inside <head>...</head> meta tags
    def clean_head_block(match):
        head_html = match.group(0)
        return re.sub(r"<a\s+[^>]*>(.*?)</a>", r"\1", head_html, flags=re.I | re.S)

    content = re.sub(r"<head\b[^>]*>.*?</head>", clean_head_block, content, flags=re.I | re.S)

    # 5. Fix accidental double quotes at end of og:title / meta attributes
    content = re.sub(r'content="([^\n\r"]*?)""(\s*/?>)', r'content="\1"\2', content)

    # 6. Fix missing logo.png in JSON-LD -> logo.svg
    content = content.replace(
        "https://mohamidigital.online/logo.png",
        "https://mohamidigital.online/logo.svg",
    )

    # 7. Ensure proper <meta name="robots">, Zero-FOUC Light Mode Init, and Google AdSense rules in <head>
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
        content = re.sub(
            r'\s*<script[^>]*pagead2\.googlesyndication\.com/pagead/js/adsbygoogle\.js[^>]*></script>',
            "",
            content,
            flags=re.I,
        )
        content = re.sub(
            r'\s*<meta\s+name=["\']google-adsense-account["\'][^>]*>',
            "",
            content,
            flags=re.I,
        )
    else:
        if not has_robots and "<head>" in content:
            content = content.replace(
                "<head>",
                '<head>\n  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />',
                1,
            )
        if "google-adsense-account" not in content and "</head>" in content:
            content = content.replace("</head>", f"  {ADSENSE_META_TAG}\n</head>", 1)

    if "mohami_theme_mode" not in content and "<head>" in content:
        content = content.replace("<head>", "<head>\n  " + ZERO_FOUC_SNIPPET, 1)

    if "/header.css" not in content and "</head>" in content and filename not in {"action.html"}:
        content = content.replace("</head>", '  <link rel="stylesheet" href="/header.css?v=20261016v8" />\n</head>', 1)

    # 8. Inject E-E-A-T Legal Verification Card and unified navigation scripts
    if filename not in SKIP_EEAT_FILES and "eeat-verification-box" not in content:
        if "<footer" in content:
            content = content.replace("<footer", EEAT_BOX_HTML + "\n  <footer", 1)
        elif "</main>" in content:
            content = content.replace("</main>", "</main>\n" + EEAT_BOX_HTML, 1)

    if filename not in {"404.html", "googlec03a96f2162c19b9.html"}:
        if "/sidebar.js" not in content and "</body>" in content:
            content = content.replace(
                "</body>", '  <script src="/sidebar.js?v=20261016v8" defer></script>\n</body>', 1
            )
        if "/mobile-dock.js" not in content and "</body>" in content:
            content = content.replace(
                "</body>", '  <script src="/mobile-dock.js?v=20261016v8" defer></script>\n</body>', 1
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