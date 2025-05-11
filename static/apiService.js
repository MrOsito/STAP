// apiService.js - Handles API interactions

import { toTerrainDatetime } from './utils.js';
import { userMemberName} from './state.js'; // Import necessary state
import { getCurrentInviteeId } from './state.js';

// --- API Interactions ---
export async function fetchEvents(fetchInfo) {
  const start = encodeURIComponent(fetchInfo.startStr);
  const end = encodeURIComponent(fetchInfo.endStr);
  const memberId = window.userData.member_id;
  const token = window.userData.id_token;

  const url = `https://events.terrain.scouts.com.au/members/${memberId}/events?start_datetime=${start}&end_datetime=${end}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: token,
        'Content-Type': 'application/json'
      }
    });
    console.log("Response from API:", res);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    return data.results.map(e => ({
      id: e.id,
      start: e.start_datetime,
      end: e.end_datetime,
      title: e.title,
      invitee_name: e.invitee_name,
      invitee_id: e.invitee_id,
      event_status: e.status,
      challenge_area: e.challenge_area,
      section: e.section,
    }));
  } catch (err) {
    console.error("Failed to fetch events:", err);
    return [];
  }
}


export async function fetchEventDetail(eventId) {
    try {
        const res = await fetch(`/event/${eventId}`);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();
        return data;
    } catch (error) {
        console.error("Error fetching event detail:", error);
        throw error;
    }
}

export async function fetchMembers(inviteeId) {
    console.log("Fetching members for inviteeId:", inviteeId);
    try {
        const res = await fetch(`/members?invitee_id=${inviteeId}`);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();
        return (data.results || []).map(m => ({
            value: m.id,
            label: `${m.first_name} ${m.last_name}`
        }));
    } catch (error) {
        console.error("Error fetching members:", error);
        throw error;
    }
}


export async function saveEvent(mode, eventId, payload) {
  const url = mode === "create" ? `/events` : `/event/${eventId}`;
  const method = mode === "create" ? "POST" : "PATCH";

  try {
    const res = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok && res.status !== 204) {
      throw new Error(`Failed to ${mode} event. Status: ${res.status}`);
    }

    return { success: true };

  } catch (err) {
    console.error(`${mode} error:`, err);
    throw err;
  }
}

export async function deleteEvent(eventId) {
  if (!eventId) throw new Error("No event ID provided for deletion.");

  try {
    const res = await fetch(`/event/${eventId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete event");
    return { success: true };
  } catch (err) {
    console.error("Delete error:", err);
    throw err;
  }
}

export function buildPatchPayload(currentInviteeId, organiserChoices, leaderChoices, assistantChoices, challengeAreaChoices, scoutMethodChoices) {
  // Assuming you pass Choices instances and other necessary data
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
      id: getCurrentInviteeId() // Use the passed inviteeId
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
        name: userMemberName, // Use imported userMemberName
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
        name: userMemberName, // Use imported userMemberName
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

// --- Authentication ---
export async function loginToTerrain(branch, username, password) {
  const url = 'https://auth.terrain.scouts.com.au/login';
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: `${branch}${username}`,
        password: password
      })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    // Store the token and user data in window.userData
    window.userData = {
      id_token: data.id_token,
      member_id: data.member_id,
      member_name: data.member_name,
      unit_id: data.unit_id,
      unit_name: data.unit_name,
      group_id: data.group_id,
      group_name: data.group_name
    };

    return { success: true };
  } catch (err) {
    console.error("Login failed:", err);
    throw err;
  }
}