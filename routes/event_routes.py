from flask import request, session, jsonify
from services.api_helpers import create_auth_header, api_error, update_event, delete_event
from urllib.parse import urljoin
from utils.auth_utils import login_required
import httpx
import time

event_bp = Blueprint("event", __name__)


@event_bp.route("/event/<event_id>")
@login_required
def get_event_detail(event_id):
    start = time.time()
    try:
        id_token = session["user"]["id_token"]
        token_time = time.time()

        url = urljoin(EVENTS_API_URL, f"/events/{event_id}")
        headers = create_auth_header(id_token, "application/json")
        with httpx.Client(timeout=10.0) as client:
            res = client.get(url, headers=headers)
            res.raise_for_status()
        fetch_time = time.time()

        event_data = res.json()
        parse_time = time.time()

        print(f"[DEBUG] Event size: {len(str(event_data))} characters")
        print(f"TIMING: token={token_time-start:.3f}s fetch={fetch_time-token_time:.3f}s parse={parse_time-fetch_time:.3f}s")

        response = jsonify(event_data)
        end_time = time.time()
        print(f"[DEBUG] jsonify() complete in {end_time - parse_time:.3f}s")

        return response
    except httpx.HTTPError as e:
        print(f"[ERROR] Fetching event {event_id}: {e}")
        return api_error("Failed to fetch event detail")
    

@event_bp.route("/event/<event_id>", methods=["PATCH"])
@login_required
def patch_event(event_id):
    try:
        id_token = session["user"]["id_token"]
        event_data = request.get_json()
        update_event(event_id, event_data, id_token)
        return jsonify({"success": True})
    except Exception as e:
        print(f"[ERROR] Patching event {event_id}: {e}")
        return api_error(str(e))


@event_bp.route("/event/<event_id>", methods=["DELETE"])
@login_required
def delete_event_route(event_id):
    try:
        id_token = session["user"]["id_token"]
        delete_event(event_id, id_token)
        return jsonify({"success": True})
    except Exception as e:
        print(f"[ERROR] Deleting event {event_id}: {e}")
        return api_error(str(e))