import logging
import httpx
import time
import json # Import json for potential error handling
from flask import request, session, jsonify, Blueprint, current_app
from urllib.parse import urljoin
from dateutil.parser import isoparse
from datetime import datetime, timezone
from services.api_helpers import create_auth_header, api_error, shared_client
from services.api_helpers import update_event, delete_event, get_member_events
from utils.auth_utils import login_required
from config import EVENTS_API_URL

# Configure logging (assuming basicConfig is done in app.py or elsewhere)
logger = logging.getLogger(__name__)


event_bp = Blueprint("event", __name__)

@event_bp.route("/event/<event_id>")
@login_required
def get_event_detail(event_id):
    """Fetches and returns details for a specific event."""
    start_time = time.time() # Use a more descriptive variable name
    user_identifier = session.get("user", {}).get("username", "Unknown User")
    logger.info(f"Attempting to fetch event detail for ID: {event_id} by {user_identifier}")

    if not event_id:
         logger.warning(f"Received request for empty event_id by {user_identifier}")
         return api_error("Event ID is required", status=400) # Bad Request

    try:
        id_token = session["user"]["id_token"]
        token_acquisition_time = time.time() # More descriptive

        url = urljoin(EVENTS_API_URL, f"/events/{event_id}")
        headers = create_auth_header(id_token, "application/json")

        # Log the outgoing API request (optional, but useful for debugging)
        logger.debug(f"Fetching event from API: GET {url}")

        res = shared_client.get(url, headers=headers)
        res.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
        fetch_complete_time = time.time()

        event_data = res.json()
        parse_complete_time = time.time()

        logger.debug(f"Successfully fetched event {event_id}. Size: {len(str(event_data))} chars.")
        logger.debug(f"Timing for event {event_id}: token={token_acquisition_time-start_time:.3f}s fetch={fetch_complete_time-token_acquisition_time:.3f}s parse={parse_complete_time-fetch_complete_time:.3f}s")

        # ### XSS Consideration: Data from the API is returned as JSON.
        # The risk of XSS here depends on how the client-side JavaScript
        # consumes and renders this JSON data. Ensure that client-side rendering
        # uses methods that safely handle potential HTML/JS within string fields
        # (e.g., .textContent instead of .innerHTML).
        # Server-side sanitization of data *before* storing it in the external
        # API is the most robust approach to prevent malicious data from
        # entering the system in the first place.

        response = jsonify(event_data)
        end_time = time.time()
        logger.debug(f"jsonify() for event {event_id} complete in {end_time - parse_complete_time:.3f}s")
        logger.debug(f"TOTAL TIMING for event {event_id}: {end_time-start_time:.3f}s")

        return response
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error fetching event {event_id} by {user_identifier}: {e}", exc_info=True)
        # Use the status code from the upstream API if it's a client error (4xx)
        status_code = e.response.status_code
        if 400 <= status_code < 500:
             # Pass client errors back, potentially with a generic message
             return api_error(f"Failed to fetch event detail: {e.response.reason_phrase}", status=status_code)
        else:
             # Treat server errors from upstream as an internal server error
             return api_error("Failed to fetch event detail due to upstream error", status=500)
    except httpx.RequestError as e:
        logger.error(f"Request error fetching event {event_id} by {user_identifier}: {e}", exc_info=True)
        return api_error("Network error while fetching event detail", status=503) # Service Unavailable
    except json.JSONDecodeError:
         logger.error(f"Failed to decode JSON response for event {event_id} by {user_identifier}", exc_info=True)
         return api_error("Invalid response from upstream API", status=502) # Bad Gateway
    except KeyError as e:
         # Catch potential errors if session data is missing unexpected keys
         logger.error(f"Session key error accessing session data for {user_identifier}: {e}", exc_info=True)
         return api_error("Session data error, please log in again.", status=401) # Unauthorized
    except Exception as e:
        # Catch any other unexpected errors
        logger.error(f"An unexpected error occurred fetching event {event_id} by {user_identifier}: {e}", exc_info=True)
        return api_error("An unexpected error occurred", status=500)


