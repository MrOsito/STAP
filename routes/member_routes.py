# routes/member_routes.py

import bleach
from flask import Blueprint, request, session, jsonify
from urllib.parse import urljoin
from utils.auth_utils import login_required
from services.api_helpers import shared_client, create_auth_header
from config import MEMBERS_URL

member_bp = Blueprint("member", __name__)

def sanitize_input(text: str) -> str:
    """Strip any HTML/script tags—only allow plain text."""
    return bleach.clean(text or "", tags=[], attributes={}, strip=True)

@member_bp.route("/members")
@login_required
def get_members():
    """
    Returns JSON list of members for a given invitee (unit or group).
    Sanitizes the invitee_id query parameter.
    """
    try:
        # Get and sanitize the invitee_id parameter (fallback to session value)
        raw_invitee_id = request.args.get("invitee_id") or session["user"].get("unit_id")
        invitee_id     = sanitize_input(str(raw_invitee_id))

        # Build the URL
        url = urljoin(MEMBERS_URL, f"/units/{invitee_id}/members")

        # Auth header
        id_token = session["user"]["id_token"]
        headers  = create_auth_header(id_token, "application/json")

        # Perform request
        res = shared_client.get(url, headers=headers)
        res.raise_for_status()

        # Return the JSON unmodified (results themselves should have been sanitized at source)
        return jsonify(res.json())
    except Exception as e:
        print(f"[ERROR] Fetching members: {e}")
        # Return an empty set on error
        return jsonify({"results": []}), 500



