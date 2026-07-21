from flask import Blueprint, jsonify
from backend.extensions import db
from backend.models.settings import SiteSettingModel
import json

gold_rate_bp = Blueprint('gold_rate', __name__)


@gold_rate_bp.route('/api/gold-rate', methods=['GET'])
def get_gold_rate():
    """
    Returns the cached daily gold & silver rate for Jaipur (Rajasthan).
    This endpoint is safe for unlimited public calls — the external API
    is only called once per day by the background scheduler.
    """
    try:
        setting = SiteSettingModel.query.filter_by(key='metal_rates').first()

        if not setting or not setting.value:
            return jsonify({
                "success": False,
                "message": "Rates not yet available. Please check back after 9:00 AM IST.",
                "data": None
            }), 503

        data = json.loads(setting.value)

        return jsonify({
            "success": True,
            "message": "Rates fetched successfully.",
            "data": data
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Error fetching rates: {str(e)}",
            "data": None
        }), 500


@gold_rate_bp.route('/api/gold-rate/refresh', methods=['POST'])
def manual_refresh_gold_rate():
    """
    Admin-only manual trigger to refresh gold & silver rates immediately.
    Useful for testing or if the 9 AM scheduler missed a run.
    """
    try:
        from backend.utils.gold_rate_scheduler import fetch_and_store_metal_rates
        result = fetch_and_store_metal_rates()

        if result["success"]:
            return jsonify({
                "success": True,
                "message": "Rates refreshed successfully.",
                "data": result.get("data")
            }), 200
        else:
            return jsonify({
                "success": False,
                "message": result.get("error", "Failed to refresh rates."),
                "data": None
            }), 500

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Refresh failed: {str(e)}",
            "data": None
        }), 500
