import httpx
from flask import session
from datetime import datetime, timedelta
import time
from urllib.parse import urljoin
from config import MEMBERS_URL, EVENTS_API_URL

def create_auth_header(id_token, content_type=None):
    headers = {"Authorization": id_token}
    if content_type:
        headers["Content-Type"] = content_type
    return headers

def api_error(message, status=500):
    from flask import jsonify
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
    url = urljoin(MEMBERS_URL, f"/{entity_type}s/{entity_id}/members")
    headers = create_auth_header(id_token, "application/json")
    try:
        with httpx.Client(timeout=10.0) as client:
            res = client.get(url, headers=headers)
            res.raise_for_status()
            return res.json().get("results", [])
    except httpx.HTTPError as e:
        print(f"[ERROR] Fetching {entity_type} members: {e}")
        return []

def get_user_context(id_token, unit_id, group_id):
    def slim_member_list(members):
        return [{"id": m["id"], "first_name": m["first_name"], "last_name": m["last_name"]} for m in members]
    start_time = datetime.now()
    unit_members = slim_member_list(fetch_members(id_token, "unit", unit_id)) if unit_id else []
    group_members = slim_member_list(fetch_members(id_token, "group", group_id)) if group_id else []
    end_time = datetime.now()
    time_taken = end_time - start_time
print(f"Total time taken: {time_taken}")
    print(f"Fetched members: {time_taken.total_seconds()}s", flush=True)
    
    user = session.get("user", {})
    return {
        "user": user,
        "unit_id": unit_id,
        "group_id": group_id,
        "unit_members": unit_members,
        "group_members": group_members,
    }

def get_member_events(user_id, id_token, start=None, end=None):
    now = datetime.utcnow()
    start = start or (now - timedelta(days=90)).isoformat() + "Z"
    end = end or (now + timedelta(days=90)).isoformat() + "Z"

    url = urljoin(EVENTS_API_URL, f"/members/{user_id}/events?start_datetime={start}&end_datetime={end}")
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
            return res.json() if res.content else {"success": True, "note": "No content (204)"}
    except httpx.HTTPError as e:
        print(f"[ERROR] Updating event: {e}")
        raise

def delete_event(event_id, id_token):
    url = urljoin(EVENTS_API_URL, f"/events/{event_id}")
    headers = create_auth_header(id_token, "application/json")
    try:
        with httpx.Client(timeout=10.0) as client:
            res = client.delete(url, headers=headers)
            res.raise_for_status()
            return {"success": True}
    except httpx.HTTPError as e:
        print(f"[ERROR] Deleting event: {e}")
        raise
