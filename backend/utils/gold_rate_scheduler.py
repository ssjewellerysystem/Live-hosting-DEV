"""
Gold & Silver Rate Scheduler
-----------------------------
Fetches daily metal rates from RapidAPI (gold-silver-live-price-india)
for Jaipur (Rajasthan) at 9:00 AM IST every day.

Stores result in `gold_rates` table and marks today's records as is_latest = True.
"""

import os
import json
import threading
import urllib.request
import pytz
from datetime import datetime, date
from dotenv import load_dotenv

# Load .env from project root
_here = os.path.dirname(os.path.abspath(__file__))
_root = os.path.dirname(os.path.dirname(_here))
load_dotenv(os.path.join(_root, '.env'))

from backend.extensions import db
from backend.models.settings import SiteSettingModel
from backend.models.gold_rate import GoldRateModel

RAPIDAPI_KEY    = os.environ.get("RAPIDAPI_KEY", "035bac519fmsh0a6d0f6755a8814p16eab0jsn9e0527c5c3d0")
RAPIDAPI_HOST   = "gold-silver-live-price-india.p.rapidapi.com"
CITY            = "Jaipur"
STATE           = "Rajasthan"
IST             = pytz.timezone("Asia/Kolkata")
FETCH_HOUR_IST  = 9


def fetch_and_store_metal_rates():
    """
    Fetches gold and silver rates from RapidAPI via urllib.request,
    inserts/updates records in `gold_rates` database table,
    and marks today's records as `is_latest = True`.
    """
    now_ist = datetime.now(IST)
    today_str = date.today().strftime("%Y-%m-%d")

    g22_val = 13534.0
    g24_val = 14211.0
    silver_val = 245.0

    headers = {
        "Content-Type": "application/json",
        "city": CITY,
        "required-date-yyyy-mm-dd": today_str,
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": RAPIDAPI_KEY,
    }

    # Fetch Gold Rate from RapidAPI
    try:
        req_gold = urllib.request.Request(
            f"https://{RAPIDAPI_HOST}/gold_historical_price_india_city_value/",
            headers=headers
        )
        with urllib.request.urlopen(req_gold, timeout=15) as resp:
            if resp.status == 200:
                g_data = json.loads(resp.read().decode('utf-8'))
                if g_data.get(f"{CITY}_22k"):
                    g22_val = float(g_data[f"{CITY}_22k"])
                if g_data.get(f"{CITY}_24k"):
                    g24_val = float(g_data[f"{CITY}_24k"])
                print(f"[GOLD-SCHEDULER] RapidAPI Gold Success: 24K=₹{g24_val}/g, 22K=₹{g22_val}/g")
    except Exception as e:
        print(f"[GOLD-SCHEDULER] ⚠️ Error fetching Gold from RapidAPI: {e}")

    # Fetch Silver Rate from RapidAPI
    try:
        req_silver = urllib.request.Request(
            f"https://{RAPIDAPI_HOST}/silver_historical_price_india_city_value/",
            headers=headers
        )
        with urllib.request.urlopen(req_silver, timeout=15) as resp:
            if resp.status == 200:
                s_data = json.loads(resp.read().decode('utf-8'))
                if s_data.get(f"{CITY}_1g"):
                    silver_val = float(s_data[f"{CITY}_1g"])
                print(f"[GOLD-SCHEDULER] RapidAPI Silver Success: Silver=₹{silver_val}/g")
    except Exception as e:
        print(f"[GOLD-SCHEDULER] ⚠️ Error fetching Silver from RapidAPI: {e}")

    payload = {
        "city": CITY,
        "state": STATE,
        "gold": {
            "22k_per_gram": g22_val,
            "24k_per_gram": g24_val,
            "22k_per_10gram": round(g22_val * 10, 2),
            "24k_per_10gram": round(g24_val * 10, 2),
            "currency": "INR"
        },
        "silver": {
            "per_gram": silver_val,
            "per_10gram": round(silver_val * 10, 2),
            "per_kg": round(silver_val * 1000, 2),
            "currency": "INR"
        },
        "rate_date": today_str,
        "updated_at": now_ist.strftime("%d %B %Y, %I:%M %p IST"),
        "updated_at_iso": now_ist.isoformat(),
    }

    try:
        # Step 1: Mark all older records as not latest
        GoldRateModel.query.update({GoldRateModel.is_latest: False})

        # Step 2: Save/Update Gold Record in `gold_rates`
        existing_gold = GoldRateModel.query.filter_by(effective_date=today_str, metal_type='gold').first()
        if existing_gold:
            existing_gold.rate_per_gram = g24_val
            existing_gold.price_24k = g24_val
            existing_gold.price_22k = g22_val
            existing_gold.price_18k = round(g24_val * 0.75, 2)
            existing_gold.price_14k = round(g24_val * 0.585, 2)
            existing_gold.fetched_at = datetime.utcnow()
            existing_gold.is_latest = True
        else:
            new_gold = GoldRateModel(
                metal_type='gold',
                purity='24k',
                city=CITY,
                state=STATE,
                rate_per_gram=g24_val,
                price_24k=g24_val,
                price_22k=g22_val,
                price_18k=round(g24_val * 0.75, 2),
                price_14k=round(g24_val * 0.585, 2),
                currency='INR',
                source='RapidAPI',
                effective_date=today_str,
                fetched_at=datetime.utcnow(),
                is_latest=True
            )
            db.session.add(new_gold)

        # Step 3: Save/Update Silver Record in `gold_rates`
        existing_silver = GoldRateModel.query.filter_by(effective_date=today_str, metal_type='silver').first()
        if existing_silver:
            existing_silver.rate_per_gram = silver_val
            existing_silver.fetched_at = datetime.utcnow()
            existing_silver.is_latest = True
        else:
            new_silver = GoldRateModel(
                metal_type='silver',
                purity='1g',
                city=CITY,
                state=STATE,
                rate_per_gram=silver_val,
                currency='INR',
                source='RapidAPI',
                effective_date=today_str,
                fetched_at=datetime.utcnow(),
                is_latest=True
            )
            db.session.add(new_silver)

        # Step 4: Fallback cache to SiteSettingModel
        setting = SiteSettingModel.query.filter_by(key='metal_rates').first()
        if setting:
            setting.value = json.dumps(payload)
        else:
            setting = SiteSettingModel(key='metal_rates', value=json.dumps(payload))
            db.session.add(setting)

        db.session.commit()
        print(f"[GOLD-SCHEDULER] ✅ Today's Gold (₹{g24_val}/g) & Silver (₹{silver_val}/g) saved to gold_rates DB table for {today_str}")
        return {"success": True, "data": payload}

    except Exception as e:
        print(f"[GOLD-SCHEDULER] ❌ Error saving to gold_rates database: {e}")
        db.session.rollback()
        return {"success": False, "error": str(e)}


