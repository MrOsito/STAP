from flask import Blueprint, request, session, jsonify
from urllib.parse import urljoin
import httpx
from utils.auth_utils import login_required
from services.api_helpers import create_auth_header, shared_client

from config import MEMBERS_URL

member_bp = Blueprint("member", __name__)

@member_bp.route("/members")
@login_required
def get_members():
    try:
        id_token = session["user"]["id_token"]
        unit_id = request.args.get("invitee_id") or session["user"].get("unit_id")
        url = urljoin(MEMBERS_URL, f"/units/{unit_id}/members")
        headers = create_auth_header(id_token, "application/json")
        res = shared_client.get(url, headers=headers)
        res.raise_for_status()
        return jsonify(res.json())
    except httpx.HTTPError as e:
        print(f"[ERROR] Fetching members: {e}")
        return jsonify({"results": []}), 500
