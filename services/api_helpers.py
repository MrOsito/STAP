# services/api_helpers.py

import httpx
import html
from flask import session
from datetime import datetime, timedelta
from urllib.parse import urljoin
from config import MEMBERS_URL, EVENTS_API_URL

# Shared HTTP client for performance (connection pooling, re-use)
shared_client = httpx.Client(timeout=10.0)


def create_auth_header(id_token: str, content_type: str = None) -> dict:
    """
    Build the Authorization header for Terrain/Members API calls.
    """
    headers = {"Authorization": id_token}
    if content_type:
        headers["Content-Type"] = content_type
    return headers


def api_error(message: str, status: int = 500):
    """
    Return a standard JSON error response and HTTP status code.
    """
    from flask import jsonify
    return jsonify({"error": message}), status


def get_profiles(id_token: str) -> dict:
    """
    Fetch user profiles from the Members API.
    """
    url = urljoin(MEMBERS_URL, "/profiles")
    headers = create_auth_header(id_token)
    try:
        res = shared_client.get(url, headers=headers)
        res.raise_for_status()
        return res.json()
    except httpx.HTTPError as e:
        print(f"[ERROR] Fetching profiles: {e}")
        return {}


def fetch_members(id_token: str, entity_type: str, entity_id: str) -> list:
    """
    Fetch members of a unit or group.
    """
    url = urljoin(MEMBERS_URL, f"/{entity_type}s/{entity_id}/members")
    headers = create_auth_header(id_token, "application/json")
    try:
        res = shared_client.get(url, headers=headers)
        res.raise_for_status()
        return res.json().get("results", [])
    except httpx.HTTPError as e:
        print(f"[ERROR] Fetching {entity_type} members: {e}")
        return []


def get_user_context(id_token: str, unit_id: str, group_id: str) -> dict:
    """
    Build the g.context dict for templates, including
    lists of unit_members and group_members.
    """
    def slim_member_list(members):
        return [
            {"id": m["id"], "first_name": m["first_name"], "last_name": m["last_name"]}
            for m in members
        ]

    unit_members = slim_member_list(fetch_members(id_token, "unit", unit_id)) if unit_id else []
    group_members = slim_member_list(fetch_members(id_token, "group", group_id)) if group_id else []

    user = session.get("user", {})
    return {
        "user": user,
        "unit_id": unit_id,
        "group_id": group_id,
        "unit_members": unit_members,
        "group_members": group_members,
    }


def get_member_events(user_id: str, id_token: str, start: str = None, end: str = None) -> list:
    """
    Fetch calendar events for a member in a given date range.
    """
    now = datetime.utcnow()
    start = start or (now - timedelta(days=90)).isoformat() + "Z"
    end   = end   or (now + timedelta(days=90)).isoformat() + "Z"

    url = urljoin(
        EVENTS_API_URL,
        f"/members/{user_id}/events?start_datetime={start}&end_datetime={end}"
    )
    headers = create_auth_header(id_token, "application/json")
    try:
        res = shared_client.get(url, headers=headers)
        res.raise_for_status()
        return res.json().get("results", [])
    except httpx.HTTPError as e:
        print(f"[ERROR] Fetching member events: {e}")
        return []


def update_event(event_id: str, event_data: dict, id_token: str):
    """
    Patch an existing event via the Events API.
    """
    url = urljoin(EVENTS_API_URL, f"/events/{event_id}")
    headers = create_auth_header(id_token, "application/json")
    try:
        res = shared_client.patch(url, headers=headers, json=event_data)
        res.raise_for_status()
        return res.json() if res.content else {"success": True, "note": "No content (204)"}
    except httpx.HTTPError as e:
        print(f"[ERROR] Updating event: {e}")
        raise


def delete_event(event_id: str, id_token: str) -> dict:
    """
    Delete an event via the Events API.
    """
    url = urljoin(EVENTS_API_URL, f"/events/{event_id}")
    headers = create_auth_header(id_token, "application/json")
    try:
        res = shared_client.delete(url, headers=headers)
        res.raise_for_status()
        return {"success": True}
    except httpx.HTTPError as e:
        print(f"[ERROR] Deleting event: {e}")
        raise


def sanitise_json(obj, exclude_keys=None, level=0):
    """
    Recursively sanitize strings in a JSON object.
    - Only sanitizes string values at top level (level 0).
    - Skips keys in `exclude_keys`.
    """
    exclude_keys = set(exclude_keys or [])

    if isinstance(obj, dict):
        return {
            k: sanitise_json(v, exclude_keys, level + 1)
            if isinstance(v, (dict, list))
            else (
                html.escape(v.strip()) if isinstance(v, str) and k not in exclude_keys and level == 0
                else v
            )
            for k, v in obj.items()
        }

    elif isinstance(obj, list):
        return [
            sanitise_json(item, exclude_keys, level + 1)
            for item in obj
        ]

    return obj
