#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
instant_indexnow_pusher.py — أداة الدفع الفوري لروابط الموقع إلى محركات البحث (IndexNow API + Google Priority List)
====================================================================================================================
يقوم هذا السكريبت بقراءة كافة الروابط القانونية النظيفة من ملف sitemap.xml بعد تشغيل mohami_deep_indexing_doctor.py
وإرسالها دفعة واحدة عبر بروتوكول IndexNow الرسمي (لفهرسة فورية في Bing وYandex وDuckDuckGo وSeznam)،
كما يطبع لك قائمة أهم 20 رابطاً محوريّاً لطلب فهرستها الفورية في Google Search Console.

طريقة التشغيل على جهازك (بعد تنفيذ firebase deploy):
  python instant_indexnow_pusher.py ./public
"""

import json
import os
import re
import sys
import urllib.request

HOST = "mohamidigital.online"
KEY = "mohami2026indexnowkey"
KEY_LOCATION = f"https://{HOST}/{KEY}.txt"


def main():
    target_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    sm_path = os.path.join(target_dir, "sitemap.xml")
    if not os.path.exists(sm_path):
        print("⚠️ لم يتم العثور على sitemap.xml في المسار المحدد.")
        return

    with open(sm_path, "r", encoding="utf-8") as f:
        xml = f.read()

    urls = [u.strip() for u in re.findall(r"<loc>(.*?)</loc>", xml) if u.strip()]
    print(f"📋 تم استخراج {len(urls)} رابط قانوني نظيف من sitemap.xml.")

    payload = {
        "host": HOST,
        "key": KEY,
        "keyLocation": KEY_LOCATION,
        "urlList": urls[:10000],
    }

    req = urllib.request.Request(
        "https://api.indexnow.org/indexnow",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            print(f"✅ IndexNow API: تم إرسال {len(urls)} رابط بنجاح فوري (HTTP {resp.status}) إلى محركات البحث الداعمة!")
    except Exception as e:
        print(f"ℹ️ ملاحظة عند الإرسال إلى IndexNow: {e} (تأكد من رفع ملف {KEY}.txt أولاً عبر firebase deploy)")

    priority_gsc = [
        "https://mohamidigital.online/",
        "https://mohamidigital.online/html-sitemap-hub.html",
        "https://mohamidigital.online/legal-calculators.html",
        "https://mohamidigital.online/criminal-procedure-new.html",
        "https://mohamidigital.online/felony-appeal-generator.html",
        "https://mohamidigital.online/bailiff-notices-generator.html",
        "https://mohamidigital.online/property-buyer-checklist.html",
        "https://mohamidigital.online/inheritance-deed-generator.html",
        "https://mohamidigital.online/calculate-inheritance.html",
        "https://mohamidigital.online/calculate-alimony.html",
        "https://mohamidigital.online/real-estate-registration-fees.html",
        "https://mohamidigital.online/calculate-old-rent.html",
        "https://mohamidigital.online/calculate-building-reconciliation.html",
        "https://mohamidigital.online/appeal-deadlines.html",
        "https://mohamidigital.online/contract-generator.html",
        "https://mohamidigital.online/blog/",
        "https://mohamidigital.online/pillars/",
    ]
    print("\\n🎯 أهم الروابط المحورية لطلب فهرستها في Google Search Console (URL Inspection):")
    for i, u in enumerate(priority_gsc, 1):
        print(f"  {i:2d}. {u}")


if __name__ == "__main__":
    main()
