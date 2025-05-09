# routes/event_routes.py

import time
import bleach
from flask import Blueprint, request, session, jsonify
from urllib.parse import urljoin
from dateutil.parser import isoparse
from datetime import timezone
from utils.auth_utils import login_required
from services.api_helpers import (
    shared_client,
    create_auth_header,
    api_error,
    get_member_events,
    update_event,
    delete_event, sanitise_json
)
from config import EVENTS_API_URL

event_bp = Blueprint("event", __name__)

def sanitize_input(text: str) -> str:
    """Strip any HTML/script tags—only allow plain text."""
    return bleach.clean(text or "", tags=[], attributes={}, strip=True)

@event_bp.route("/events", methods=["POST"])
@login_required
def create_event():
    """
    Create a new event. We sanitize title, description and location
    to remove any HTML or script content.
    """
    try:
        user     = session["user"]
        print(f"[INFO] Creating event for user: {user}", flush=True)
        unit_id  = user["unit_id"]
        print(f"[INFO] unit_id: {unit_id}", flush=True) 
        id_token = user["id_token"]
        print(f"[INFO] id_token: {id_token}", flush=True)   
        raw      = request.get_json() or {}
        print(f"[INFO] raw: {raw}", flush=True)

        payload = sanitise_json(raw)

        print(f"[INFO] payload: {payload}", flush=True) 
        url     = urljoin(EVENTS_API_URL, f"/units/{unit_id}/events")
        print(f"[INFO] url: {url}", flush=True)
        headers = create_auth_header(id_token, "application/json")
        print(f"[INFO] headers: {headers}", flush=True)
        res     = shared_client.post(url, headers=headers, json=payload)
        print(f"[INFO] res: {res}", flush=True)
        res.raise_for_status()
        return jsonify({"success": True})
    except Exception as e:
        print(f"[ERROR] Creating event: {e}")
        return api_error(str(e))


@event_bp.route("/event/<event_id>", methods=["PATCH"])
@login_required
def patch_event(event_id):
    """
    Update an existing event. Sanitizes any free-text fields.
    """
    try:
        print(f"[INFO] Patching event {event_id}")
        id_token = session["user"]["id_token"]
        print(f"[INFO] id_token: {id_token}")
        raw      = request.get_json() or {}
        print(f"[INFO] raw: {raw}")
        payload = {
            "title":       sanitize_input(raw.get("title", "")),
            "description": sanitize_input(raw.get("description", "")),
            "location":    sanitize_input(raw.get("location", "")),
            "start_datetime": raw.get("start_datetime"),
            "end_datetime":   raw.get("end_datetime"),
            # add other keys as needed
        }

        updated = update_event(event_id, payload, id_token)
        return jsonify(updated)
    except Exception as e:
        print(f"[ERROR] Patching event {event_id}: {e}")
        return api_error(str(e))


@event_bp.route("/event/<event_id>", methods=["DELETE"])
@login_required
def delete_event_route(event_id):
    """
    Delete an event.
    """
    try:
        id_token = session["user"]["id_token"]
        result   = delete_event(event_id, id_token)
        return jsonify(result)
    except Exception as e:
        print(f"[ERROR] Deleting event {event_id}: {e}")
        return api_error(str(e))


@event_bp.route("/event/<event_id>")
@login_required
def get_event_detail(event_id):
    try:
        id_token = session["user"]["id_token"]
        url = urljoin(EVENTS_API_URL, f"/events/{event_id}")
        headers = create_auth_header(id_token, "application/json")

        res = shared_client.get(url, headers=headers)
        res.raise_for_status()

        return jsonify(res.json())
    except KeyError:
        return api_error("Session expired. Please log in again.", 401)
    except httpx.HTTPStatusError as e:
        print(f"[ERROR] Terrain API error: {e.response.status_code} - {e.response.text}")
        return api_error(f"Terrain API returned {e.response.status_code}", e.response.status_code)
    except Exception as e:
        print(f"[ERROR] Unexpected error fetching event {event_id}: {e}")
        return api_error("Unexpected error occurred", 500)



@event_bp.route("/events")
@login_required
def fetch_events_by_range():
    """
    Fetch all events in a start/end range.
    """
    start = request.args.get("start")
    end   = request.args.get("end")
    if not start or not end:
        return jsonify([])

    try:
        start_iso = isoparse(start).astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
        end_iso   = isoparse(end).astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')

        events = get_member_events(
            session["user"]["member_id"],
            session["user"]["id_token"],
            start_iso,
            end_iso
        )

        formatted = []
        for e in events:
            formatted.append({
                "id":           e.get("id", ""),
                "start":        e.get("start_datetime", ""),
                "end":          e.get("end_datetime", ""),
                "title":        sanitize_input(e.get("title", "")),
                "invitee_type": e.get("invitee_type", ""),
                "event_status": e.get("status", ""),
                "challenge_area": e.get("challenge_area", ""),
                "section":      e.get("section", ""),
                "invitee_id":   e.get("invitee_id", ""),
                "invitee_name": sanitize_input(e.get("invitee_name", "")),
                "group_id":     e.get("group_id", "")
            })

        return jsonify(formatted)

    except Exception as e:
        print(f"[ERROR] /events: {e}")
        return api_error("Failed to fetch events")
