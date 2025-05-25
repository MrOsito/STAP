// static/calendar.api.js
import {
    userData, TERRAIN_EVENTS_API_URL, currentEventId, currentInviteeId, userMemberName,
    allEvents, setAllEvents, // For fetchEvents to update allEvents
    organiserChoices, leaderChoices, assistantChoices, // For buildPatchPayload
    challengeAreaChoices, scoutMethodChoices // For buildPatchPayload
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




export function saveNewEvent() {
  const payload = buildPatchPayload();

  fetch(`/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
  .then(res => {
    if (!res.ok && res.status !== 204) {
      throw new Error(`Failed to create event. Status: ${res.status}`);
    }
    alert("✅ New event created successfully!");
    location.reload();
  })
  .catch(err => {
    console.error("Create error:", err);
    alert("Could not create event.");
  });
}

export function saveEditedEvent() {
  if (!currentEventId) return alert("No event selected");

  const payload = buildPatchPayload();

  fetch(`/event/${currentEventId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
  .then(res => {
    if (!res.ok) throw new Error("Failed to update event");
    alert("✅ Event updated successfully!");
    location.reload();
  })
  .catch(err => {
    console.error("Save error:", err);
    alert("Could not save changes.");
  });
}


export async function deleteEventAPI(eventId) { // Make it an API function
    if (!eventId) {
        alert("No event selected for deletion.");
        return Promise.reject("No event ID for deletion");
    }
    // Assuming direct API call like others:
    // return fetch(`<span class="math-inline">\{TERRAIN\_EVENTS\_API\_URL\}/events/</span>{eventId}`, { // Replace `/event/` with actual API
    return fetch(`/event/${eventId}`, { // This is still the Flask backend route
        method: "DELETE",
        headers: {
            "Authorization": userData.id_token, // Add auth for direct API call
            // "Content-Type": "application/json" // Not usually needed for DELETE
        }
    });
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
