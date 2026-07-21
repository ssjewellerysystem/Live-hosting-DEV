"""
Gold & Silver Rate Scheduler
-----------------------------
Fetches daily metal rates from RapidAPI (gold-silver-live-price-india)
for Jaipur (Rajasthan) at 9:00 AM IST every day.

API Usage: 2 calls/day (gold + silver) = ~62 calls/month
           Well within the 100 free requests/month limit.

Stores result in site_settings table under key: 'metal_rates'
"""

import os
import json
import threading
import requests
import pytz
from datetime import datetime, date
from dotenv import load_dotenv

# Load .env from project root (works regardless of working directory)
_here = os.path.dirname(os.path.abspath(__file__))
_root = os.path.dirname(os.path.dirname(_here))   # backend/utils -> backend -> project root
load_dotenv(os.path.join(_root, '.env'))

from backend.extensions import db
from backend.models.settings import SiteSettingModel


# ─── Config ────────────────────────────────────────────────────────────────────
RAPIDAPI_KEY    = os.environ.get("RAPIDAPI_KEY", "")
RAPIDAPI_HOST   = "gold-silver-live-price-india.p.rapidapi.com"
CITY            = "Jaipur"          # Rajasthan capital — supported by API
IST             = pytz.timezone("Asia/Kolkata")
FETCH_HOUR_IST  = 9                 # 9:00 AM IST every day
# ────────────────────────────────────────────────────────────────────────────────


def fetch_and_store_metal_rates():
    """
    Calls the external API once for gold and once for silver,
    then saves the combined result to the database.
    Returns a dict with success flag and data/error.
    """
    if not RAPIDAPI_KEY:
        print("[GOLD-SCHEDULER] ERROR: RAPIDAPI_KEY not set in environment variables.")
        return {"success": False, "error": "RAPIDAPI_KEY not configured"}

    today = date.today().strftime("%Y-%m-%d")
    headers = {
        "Content-Type": "application/json",
        "city": CITY,
        "required-date-yyyy-mm-dd": today,
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": RAPIDAPI_KEY,
    }

    try:
        # ── Gold API call ──────────────────────────────────────────────────────
        gold_resp = requests.get(
            f"https://{RAPIDAPI_HOST}/gold_historical_price_india_city_value/",
            headers=headers,
            timeout=15
        )
        gold_resp.raise_for_status()
        gold_data = gold_resp.json()

        # ── Silver API call ────────────────────────────────────────────────────
        silver_resp = requests.get(
            f"https://{RAPIDAPI_HOST}/silver_historical_price_india_city_value/",
            headers=headers,
            timeout=15
        )
        silver_resp.raise_for_status()
        silver_data = silver_resp.json()

        # ── Build unified payload ──────────────────────────────────────────────
        now_ist = datetime.now(IST)
        payload = {
            "city": CITY,
            "state": "Rajasthan",
            "gold": {
                "22k_per_gram": gold_data.get(f"{CITY}_22k"),
                "24k_per_gram": gold_data.get(f"{CITY}_24k"),
                "22k_per_10gram": round(gold_data.get(f"{CITY}_22k", 0) * 10, 2) if gold_data.get(f"{CITY}_22k") else 0,
                "24k_per_10gram": round(gold_data.get(f"{CITY}_24k", 0) * 10, 2) if gold_data.get(f"{CITY}_24k") else 0,
                "currency": gold_data.get("Currency", "INR"),
            },
            "silver": {
                "per_gram": silver_data.get(f"{CITY}_1g"),
                "per_10gram": round(silver_data.get(f"{CITY}_1g", 0) * 10, 2) if silver_data.get(f"{CITY}_1g") else 0,
                "per_kg": round(silver_data.get(f"{CITY}_1g", 0) * 1000, 2) if silver_data.get(f"{CITY}_1g") else 0,
                "currency": silver_data.get("Currency", "INR"),
            },
            "rate_date": today,
            "updated_at": now_ist.strftime("%d %B %Y, %I:%M %p IST"),
            "updated_at_iso": now_ist.isoformat(),
        }

        # ── Save to database ───────────────────────────────────────────────────
        setting = SiteSettingModel.query.filter_by(key='metal_rates').first()
        if setting:
            setting.value = json.dumps(payload)
        else:
            setting = SiteSettingModel(key='metal_rates', value=json.dumps(payload))
            db.session.add(setting)
        db.session.commit()

        print(f"[GOLD-SCHEDULER] ✅ Rates updated successfully at {payload['updated_at']}")
        print(f"[GOLD-SCHEDULER]    Gold 22K: ₹{payload['gold']['22k_per_gram']}/g | "
              f"Gold 24K: ₹{payload['gold']['24k_per_gram']}/g | "
              f"Silver: ₹{payload['silver']['per_gram']}/g")

        return {"success": True, "data": payload}

    except requests.exceptions.RequestException as e:
        print(f"[GOLD-SCHEDULER] ❌ Network error fetching rates: {e}")
        return {"success": False, "error": str(e)}
    except Exception as e:
        print(f"[GOLD-SCHEDULER] ❌ Unexpected error: {e}")
        db.session.rollback()
        return {"success": False, "error": str(e)}


