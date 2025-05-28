# In STAP/routes/member_routes.py
from flask import Blueprint, request, session, jsonify
from urllib.parse import urljoin
import httpx
from utils.auth_utils import login_required
from services.api_helpers import create_auth_header, fetch_members, slim_member_list # ADD slim_member_list
from config import MEMBERS_URL

member_bp = Blueprint("member", __name__)

@member_bp.route("/members")
@login_required
def get_members_for_js(): # Renamed for clarity, route path is the same
    try:
        id_token = session["user"]["id_token"]
        # invitee_id from request args will determine if it's unit or a group
        # The external API call differentiates based on the URL (/units/... or /groups/...)
        # The `fetch_members` function needs to know if it's a 'unit' or 'group'.
        # This requires either more info from the client, or an assumption.
        # Let's assume invitee_id could be a unit_id or a group_id.
        # The `fetch_membersAndPopulateSelects` in JS gets `currentInviteeId`.
        # This currentInviteeId is derived from event.extendedProps.invitee_id.
        # The event data also has `invitee_type`. We should pass this to determine the entity_type.

        invitee_id = request.args.get("invitee_id")
        invitee_type = request.args.get("invitee_type", "unit") # Default to 'unit', or require client to send

        if not invitee_id:
            return jsonify({"error": "invitee_id is required"}), 400
        
        # The entity_type for fetch_members should be 'unit' or 'group'.
        # The client-side 'currentInviteeId' is just an ID.
        # The original 'fetch_members' in api_helpers took entity_type and entity_id.
        # We need to determine entity_type.
        # For now, if your JS only passes invitee_id from event.invitee_id,
        # you might need a way to know if that ID refers to a unit or a group.
        # Let's assume the JS client can pass invitee_type. If not, this needs adjustment.

        # The previous logic in fetchMembersAndPopulateSelects was:
        # if (String(inviteeId) === String(userData.unit_id)) then use unit_members
        # else use group_members.
        # This implies that `inviteeId` can be a unit ID (the user's own unit) or a group ID.
        # The JS will need to pass the 'type' of invitee_id if it can be ambiguous.
        # For now, let's assume `invitee_type` parameter is provided by the client.
        # If not, you might default to "unit" or try to infer.

        raw_members = fetch_members(id_token, invitee_type, invitee_id)
        slimmed_members = slim_member_list(raw_members)
        
        return jsonify({"results": slimmed_members}) # Ensure this matches JS expectation
    except httpx.HTTPError as e:
        print(f"[ERROR] Fetching members for JS: {e}")
        return jsonify({"results": [], "error": str(e)}), 500
    except Exception as e:
        print(f"[ERROR] Unexpected error in /members route: {e}")
        return jsonify({"results": [], "error": "An unexpected error occurred"}), 500