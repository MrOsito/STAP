# STAP/services/api_helpers.py
import httpx
from flask import session # session is used by get_user_details_from_session
from datetime import datetime, timedelta
from urllib.parse import urljoin
from config import MEMBERS_URL, EVENTS_API_URL

def create_auth_header(id_token, content_type=None):
    headers = {"Authorization": id_token}
    if content_type:
        headers["Content-Type"] = content_type
    return headers

def api_error(message, status=500):
    from flask import jsonify # Keep import local to function if only used here
    return jsonify({"error": message}), status

def get_profiles(id_token):
    url = urljoin(MEMBERS_URL, "/profiles")
    headers = create_auth_header(id_token)
    try:
        with httpx.Client(timeout=10.0) as client:
            res = client.get(url, headers=headers)
            res.raise_for_status()
            return res.json()
    except httpx.HTTPError as e:
        print(f"[ERROR] Fetching profiles: {e}")
        return {}

def fetch_members(id_token, entity_type, entity_id):
    """
    Fetches raw member list for a given entity (unit or group).
    This will be called by your /members API route.
    """
    if entity_type not in ["unit", "group"]:
        print(f"[ERROR] Invalid entity_type for fetch_members: {entity_type}")
        return []
    
    url = urljoin(MEMBERS_URL, f"/{entity_type}s/{entity_id}/members")
    headers = create_auth_header(id_token, "application/json")
    try:
        with httpx.Client(timeout=10.0) as client:
            res = client.get(url, headers=headers)
            res.raise_for_status()
            return res.json().get("results", [])
    except httpx.HTTPError as e:
        print(f"[ERROR] Fetching {entity_type} members for ID {entity_id}: {e}")
        return []

def slim_member_list(members):
    """
    Processes a list of raw member details to a slimmer format.
    This will be called by your /members API route after fetching.
    """
    if not members:
        return []
    return [{"id": m.get("id"), "first_name": m.get("first_name"), "last_name": m.get("last_name")} for m in members]

# NEW function to get basic user details without fetching member lists
def get_user_details_from_session():
    """
    Constructs user details primarily from data already in flask.session.
    This function DOES NOT fetch member lists.
    """
    user_session_data = session.get("user") # Get the user data stored at login
    if not user_session_data:
        return {}

    return {
        "user": user_session_data,
        "unit_id": user_session_data.get("unit_id"),
        "group_id": user_session_data.get("group_id")
        # Add any other essential, non-list user context if needed here
    }

# --- Other existing functions like get_member_events, update_event, delete_event ---
# Ensure they are compatible with these changes if they relied on the old get_user_context

def get_member_events(user_id, id_token, start=None, end=None):
    now = datetime.utcnow()
    # Ensure start and end are correctly formatted ISO strings if provided
    start_str = start if start else (now - timedelta(days=90)).isoformat() + "Z"
    end_str = end if end else (now + timedelta(days=90)).isoformat() + "Z"

    url = urljoin(EVENTS_API_URL, f"/members/{user_id}/events?start_datetime={start_str}&end_datetime={end_str}")
    headers = create_auth_header(id_token, "application/json")
    try:
        with httpx.Client(timeout=10.0) as client:
            res = client.get(url, headers=headers)
            res.raise_for_status()
            return res.json().get("results", [])
    except httpx.HTTPError as e:
        print(f"[ERROR] Fetching member events: {e}")
        return []

def update_event(event_id, event_data, id_token):
    url = urljoin(EVENTS_API_URL, f"/events/{event_id}")
    headers = create_auth_header(id_token, "application/json")
    try:
        with httpx.Client(timeout=10.0) as client:
            res = client.patch(url, headers=headers, json=event_data)
            res.raise_for_status()
            return res.json() if res.content and res.status_code != 204 else {"success": True, "status_code": res.status_code}
    except httpx.HTTPError as e:
        print(f"[ERROR] Updating event {event_id}: {e}")
        # It might be better to return an error structure or let the route handle it
        raise

def delete_event(event_id, id_token):
    url = urljoin(EVENTS_API_URL, f"/events/{event_id}")
    headers = create_auth_header(id_token) # Content-Type not typically needed for DELETE
    try:
        with httpx.Client(timeout=10.0) as client:
            res = client.delete(url, headers=headers)
            res.raise_for_status() # Will raise for 4xx/5xx responses
            return {"success": True, "status_code": res.status_code}
    except httpx.HTTPError as e:
        print(f"[ERROR] Deleting event {event_id}: {e}")
        raise