@event_bp.route("/event/<event_id>", methods=["PATCH"])
@login_required
def patch_event(event_id):
    """Updates details for a specific event."""
    user_identifier = session.get("user", {}).get("username", "Unknown User")
    logger.info(f"Attempting to patch event ID: {event_id} by {user_identifier}")

    if not event_id:
         logger.warning(f"Received PATCH request for empty event_id by {user_identifier}")
         return api_error("Event ID is required", status=400) # Bad Request

    try:
        id_token = session["user"]["id_token"]
        event_data = request.get_json()

        if event_data is None:
             logger.warning(f"Received empty or invalid JSON payload for event {event_id} patch by {user_identifier}")
             return api_error("Invalid JSON payload", status=400) # Bad Request

        # ### Input Validation and Sanitization:
        # Before sending event_data to the upstream API, you should validate
        # and potentially sanitize the incoming data from the client.
        # This prevents the client from sending malformed or malicious data
        # upstream. Validation could check for required fields, data types,
        # string lengths, and valid values (e.g., for status or challenge area).
        # Sanitization might involve cleaning up string inputs if they are
        # intended to be displayed later in a way that could be vulnerable
        # if not properly encoded (though API-side sanitization is also common).
        # Example (basic check):
        if 'title' in event_data and not isinstance(event_data['title'], str) or len(event_data.get('title', '')) > 100:
             logger.warning(f"Invalid title in patch payload for event {event_id} by {user_identifier}")
             return api_error("Invalid or too long title", status=400) # Bad Request
        # Add more validation for other fields as per your data model

        # ### Authorization Check:
        # Add logic here to verify if the authenticated user (`user_identifier`)
        # has the necessary permissions to modify this specific `event_id`.
        # This is crucial for security beyond just being logged in.

        logger.debug(f"Patching event {event_id} with data: {event_data}")

        update_event(event_id, event_data, id_token)

        logger.info(f"Successfully patched event {event_id} by {user_identifier}")
        return jsonify({"success": True})
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error patching event {event_id} by {user_identifier}: {e}", exc_info=True)
        status_code = e.response.status_code
        # Propagate relevant client errors (e.g., 403 Forbidden, 404 Not Found)
        if 400 <= status_code < 500:
             return api_error(f"Failed to update event: {e.response.reason_phrase}", status=status_code)
        else:
             return api_error("Failed to update event due to upstream error", status=500)
    except httpx.RequestError as e:
        logger.error(f"Request error patching event {event_id} by {user_identifier}: {e}", exc_info=True)
        return api_error("Network error while updating event", status=503)
    except json.JSONDecodeError:
         logger.error(f"Failed to decode JSON request body for event {event_id} patch by {user_identifier}", exc_info=True)
         return api_error("Invalid JSON payload provided", status=400)
    except KeyError as e:
         logger.error(f"Session key error accessing session data for {user_identifier}: {e}", exc_info=True)
         return api_error("Session data error, please log in again.", status=401)
    except Exception as e:
        logger.error(f"An unexpected error occurred patching event {event_id} by {user_identifier}: {e}", exc_info=True)
        return api_error("An unexpected error occurred", status=500)


@event_bp.route("/event/<event_id>", methods=["DELETE"])
@login_required
def delete_event_route(event_id):
    """Deletes a specific event."""
    user_identifier = session.get("user", {}).get("username", "Unknown User")
    logger.info(f"Attempting to delete event ID: {event_id} by {user_identifier}")

    if not event_id:
         logger.warning(f"Received DELETE request for empty event_id by {user_identifier}")
         return api_error("Event ID is required", status=400) # Bad Request

    try:
        id_token = session["user"]["id_token"]

        # ### Authorization Check:
        # Add logic here to verify if the authenticated user (`user_identifier`)
        # has the necessary permissions to delete this specific `event_id`.

        logger.debug(f"Deleting event {event_id} via API")
        delete_event(event_id, id_token)

        logger.info(f"Successfully deleted event {event_id} by {user_identifier}")
        return jsonify({"success": True})
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error deleting event {event_id} by {user_identifier}: {e}", exc_info=True)
        status_code = e.response.status_code
        if 400 <= status_code < 500:
             return api_error(f"Failed to delete event: {e.response.reason_phrase}", status=status_code)
        else:
             return api_error("Failed to delete event due to upstream error", status=500)
    except httpx.RequestError as e:
        logger.error(f"Request error deleting event {event_id} by {user_identifier}: {e}", exc_info=True)
        return api_error("Network error while deleting event", status=503)
    except KeyError as e:
         logger.error(f"Session key error accessing session data for {user_identifier}: {e}", exc_info=True)
         return api_error("Session data error, please log in again.", status=401)
    except Exception as e:
        logger.error(f"An unexpected error occurred deleting event {event_id} by {user_identifier}: {e}", exc_info=True)
        return api_error("An unexpected error occurred", status=500)


