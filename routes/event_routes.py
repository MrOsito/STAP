import httpx
import time
from flask import request, session, jsonify, Blueprint
from urllib.parse import urljoin
from dateutil.parser import isoparse
from services.api_helpers import create_auth_header, api_error
from services.api_helpers import update_event, delete_event, get_member_events
from utils.auth_utils import login_required
from config import EVENTS_API_URL


event_bp = Blueprint("event", __name__)

@event_bp.route("/event/<event_id>")
@login_required
def get_event_detail(event_id):
    start = time.time()
    try:
        id_token = session["user"]["id_token"]
        token_time = time.time()

        url = urljoin(EVENTS_API_URL, f"/event/events/{event_id}")
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

@event_bp.route("/events")
@login_required
def fetch_events_by_range():
    print("I'm dropping into fetch by range")
 
    start = request.args.get("start")
    end = request.args.get("end")

    print(f"This is start {start)")
    print(f"This is start {end)")

    if not start or not end:
        return jsonify([])
    try:
        start_iso = isoparse(start).astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
        end_iso = isoparse(end).astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')

        print(f"This is start_iso {start_iso}")
        print(f"This is end_iso {end_iso}")

        events = get_member_events(session["user"]["member_id"], session["user"]["id_token"], start_iso, end_iso)

        formatted = [{
            "id": e.get("id", ""),
            "start": e.get("start_datetime", ""),
            "end": e.get("end_datetime", ""),
            "title": e.get("title", ""),
            "invitee_type": e.get("invitee_type", ""),
            "event_status": e.get("status", ""),
            "challenge_area": e.get("challenge_area", ""),
            "section": e.get("section", ""),
            "invitee_id": e.get("invitee_id", ""),
            "invitee_name": e.get("invitee_name", ""),
            "group_id": e.get("group_id", "")
        } for e in events]

        return jsonify(formatted)

    except Exception as e:
        print(f"[ERROR] /events: {e}")
        return api_error("Failed to fetch events")


@event_bp.route("/events", methods=["POST"])
@login_required
def create_event():
    try:
        user = session["user"]
        unit_id = user.get("unit_id")
        id_token = user.get("id_token")
        event_data = request.get_json()

        url = urljoin(EVENTS_API_URL, f"/units/{unit_id}/events")
        headers = create_auth_header(id_token, "application/json")
        with httpx.Client(timeout=10.0) as client:
            res = client.post(url, headers=headers, json=event_data)
            res.raise_for_status()
            return jsonify({"success": True})
    except httpx.HTTPError as e:
        print(f"[ERROR] Creating event: {e}")
        return api_error(str(e))