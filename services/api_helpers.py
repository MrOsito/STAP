import logging
import httpx
from flask import jsonify # Keep jsonify for api_error helper
from urllib.parse import urljoin

# Configure logging (assuming basicConfig is done in app.py or elsewhere)
logger = logging.getLogger(__name__)

# Initialize shared HTTP client for connection pooling
shared_client = httpx.Client()

def create_auth_header(id_token, content_type="application/json"):
    """Creates the Authorization header using the ID token."""
    headers = {
        "Authorization": f"Bearer {id_token}",
        "Content-Type": content_type,
        "Accept": "application/json" # Explicitly accept JSON
    }
    # logger.debug("Created authorization headers") # Avoid logging tokens unless necessary for specific debugging
    return headers

def api_error(message, status=500):
    """Helper to return a JSON error response."""
    logger.error(f"Returning API error response: Status={status}, Message='{message}'")
    response = jsonify({"error": message})
    response.status_code = status
    return response

# --- Specific API Interaction Functions ---

# Assuming MEMBERS_URL is imported from config.py
# from config import MEMBERS_URL # Ensure this import is present

def get_profiles(invitee_id, id_token):
    """Fetches member profiles for a given invitee_id (unit ID)."""
    # logger.debug(f"Fetching profiles for invitee_id: {invitee_id}") # Be mindful of logging IDs if sensitive
    try:
        url = urljoin(MEMBERS_URL, f"/units/{invitee_id}/members")
        headers = create_auth_header(id_token)

        logger.debug(f"Making GET request to members API: {url}")
        res = shared_client.get(url, headers=headers)
        res.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)

        profiles_data = res.json()
        logger.debug(f"Successfully fetched profiles for invitee_id: {invitee_id}. Received {len(str(profiles_data))} chars.")

        # ### XSS Consideration: Data from the API is returned as JSON.
        # The risk of XSS here depends on how the client-side JavaScript
        # consumes and renders this JSON data. Ensure that client-side rendering
        # uses methods that safely handle potential HTML/JS within string fields
        # (e.g., .textContent instead of .innerHTML).
        # Server-side sanitization of data *before* storing it in the external
        # API is the most robust approach to prevent malicious data from
        # entering the system in the first place.

        # The API returns {"profiles": [...]}, so extract the list.
        # Use .get() with a default empty list for safety.
        return profiles_data.get("profiles", [])

    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error fetching profiles for invitee_id {invitee_id}: {e}", exc_info=True)
        # Re-raise the exception for the calling route to handle
        raise
    except httpx.RequestError as e:
        logger.error(f"Request error fetching profiles for invitee_id {invitee_id}: {e}", exc_info=True)
         # Re-raise the exception for the calling route to handle
        raise
    except json.JSONDecodeError:
         logger.error(f"Failed to decode JSON response when fetching profiles for invitee_id {invitee_id}", exc_info=True)
         # Re-raise the exception for the calling route to handle
         raise
    except Exception as e:
        logger.error(f"An unexpected error occurred fetching profiles for invitee_id {invitee_id}: {e}", exc_info=True)
        # Re-raise the exception for the calling route to handle
        raise


# Assuming EVENTS_API_URL is imported from config.py
# from config import EVENTS_API_URL # Ensure this import is present

