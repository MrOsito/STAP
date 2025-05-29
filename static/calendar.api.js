// static/calendar.api.js
import {
    userData, TERRAIN_EVENTS_API_URL, currentEventId, currentInviteeId, userMemberName,
    allEvents, setAllEvents,
    organiserChoices, leaderChoices, assistantChoices,
    challengeAreaChoices, scoutMethodChoices,
    userUnitId, calendar
} from './calendar.config.js';
import { populateInviteeFilter } from './calendar.init.js';
import { toTerrainDatetime } from './calendar.utils.js';

export function filterEvents() {
  const selectedInvitee = document.getElementById('inviteeFilter')?.value || "";
  if (!selectedInvitee) {
    return [...allEvents];
  }
  return allEvents.filter(event => event.invitee_name === selectedInvitee);
}


export async function fetchEvents(fetchInfo, successCallback, failureCallback) {
  //console.time("fetchEventsExecution"); // Start timer

  const errorEl = document.getElementById('calendarError');
  try {
    const start_iso = new Date(fetchInfo.startStr).toISOString();
    const end_iso = new Date(fetchInfo.endStr).toISOString();

    if (!userData || !userData.id_token || !userData.member_id) {
      console.error("[Calendar] User data, id_token, or member_id not available for API call.");
      if (errorEl) errorEl.classList.remove('d-none');
      failureCallback(new Error("User data not available for API call."));
//      console.timeEnd("fetchEventsExecution"); // End timer in case of early exit
      return;
    }

    // Add this log to see the URL being fetched
    const directApiUrl = `${TERRAIN_EVENTS_API_URL}/members/${userData.member_id}/events?start_datetime=${encodeURIComponent(start_iso)}&end_datetime=${encodeURIComponent(end_iso)}`;
    //console.log("[Calendar] Fetching events from URL:", directApiUrl); // Log the URL

    const headers = {
      "Authorization": userData.id_token,
      "Content-Type": "application/json"
    };

//    const fetchStartTime = performance.now(); // For more granular fetch timing

    const res = await fetch(directApiUrl, {
      method: "GET",
      headers: headers
    });

//    const fetchEndTime = performance.now();
//    console.log(`[Calendar] Actual fetch to ${directApiUrl} took: ${(fetchEndTime - fetchStartTime).toFixed(2)} ms`);

    if (!res.ok) {
      const errorText = await res.text();
//      console.error(`[Calendar] API Error: ${res.status} ${res.statusText}`, errorText);
      if (errorEl) errorEl.classList.remove('d-none');
      failureCallback(new Error(`API request failed: ${res.status}. ${errorText}`));
//      console.timeEnd("fetchEventsExecution"); // End timer in case of error
      return;
    }

    const apiResult = await res.json();
    const eventsFromApi = apiResult.results || [];

//    const formattingStartTime = performance.now();
    const formattedEvents = eventsFromApi.map(e => ({
      id: e.id || "",
      start: e.start_datetime || "",
      end: e.end_datetime || "",
      title: e.title || "",
      invitee_type: e.invitee_type || "",
      event_status: e.status || "",
      challenge_area: e.challenge_area || "",
      section: e.section || "",
      invitee_id: e.invitee_id || "",
      invitee_name: e.invitee_name || "",
      group_id: e.group_id || ""
    }));
//    const formattingEndTime = performance.now();
//    console.log(`[Calendar] Event formatting took: ${(formattingEndTime - formattingStartTime).toFixed(2)} ms`);


    if (formattedEvents.length === 0) {
      console.warn("[Calendar] No events found from direct API call.");
    }
    if (errorEl) errorEl.classList.add('d-none');

    //setAllEvents = formattedEvents;
    setAllEvents(formattedEvents); 

    populateInviteeFilter();
    successCallback(filterEvents());

  } catch (error) {
    console.error("[Calendar] Error fetching events directly from API:", error);
    if (errorEl) errorEl.classList.remove('d-none');
    failureCallback(error);
  }
}


