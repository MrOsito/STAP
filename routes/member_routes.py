import logging
import httpx
import json # Import json for potential error handling
from flask import Blueprint, request, session, jsonify
from urllib.parse import urljoin
from utils.auth_utils import login_required
from services.api_helpers import create_auth_header, shared_client, api_error

from config import MEMBERS_URL

# Configure logging (assuming basicConfig is done in app.py or elsewhere)
logger = logging.getLogger(__name__)

member_bp = Blueprint("member", __name__)

@member_bp.route("/members")
@login_required
def get_members():
    """Fetches members for a specified unit."""
    user_identifier = session.get("user", {}).get("username", "Unknown User")
    logger.info(f"Attempting to fetch members by {user_identifier}")

    # Get invitee_id from query parameters, default to user's unit_id from session
    invitee_id = request.args.get("invitee_id") or session["user"].get("unit_id")

    if not invitee_id:
        logger.warning(f"Neither invitee_id query param nor session unit_id available for {user_identifier}")
        return api_error("Unit ID (invitee_id) is required.", status=400) # Bad Request

    # ### Input Validation:
    # Validate that invitee_id is in the expected format (e.g., is a string or UUID).
    # This prevents potential issues if unexpected input is passed to the upstream API URL.
    # Basic example: Check if it's a string and not empty after getting it.
    if not isinstance(invitee_id, str) or not invitee_id:
        logger.warning(f"Invalid invitee_id format provided by {user_identifier}: {invitee_id}")
        return api_error("Invalid invitee ID format.", status=400)

    # ### Authorization Check:
    # Add logic here to verify if the authenticated user (`user_identifier`)
    # is authorized to fetch members for the requested `invitee_id` (unit ID).
    # For example, check if the user is a member or leader of this unit.
    user_unit_id = session["user"].get("unit_id")
    user_group_id = session["user"].get("group_id")
    user_roles = session["user"].get("member_roles", []) # Assuming roles are stored here

    # Example Authorization Logic (needs to be adapted to your actual data model and rules):
    # Allow if requesting their own unit members OR (if applicable) group members
    is_authorized = (str(invitee_id) == str(user_unit_id)) # Always allow fetching own unit members

    # Add additional conditions based on roles or relationships if needed
    # e.g., if 'Admin' in user_roles: is_authorized = True
    # e.g., if str(invitee_id) == str(user_group_id) and 'GroupLeader' in user_roles: is_authorized = True

    if not is_authorized:
         logger.warning(f"User {user_identifier} is not authorized to fetch members for unit ID: {invitee_id}")
         return api_error("You are not authorized to view members for this unit.", status=403) # Forbidden

    try:
        id_token = session["user"]["id_token"]

        url = urljoin(MEMBERS_URL, f"/units/{invitee_id}/members")
        headers = create_auth_header(id_token, "application/json")

        logger.debug(f"Fetching members from API: GET {url}")

        res = shared_client.get(url, headers=headers)
        res.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
        logger.debug(f"Successfully fetched members from API for unit ID: {invitee_id}")

        # ### XSS Consideration: Data from the API is returned as JSON.
        # The risk of XSS depends on how the client-side JavaScript
        # consumes and renders this JSON data. Ensure client-side code
        # uses methods that safely handle potential HTML/JS within string fields.
        # Server-side sanitization *before* storing data in the external API
        # is the most robust prevention.

        response_data = res.json()

        # The API helper get_profiles in api_helpers.py returns {"profiles": [...]}.
        # Assuming this endpoint might also wrap results, or expecting {"results": [...]}.
        # Safely access the expected list of members.
        members_list = response_data.get("results", []) # Assuming 'results' key based on api_helpers usage

        # Optional: Log the number of members fetched
        logger.info(f"Successfully fetched {len(members_list)} members for unit ID: {invitee_id} by {user_identifier}")

        return jsonify({"results": members_list}) # Ensure consistent response structure

    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error fetching members for unit ID {invitee_id} by {user_identifier}: {e}", exc_info=True)
        status_code = e.response.status_code
        if 400 <= status_code < 500:
             # Propagate relevant client errors (e.g., 403 Forbidden, 404 Not Found)
             return api_error(f"Failed to fetch members: {e.response.reason_phrase}", status=status_code)
        else:
             # Treat server errors from upstream as an internal server error
             return api_error("Failed to fetch members due to upstream error", status=500)
    except httpx.RequestError as e:
        logger.error(f"Request error fetching members for unit ID {invitee_id} by {user_identifier}: {e}", exc_info=True)
        return api_error("Network error while fetching members", status=503) # Service Unavailable
    except json.JSONDecodeError:
         logger.error(f"Failed to decode JSON response fetching members for unit ID {invitee_id} by {user_identifier}", exc_info=True)
         return api_error("Invalid response from upstream API", status=502) # Bad Gateway
    except KeyError as e:
         # Catch potential errors if session data is missing unexpected keys
         logger.error(f"Session key error accessing session data for {user_identifier}: {e}", exc_info=True)
         return api_error("Session data error, please log in again.", status=401) # Unauthorized
    except Exception as e:
        # Catch any other unexpected errors
        logger.error(f"An unexpected error occurred fetching members for unit ID {invitee_id} by {user_identifier}: {e}", exc_info=True)
        return api_error("An unexpected error occurred", status=500)