def get_member_events(member_id, id_token, start_date, end_date):
    """Fetches events for a specific member within a date range."""
    # logger.debug(f"Fetching events for member_id: {member_id} from {start_date} to {end_date}") # Be mindful of logging IDs
    try:
        url = urljoin(EVENTS_API_URL, f"/members/{member_id}/events")
        headers = create_auth_header(id_token)
        params = {"start": start_date, "end": end_date}

        logger.debug(f"Making GET request to events API: {url} with params {params}")
        res = shared_client.get(url, headers=headers, params=params)
        res.raise_for_status()

        events_data = res.json()
        logger.debug(f"Successfully fetched events for member_id: {member_id}. Received {len(str(events_data))} chars.")

        # ### XSS Consideration: Data from the API is returned as JSON.
        # Ensure client-side JavaScript handles potential HTML/JS safely.
        # Server-side sanitization *before* storing data in the external API
        # is the most robust prevention.

        # The API returns {"events": [...]}, so extract the list.
        # Use .get() with a default empty list for safety.
        return events_data.get("events", [])

    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error fetching events for member_id {member_id}: {e}", exc_info=True)
        raise
    except httpx.RequestError as e:
        logger.error(f"Request error fetching events for member_id {member_id}: {e}", exc_info=True)
        raise
    except json.JSONDecodeError:
         logger.error(f"Failed to decode JSON response when fetching events for member_id {member_id}", exc_info=True)
         raise
    except Exception as e:
        logger.error(f"An unexpected error occurred fetching events for member_id {member_id}: {e}", exc_info=True)
        raise


def update_event(event_id, event_data, id_token):
    """Updates an existing event."""
    # logger.debug(f"Updating event_id: {event_id}") # Be mindful of logging IDs
    try:
        url = urljoin(EVENTS_API_URL, f"/events/{event_id}")
        headers = create_auth_header(id_token)

        # ### Input Sanitization (before sending to API):
        # Although validation/sanitization of user input happens in the route,
        # if this helper were ever called with data from another source,
        # additional checks might be needed here depending on the context.
        # For now, assuming data passed from the route is already validated.

        logger.debug(f"Making PATCH request to events API: {url} with data: {event_data}")
        # Use json=event_data to automatically handle serialization and content type
        res = shared_client.patch(url, headers=headers, json=event_data)
        res.raise_for_status()

        logger.debug(f"Successfully updated event_id: {event_id}")
        # Return the response object or relevant data if needed by the caller
        return res

    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error updating event {event_id}: {e}", exc_info=True)
        raise
    except httpx.RequestError as e:
        logger.error(f"Request error updating event {event_id}: {e}", exc_info=True)
        raise
    except json.JSONDecodeError:
         logger.error(f"Failed to decode JSON response after updating event {event_id}", exc_info=True)
         raise
    except Exception as e:
        logger.error(f"An unexpected error occurred updating event {event_id}: {e}", exc_info=True)
        raise


def delete_event(event_id, id_token):
    """Deletes an event."""
    # logger.debug(f"Deleting event_id: {event_id}") # Be mindful of logging IDs
    try:
        url = urljoin(EVENTS_API_URL, f"/events/{event_id}")
        headers = create_auth_header(id_token) # DELETE typically doesn't need Content-Type body, but auth is needed

        logger.debug(f"Making DELETE request to events API: {url}")
        res = shared_client.delete(url, headers=headers)
        res.raise_for_status()

        logger.debug(f"Successfully deleted event_id: {event_id}")
        # Return the response object or status if needed by the caller
        return res

    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error deleting event {event_id}: {e}", exc_info=True)
        raise
    except httpx.RequestError as e:
        logger.error(f"Request error deleting event {event_id}: {e}", exc_info=True)
        raise
    except json.JSONDecodeError:
         # DELETE typically has no body, but handle in case API returns JSON error body
         logger.error(f"Failed to decode JSON response after deleting event {event_id}", exc_info=True)
         raise
    except Exception as e:
        logger.error(f"An unexpected error occurred deleting event {event_id}: {e}", exc_info=True)
        raise


def fetch_members(id_token, entity_type, entity_id):
    print("[DEBUG] Fetching members")
    url = urljoin(MEMBERS_URL, f"/{entity_type}s/{entity_id}/members")
    print("[DEBUG] URL:", url)
    headers = create_auth_header(id_token, "application/json")
    try:
        res = shared_client.get(url, headers=headers)ß
        res.raise_for_status()
        return res.json().get("results", [])
    except httpx.HTTPError as e:
        print(f"[ERROR] Fetching {entity_type} members: {e}")
        return []