export async function getEventDetailsAPI(eventId) {
  if (!eventId) {
    console.error("getEventDetailsAPI: No event ID provided.");
    return Promise.reject(new Error("No event ID provided"));
  }

  const directApiUrl = `${TERRAIN_EVENTS_API_URL}/events/${eventId}`;
  console.log(`[API] Fetching event details from: ${directApiUrl}`);
  const headers = {
    "Authorization": userData.id_token, // Uses config for token
    "Content-Type": "application/json" // Usually good to include, though GET might not strictly need it
  };

  console.log(`[API] Fetching event details from: ${directApiUrl}`);
  const response = await fetch(directApiUrl, {
    method: "GET",
    headers: headers
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[API] Error fetching event details ${eventId}: ${response.status}`, errorText);
    throw new Error(`Failed to fetch event details: ${response.status} ${errorText}`);
  }
  return response.json(); // Return the parsed JSON directly
}


export async function saveNewEvent() { // Make it async
  const payload = buildPatchPayload(); // Your existing function to build the event data

  // Ensure you have the user's unit_id for the endpoint URL
  // and the id_token for authorization. These should be in `userData` from calendar.config.js
  if (!userData || !userData.id_token || !userUnitId) {
    console.error("User data, token, or unit ID not available for creating event.");
    alert("Could not create event: Missing user information. Please refresh and try again.");
    return Promise.reject("Missing user information for create event."); // Return a rejected promise
  }

  // The target URL for creating unit events, derived from your Python route
  const createEventUrl = `${TERRAIN_EVENTS_API_URL}/units/${userUnitId}/events`;

  try {
    const response = await fetch(createEventUrl, {
      method: "POST",
      headers: {
        "Authorization": userData.id_token, // Get token from userData
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok && response.status !== 201 && response.status !== 204) { // Terrain might return 201 Created
      const errorData = await response.json().catch(() => ({})); // Try to get error details
      console.error("Failed to create event. Status:", response.status, "Response:", errorData);
      throw new Error(`Failed to create event. Status: ${response.status}. ${errorData.message || ''}`);
    }
    alert("✅ New event created successfully!");
    location.reload(); // Or use calendar.refetchEvents() if you want a softer reload
    // return response.json(); // Or some success indicator
  } catch (err) {
    console.error("Create error:", err);
    alert(`Could not create event: ${err.message}`);
    throw err; // Re-throw the error to be caught by the caller if needed
  }
}


export function saveEditedEvent() {
  if (!currentEventId) {
    alert("No event selected for updating.");
    return Promise.reject("No currentEventId for saveEditedEvent"); // Return a rejected promise
  }

  if (!userData || !userData.id_token) {
    console.error("User data or token not available for updating event.");
    alert("Could not update event: Missing user information. Please refresh and try again.");
    return Promise.reject("Missing user information for update event.");
  }

  const payload = buildPatchPayload();
  
  const updateEventUrl = `${TERRAIN_EVENTS_API_URL}/events/${currentEventId}`;

  console.log(`Attempting to PATCH event directly to: ${updateEventUrl}`);

  try {
    const response = await fetch(updateEventUrl, {
      method: "PATCH",
      headers: {
        "Authorization": userData.id_token, // Use the id_token from userData
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      // Attempt to get more detailed error information from the response body
      let errorData = { message: `Failed to update event. Status: ${response.status}` };
      try {
        errorData = await response.json();
      } catch (e) {
        // Response body was not JSON or was empty
        console.warn("Could not parse JSON error response from PATCH event API.");
      }
      console.error("Error updating event:", response.status, errorData);
      // Use error message from API if available, otherwise default
      throw new Error(errorData.detail || errorData.message || `HTTP error ${response.status}`);
    }

    // Handle successful response (Terrain API might return 200 OK with the updated event, or 204 No Content)
    let responseData;
    if (response.status === 204) {
        console.log("Event updated successfully (204 No Content).");
        responseData = { success: true };
    } else {
        responseData = await response.json();
        console.log("Event updated successfully (200 OK), response data:", responseData);
    }
    
    alert("✅ Event updated successfully!");
    
    if (calendar) {
      calendar.refetchEvents();
    } else {
      location.reload(); // Fallback
    }
    
    return responseData; // Return data for any further client-side processing if needed

  } catch (err) {
    console.error("Error during saveEditedEvent:", err);
    alert(`Could not save changes: ${err.message}`);
    throw err; // Re-throw the error if it needs to be handled by the caller
  }
}

export async function deleteEventAPI(eventId) { // Make it an API function
    if (!eventId) {
        alert("No event selected for deletion.");
        return Promise.reject("No event ID for deletion");
    }

    // Assuming 'userData' is available and has 'id_token'
    if (!userData || !userData.id_token) {
        console.error("User data or token not available for deleting event.");
        return Promise.reject("Authentication details missing for event deletion.");
    }

    const flaskBackendDeleteUrl = `/event/${eventId}`; 

    try {
        const response = await fetch(flaskBackendDeleteUrl, {
            method: "DELETE",
            headers: {
                "Authorization": userData.id_token,
            }
        });

        if (!response.ok) {
            let errorMsg = `Failed to delete event. Status: ${response.status}`;
            try {
                // Attempt to parse a JSON error response from your backend
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg; // Assuming your Flask backend sends { "error": "message" }
            } catch (e) {
                // If response body is not JSON or is empty
            }
            throw new Error(errorMsg);
        }

        // If deletion is successful (e.g., Flask returns 200 OK or 204 No Content)
        console.log("Event deletion successful via API call.");
        return { success: true }; // Indicate success to the calling function

    } catch (err) {
        console.error("Error in deleteEventAPI:", err);
        // Let the calling function decide how to present this error to the user
        throw err;
    }
}


export function buildPatchPayload() {
  return {
    title: document.getElementById("editTitle").value,
    description: document.getElementById("editDescription").value || "",
    justification: "",
    organisers: organiserChoices?.getValue(true) || [],
    challenge_area: challengeAreaChoices?.getValue(true) || "",
    start_datetime: toTerrainDatetime(document.getElementById("editStart").value),
    end_datetime: toTerrainDatetime(document.getElementById("editEnd").value),
    event_type: {
      type: "unit",
      id: currentInviteeId
    },
    attendance: {
      leader_member_ids: leaderChoices?.getValue(true) || [],
      assistant_member_ids: assistantChoices?.getValue(true) || [],
      attendee_member_ids: []
    },
    schedule_items: [],
    achievement_pathway_oas_data: {
      award_rule: "individual",
      verifier: {
        name: userMemberName,
        contact: "",
        type: "member"
      },
      groups: []
    },
    achievement_pathway_logbook_data: {
      distance_travelled: 0,
      distance_walkabout: 0,
      achievement_meta: {
        stream: "",
        branch: ""
      },
      categories: [],
      details: {
        activity_time_length: "",
        activity_grade: ""
      },
      verifier: {
        name: userMemberName,
        contact: "",
        type: "member"
      }
    },
    review: {
      general_tags: [],
      scout_method_elements: scoutMethodChoices?.getValue(true) || [],
      scout_spices_elements: []
    },
    uploads: [],
    equipment_notes: "",
    additional_notes: "",
    location: document.getElementById("editLocation").value || "",
    iana_timezone: "Australia/Sydney",
    status: "planned"
  };
}