def _scheduler_loop(app):
    """
    Runs in a background thread.
    Checks every minute if it's 9:00 AM IST and triggers the fetch.
    Uses a date-lock so it only runs ONCE per calendar day.
    """
    import time
    last_fetched_date = None

    print("[GOLD-SCHEDULER] 🟢 Background scheduler started. Will fetch rates at 9:00 AM IST daily.")

    while True:
        try:
            now_ist = datetime.now(IST)
            today = now_ist.date()

            # Trigger at 9:00 AM IST (and not already fetched today)
            if now_ist.hour == FETCH_HOUR_IST and now_ist.minute == 0 and last_fetched_date != today:
                print(f"[GOLD-SCHEDULER] ⏰ 9:00 AM IST — fetching metal rates for {today}...")
                with app.app_context():
                    result = fetch_and_store_metal_rates()
                    if result["success"]:
                        last_fetched_date = today
                    else:
                        print("[GOLD-SCHEDULER] ⚠️  Fetch failed. Will retry next minute.")

            # Sleep 55 seconds (prevents double-trigger within the same minute)
            time.sleep(55)

        except Exception as e:
            print(f"[GOLD-SCHEDULER] ❌ Scheduler loop error: {e}")
            time.sleep(60)


def start_gold_rate_scheduler(app):
    """
    Starts the background scheduler thread and performs an
    immediate fetch on startup (if rates are missing or stale).
    Called from app.py inside the app context.
    """
    # ── Fetch immediately on startup if data is missing or stale ──────────────
    try:
        setting = SiteSettingModel.query.filter_by(key='metal_rates').first()
        needs_fetch = True

        if setting and setting.value:
            data = json.loads(setting.value)
            stored_date = data.get("rate_date")
            if stored_date == date.today().strftime("%Y-%m-%d"):
                needs_fetch = False
                print(f"[GOLD-SCHEDULER] ℹ️  Today's rates already in DB. Skipping startup fetch.")

        if needs_fetch:
            print("[GOLD-SCHEDULER] 🔄 No fresh rates found — fetching now on startup...")
            fetch_and_store_metal_rates()

    except Exception as e:
        print(f"[GOLD-SCHEDULER] ⚠️  Startup check error: {e}")

    # ── Launch background thread ───────────────────────────────────────────────
    thread = threading.Thread(
        target=_scheduler_loop,
        args=(app,),
        name="GoldRateScheduler",
        daemon=True          # Dies automatically when Flask exits
    )
    thread.start()
    print("[GOLD-SCHEDULER] 🟢 Scheduler thread launched (daemon=True).")