def _scheduler_loop(app):
    import time
    last_fetched_date = None
    print("[GOLD-SCHEDULER] 🟢 Background scheduler started. Will fetch rates at 9:00 AM IST daily.")

    while True:
        try:
            now_ist = datetime.now(IST)
            today = now_ist.date()

            if now_ist.hour == FETCH_HOUR_IST and now_ist.minute == 0 and last_fetched_date != today:
                print(f"[GOLD-SCHEDULER] ⏰ 9:00 AM IST — fetching metal rates for {today}...")
                with app.app_context():
                    result = fetch_and_store_metal_rates()
                    if result["success"]:
                        last_fetched_date = today
                    else:
                        print("[GOLD-SCHEDULER] ⚠️ Fetch failed. Will retry next minute.")

            time.sleep(55)
        except Exception as e:
            print(f"[GOLD-SCHEDULER] ❌ Scheduler loop error: {e}")
            time.sleep(60)


def start_gold_rate_scheduler(app):
    try:
        today_str = date.today().strftime("%Y-%m-%d")
        existing = GoldRateModel.query.filter_by(effective_date=today_str, is_latest=True).first()
        if not existing:
            print("[GOLD-SCHEDULER] 🔄 No rates for today in gold_rates table — running initial fetch...")
            fetch_and_store_metal_rates()
        else:
            print("[GOLD-SCHEDULER] ℹ️ Today's rates already present in gold_rates DB table.")
    except Exception as e:
        print(f"[GOLD-SCHEDULER] ⚠️ Startup check error: {e}")

    thread = threading.Thread(
        target=_scheduler_loop,
        args=(app,),
        name="GoldRateScheduler",
        daemon=True
    )
    thread.start()
    print("[GOLD-SCHEDULER] 🟢 Scheduler thread launched (daemon=True).")
