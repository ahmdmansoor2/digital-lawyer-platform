#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
google_indexing_591_automator.py
================================
سكريبت الأتمتة السحابية واليومية لطلب فهرسة 591 صفحة لموقع المحامي الرقمي:
- إرسال رسمي مباشر إلى Google Indexing API v3 (باستخدام Service Account).
- إرسال فوري إلى IndexNow API (Bing / Yandex / DuckDuckGo / Seznam).
- إشعار فوري وموجز للأستاذ أحمد منصور على تليجرام عند وجود المفاتيح.
- حفظ سجل الأيام المكتملة تلقائياً في indexing_progress.json.
"""

import os
import sys
import json
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCHEDULE_FILE = os.path.join(BASE_DIR, "mohami_85_days_schedule.json")
PROGRESS_FILE = os.path.join(BASE_DIR, "indexing_progress.json")
SITE_HOST = "mohamidigital.online"
INDEXNOW_KEY = "mohami2026indexnowkey"
INDEXNOW_KEY_LOCATION = f"https://{SITE_HOST}/{INDEXNOW_KEY}.txt"


def load_schedule():
    with open(SCHEDULE_FILE, "r", encoding="utf-8") as f:
        return json.load(f)["schedule"]


def load_progress():
    if os.path.isfile(PROGRESS_FILE):
        try:
            with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"completed_days": [], "submitted_urls": {}, "last_run": None}


def save_progress(prog):
    prog["last_run"] = datetime.now(timezone.utc).isoformat()
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump(prog, f, ensure_ascii=False, indent=2)


def get_google_credentials():
    """يحصل على بيانات اعتماد جوجل من المتغيرات البيئية أو الملفات المحلية"""
    try:
        from google.oauth2 import service_account
    except ImportError:
        print("  ⚠️ مكتبة google-auth غير مثبتة (pip install google-auth requests)")
        return None

    scopes = ["https://www.googleapis.com/auth/indexing"]

    # 1. من المتغير البيئي GOOGLE_SERVICE_ACCOUNT_JSON مباشرة
    env_json = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON") or os.environ.get("GSC_SERVICE_ACCOUNT_JSON")
    if env_json:
        try:
            info = json.loads(env_json)
            return service_account.Credentials.from_service_account_info(info, scopes=scopes)
        except Exception as e:
            print(f"  ⚠️ خطأ في قراءة مفتاح الحساب الخدمي من المتغير البيئي: {e}")

    # 2. من الملفات المحلية
    candidate_files = [
        os.path.join(BASE_DIR, "google-service-account.json"),
        os.path.join(BASE_DIR, "service_account.json"),
        os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
    ]

    for p in candidate_files:
        if p and os.path.isfile(p):
            try:
                return service_account.Credentials.from_service_account_file(p, scopes=scopes)
            except Exception as e:
                print(f"  ⚠️ خطأ في قراءة ملف المفتاح {p}: {e}")

    return None


def push_to_indexnow(urls):
    if not urls:
        return False
    payload = {
        "host": SITE_HOST,
        "key": INDEXNOW_KEY,
        "keyLocation": INDEXNOW_KEY_LOCATION,
        "urlList": urls,
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        "https://api.indexnow.org/indexnow",
        data=data,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            print(f"  ✅ [IndexNow] تم إرسال {len(urls)} رابط بنجاح (HTTP {resp.status}).")
            return True
    except urllib.error.HTTPError as e:
        print(f"  ⚠️ [IndexNow] استجابة HTTP {e.code}: {e.reason}")
    except Exception as e:
        print(f"  ⚠️ [IndexNow] تعذر الاتصال: {e}")
    return False


def push_to_google_indexing_api(urls):
    credentials = get_google_credentials()
    if not credentials:
        print("  ℹ️ لم يتم العثور على مفتاح الحساب الخدمي لجوجل (Google Service Account). تم التخطي.")
        return 0

    try:
        from google.auth.transport.requests import AuthorizedSession
    except ImportError:
        print("  ⚠️ يرجى تثبيت مكتبة requests (pip install requests)")
        return 0

    authed_session = AuthorizedSession(credentials)
    endpoint = "https://indexing.googleapis.com/v3/urlNotifications:publish"

    success_count = 0
    for u in urls:
        body = {"url": u, "type": "URL_UPDATED"}
        try:
            resp = authed_session.post(endpoint, json=body, timeout=20)
            if resp.status_code == 200:
                print(f"  ✅ [Google Indexing API] تم قبول طلب فهرسة: {u}")
                success_count += 1
            else:
                print(f"  ⚠️ [Google Indexing API] ({resp.status_code}) للرابط {u}: {resp.text[:120]}")
        except Exception as ex:
            print(f"  ⚠️ [Google Indexing API] استثناء أثناء إرسال {u}: {ex}")
        time.sleep(0.6)
    return success_count


def send_telegram_notification(day_title, urls, google_success, total_completed):
    bot_token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID")
    if not bot_token or not chat_id:
        return

    text = (
        f"⚖️ *منصة المحامي الرقمي — تقرير الأرشفة اليومي الآلي*\n\n"
        f"📅 *{day_title}*\n"
        f"✅ تم الإرسال لمحركات البحث (IndexNow): {len(urls)} روابط\n"
        f"🔍 تم الإرسال لجوجل (Google Indexing API): {google_success}/{len(urls)}\n"
        f"📊 إجمالي الأيام المكتملة: {total_completed}/85 يوماً ({total_completed * 7} رابطاً)\n\n"
        f"🔗 *عينة من روابط اليوم:*\n"
        f"• {urls[0]}\n"
        f"• {urls[1] if len(urls) > 1 else ''}\n\n"
        f"🤖 _تم التنفيذ سحابياً وبشكل تلقائي 100%._"
    )

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = json.dumps({"chat_id": chat_id, "text": text, "parse_mode": "Markdown"}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            print("  📱 [Telegram] تم إرسال إشعار الإحاطة بنجاح للأستاذ أحمد منصور.")
    except Exception as e:
        print(f"  ⚠️ [Telegram] تعذر إرسال الإشعار: {e}")


def run_day(day_number: int):
    schedule = load_schedule()
    prog = load_progress()
    target = next((d for d in schedule if d["day"] == day_number), None)
    if not target:
        print(f"❌ اليوم رقم {day_number} غير موجود في الجدول (1..{len(schedule)}).")
        sys.exit(1)

    print("=================================================================")
    print(f"🗓️ تنفيذ طلب الفهرسة لـ [{target['title']}] — ({len(target['urls'])} روابط)")
    print("=================================================================")
    for i, u in enumerate(target["urls"], 1):
        print(f"  {i}. {u}")

    print("\n1) إرسال الدفعة إلى محركات البحث عبر IndexNow API...")
    push_to_indexnow(target["urls"])

    print("\n2) إرسال الدفعة إلى Google Indexing API v3...")
    g_count = push_to_google_indexing_api(target["urls"])

    if day_number not in prog["completed_days"]:
        prog["completed_days"].append(day_number)
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    for u in target["urls"]:
        prog["submitted_urls"][u] = now_str
    save_progress(prog)

    total_done = len(prog["completed_days"])
    print(f"\n✅ تم تحديث سجل التقدم في {PROGRESS_FILE} (الأيام المكتملة: {total_done}/85).")

    # إشعار تليجرام
    send_telegram_notification(target["title"], target["urls"], g_count, total_done)


def main():
    args = sys.argv[1:]
    schedule = load_schedule()
    prog = load_progress()

    if "--indexnow-all" in args:
        all_urls = [u for d in schedule for u in d["urls"]]
        print(f"🚀 إرسال جميع روابط الخطة ({len(all_urls)} رابطاً) إلى IndexNow API...")
        push_to_indexnow(all_urls)
        return

    if "--day" in args:
        idx = args.index("--day")
        day_num = int(args[idx + 1])
        run_day(day_num)
        return

    completed = set(prog.get("completed_days", []))
    next_day = next((d["day"] for d in schedule if d["day"] not in completed), None)
    if next_day is None:
        print("🎉 تم الانتهاء من طلب فهرسة جميع الـ 85 يوماً (591 رابطاً) بالكامل!")
        return
    run_day(next_day)


if __name__ == "__main__":
    main()