@event_bp.route("/events")
@login_required
def fetch_events_by_range():
    """Fetches events within a specified date range."""
    user_identifier = session.get("user", {}).get("username", "Unknown User")
    logger.info(f"Attempting to fetch events by range for {user_identifier}")

    start_str = request.args.get("start")
    end_str = request.args.get("end")

    if not start_str or not end_str:
        logger.warning(f"Missing start or end date in request by {user_identifier}")
        # Return an empty list and a 400 status code for bad request
        return api_error("Start and end dates are required query parameters.", status=400)

    try:
        # Input Validation: Parse dates and handle potential errors
        start_iso = isoparse(start_str).astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
        end_iso = isoparse(end_str).astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')

        # Optional: Add checks for date ranges (e.g., end after start, range not too large)
        start_date = isoparse(start_str)
        end_date = isoparse(end_str)
        if start_date >= end_date:
             logger.warning(f"Invalid date range (start >= end) provided by {user_identifier}")
             return api_error("Start date must be before end date.", status=400)

        # Optional: Limit the maximum date range allowed to prevent abuse
        # max_range_days = 365
        # if (end_date - start_date).days > max_range_days:
        #      logger.warning(f"Date range too large provided by {user_identifier}")
        #      return api_error(f"Date range cannot exceed {max_range_days} days.", status=400)

    except ValueError as e:
        logger.warning(f"Invalid date format provided by {user_identifier}: {e}")
        return api_error("Invalid date format. Please use ISO 8601 format.", status=400)
    except Exception as e:
         logger.error(f"An unexpected error occurred during date parsing for {user_identifier}: {e}", exc_info=True)
         return api_error("An unexpected error occurred processing dates.", status=500)


    try:
        # ### Authorization Check:
        # Consider if the user is allowed to fetch events for the specified
        # member_id (which comes from their session).

        logger.debug(f"Fetching events for member {session['user'].get('member_id')} between {start_iso} and {end_iso}")
        events = get_member_events(session["user"]["member_id"], session["user"]["id_token"], start_iso, end_iso)

        # ### XSS Consideration: Data returned from get_member_events comes
        # from the external API. The mapping below creates a new dictionary.
        # Ensure that the values assigned to keys like "title" are handled safely
        # by the client-side JavaScript that consumes this JSON.

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

        logger.info(f"Successfully fetched {len(formatted)} events for {user_identifier}")
        return jsonify(formatted)

    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error fetching events by range for {user_identifier}: {e}", exc_info=True)
        status_code = e.response.status_code
        if 400 <= status_code < 500:
             return api_error(f"Failed to fetch events: {e.response.reason_phrase}", status=status_code)
        else:
             return api_error("Failed to fetch events due to upstream error", status=500)
    except httpx.RequestError as e:
        logger.error(f"Request error fetching events by range for {user_identifier}: {e}", exc_info=True)
        return api_error("Network error while fetching events", status=503)
    except KeyError as e:
         logger.error(f"Session key error accessing session data for {user_identifier}: {e}", exc_info=True)
         return api_error("Session data error, please log in again.", status=401)
    except Exception as e:
        logger.error(f"An unexpected error occurred fetching events by range for {user_identifier}: {e}", exc_info=True)
        return api_error("An unexpected error occurred", status=500)


@event_bp.route("/events", methods=["POST"])
@login_required
def create_event():
    """Creates a new event."""
    user_identifier = session.get("user", {}).get("username", "Unknown User")
    logger.info(f"Attempting to create event by {user_identifier}")

    try:
        user = session["user"]
        unit_id = user.get("unit_id")
        id_token = user.get("id_token")
        event_data = request.get_json()

        if not unit_id:
            logger.warning(f"User {user_identifier} has no unit_id, cannot create event.")
            return api_error("User is not associated with a unit.", status=400)

        if event_data is None:
             logger.warning(f"Received empty or invalid JSON payload for event creation by {user_identifier}")
             return api_error("Invalid JSON payload", status=400) # Bad Request

        # ### Input Validation and Sanitization:
        # As with PATCH, validate and sanitize the incoming event_data here
        # before sending it to the upstream API. Ensure required fields are present,
        # data types are correct, etc.

        # ### Authorization Check:
        # Add logic here to verify if the authenticated user (`user_identifier`)
        # has the necessary permissions to create an event within the specified `unit_id`.

        url = urljoin(EVENTS_API_URL, f"/units/{unit_id}/events")
        headers = create_auth_header(id_token, "application/json")

        logger.debug(f"Creating event via API for unit {unit_id} with data: {event_data}")

        res = shared_client.post(url, headers=headers, json=event_data)
        res.raise_for_status() # Raise HTTPError for bad responses

        logger.info(f"Successfully created event for unit {unit_id} by {user_identifier}")

        # The upstream API might return 201 Created with a body or 204 No Content.
        # Handle both cases.
        try:
            response_data = res.json() if res.content else {"success": True, "message": "Event created (no content returned)"}
        except json.JSONDecodeError:
             # Handle case where status is not 204 but response is not valid JSON
             logger.warning(f"API returned non-JSON response on event creation for unit {unit_id}", exc_info=True)
             response_data = {"success": True, "message": "Event created (invalid response format)"}


        return jsonify(response_data), res.status_code # Return the actual status code from API

    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error creating event for unit {unit_id} by {user_identifier}: {e}", exc_info=True)
        status_code = e.response.status_code
        if 400 <= status_code < 500:
             return api_error(f"Failed to create event: {e.response.reason_phrase}", status=status_code)
        else:
             return api_error("Failed to create event due to upstream error", status=500)
    except httpx.RequestError as e:
        logger.error(f"Request error creating event for unit {unit_id} by {user_identifier}: {e}", exc_info=True)
        return api_error("Network error while creating event", status=503)
    except json.JSONDecodeError:
         logger.error(f"Failed to decode JSON request body for event creation by {user_identifier}", exc_info=True)
         return api_error("Invalid JSON payload provided", status=400)
    except KeyError as e:
         logger.error(f"Session key error accessing session data for {user_identifier}: {e}", exc_info=True)
         return api_error("Session data error, please log in again.", status=401)
    except Exception as e:
        logger.error(f"An unexpected error occurred creating event by {user_identifier}: {e}", exc_info=True)
        return api_error("An unexpected error occurred", status=500)