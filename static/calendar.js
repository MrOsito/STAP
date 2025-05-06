// Global Variables
let calendar, allEvents = [], cachedMembers = [], currentEventId = null, currentInviteeId = null;
let unitMembers = [];
let groupMembers = [];
let organiserChoices, leaderChoices, assistantChoices, scoutMethodChoices, challengeAreaChoices;


const userData = JSON.parse(document.getElementById('user-data').textContent);
const membersData = JSON.parse(document.getElementById('members-data').textContent);
const userUnitId = userData.unit_id;
const userMemberId = userData.member_id;
const userMemberName = userData.member_name;

// Cached DOM elements
const dom = {
  calendarLoader: document.getElementById('calendarLoader'),
  inviteeFilter: document.getElementById('inviteeFilter'),
  eventModal: document.getElementById('eventModal'),
  eventEditModal: document.getElementById('eventEditModal'),
  eventEditModalLabel: document.getElementById('eventEditModalLabel'),
  editEventBtn: document.getElementById('editEventBtn'),
  editBtnSpinner: document.getElementById('editBtnSpinner'),
  editBtnText: document.getElementById('editBtnText'),
  eventModalLabel: document.getElementById('eventModalLabel'),
  eventStart: document.getElementById('eventStart'),
  eventEnd: document.getElementById('eventEnd'),
  eventStatus: document.getElementById('eventStatus'),
  eventChallenge: document.getElementById('eventChallenge'),
  eventInvitee: document.getElementById('eventInvitee'),
  editEventId: document.getElementById('editEventId'),
  deleteEventBtn: document.getElementById('deleteEventBtn'),
  saveChangesBtn: document.getElementById('saveChangesBtn'),
  readOnlyReason: document.getElementById('readOnlyReason'),
  editTitle: document.getElementById('editTitle'),
  editDescription: document.getElementById('editDescription'),
  editLocation: document.getElementById('editLocation'),
  editStart: document.getElementById('editStart'),
  editEnd: document.getElementById('editEnd'),
  editChallengeArea: document.getElementById('editChallengeArea'),
  editScoutMethod: document.getElementById('editScoutMethod'),
  editOrganiser: document.getElementById('editOrganiser'),
  editLeaders: document.getElementById('editLeaders'),
  editAssistants: document.getElementById('editAssistants')
};

const scoutMethodList = [
  "symbolic_framework", "community_involvement", "learn_by_doing",
  "nature_and_outdoors", "patrol_system", "youth_leading_adult_supporting",
  "promise_and_law", "personal_progression"
];

const challengeAreaList = [
  "community", "creative", "outdoors", "personal_growth", "not_applicable"
];


// --- Utilities ---
function toLocalDatetimeInputValue(utcString) {
  const date = new Date(utcString);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function toTerrainDatetime(localInputVal) {
  const d = new Date(localInputVal);
  return d.toISOString().replace("Z", "+00:00");
}

function showSpinner(isLoading) {
  document.getElementById('calendarLoader').style.display = isLoading ? 'block' : 'none';
}

function formatCamelCase(text) {
  return text.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function resetChoices(instance, selector, options = {}) {
  if (instance) instance.destroy();
  return new Choices(selector, options);
}

function clearAllChoiceSelections() {
  [organiserChoices, leaderChoices, assistantChoices, challengeAreaChoices, scoutMethodChoices].forEach(choice => {
    if (choice) {
      choice.removeActiveItems();
      //choice.removeHighlightedItems();
    }
  });
}

function setupEditModalHeader() {
  document.getElementById('eventEditModalLabel').textContent = "Edit Event";
  document.getElementById('deleteEventBtn').classList.remove('d-none');
}


// --- Calendar Setup ---
function initCalendar() {
  const calendarEl = document.getElementById('calendar');

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    displayEventTime: false,
    dayMaxEventRows: 2,
    height: 'auto',
    headerToolbar: {
      left: '',
      center: 'title',
      right: 'prev,next today'
    },
    loading: showSpinner,
    eventContent: renderEventContent,
    eventSources: [fetchEvents],
    eventClick: handleEventClick,
    dateClick: handleDateClick,
    fixedWeekCount: false
  });

  calendar.render();
  injectInviteeFilter();
}

// Inject a filter into the Calendar based on Invitee Name i.e. Cubs/Scouts/Group
function injectInviteeFilter() {
  const calendarEl = document.getElementById('calendar');
  const headerLeft = calendarEl.querySelector('.fc-toolbar .fc-toolbar-chunk:first-child');

  if (headerLeft) {
    const filterHTML = `
      <select id="inviteeFilter" class="form-select form-select-sm" style="width: auto; display: inline-block; margin-left: 8px;">
        <option value="">All Invitees</option>
      </select>
    `;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = filterHTML;
    headerLeft.appendChild(wrapper);

    document.getElementById('inviteeFilter').addEventListener('change', () => {
      calendar.removeAllEvents();
      calendar.addEventSource(filterEvents());
    });
  }
}



//Populate the Event Filter
function populateInviteeFilter() {
  const inviteeSelect = document.getElementById('inviteeFilter');
  if (!inviteeSelect) return;

  const inviteeNames = [...new Set(allEvents.map(event => event.invitee_name).filter(Boolean))].sort();

  inviteeSelect.innerHTML = '<option value="">All Invitees</option>';
  inviteeNames.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    inviteeSelect.appendChild(option);
  });
}


// --- PREPOULATE CHOICES ---

function initStaticChoiceDropdowns() {
    console.log("Defining and initializing static choice dropdowns...");
    // Initialize Challenge Area Choices
    challengeAreaChoices = new Choices("#editChallengeArea", {
        removeItemButton: true
    });
    challengeAreaChoices.setChoices(
        challengeAreaList.map(e => ({ value: e, label: formatCamelCase(e) })),
        'value',
        'label',
        true
    );
    console.log("Challenge Area Choices initialized.");

    // Initialize Scout Method Choices
    scoutMethodChoices = new Choices("#editScoutMethod", {
        removeItemButton: true,
        searchEnabled: false
    });
    scoutMethodChoices.setChoices(
        scoutMethodList.map(e => ({ value: e, label: formatCamelCase(e) })),
        'value',
        'label',
        true
    );
    console.log("Scout Method Choices initialized.");
    console.log("Static choice dropdowns initialization complete.");
}


function populateTextFields(data) {
  document.getElementById('editTitle').value = data.title || '';
  document.getElementById('editLocation').value = data.location || '';
  document.getElementById('editDescription').value = data.description || '';
  document.getElementById('editStart').value = data.start_datetime ? toLocalDatetimeInputValue(data.start_datetime) : '';
  document.getElementById('editEnd').value = data.end_datetime ? toLocalDatetimeInputValue(data.end_datetime) : '';
}

function setDropdownSelections(data) {
  if (organiserChoices) organiserChoices.setChoiceByValue(data.organisers.map(o => o.id));
  if (leaderChoices) leaderChoices.setChoiceByValue(data.attendance?.leader_members.map(m => m.id) || []);
  if (assistantChoices) assistantChoices.setChoiceByValue(data.attendance?.assistant_members.map(m => m.id) || []);
  if (challengeAreaChoices && data.challenge_area) {
    challengeAreaChoices.setChoiceByValue(Array.isArray(data.challenge_area) ? data.challenge_area : [data.challenge_area]);
  }
  if (scoutMethodChoices) {
    scoutMethodChoices.setChoiceByValue(data.review?.scout_method_elements || []);
  }
}



// Fetch Members and Cache Them
async function fetchAndPopulateMembers(inviteeId) {
    console.log("Attempting to populate members from embedded data.");
    if (membersData && membersData.unit_members && membersData.group_members) {
        let membersToUse = [];
        if (String(inviteeId) === String(userData.unit_id)) {
            membersToUse = membersData.unit_members.map(m => ({
                value: m.id,
                label: `${m.first_name} ${m.last_name}`
            }));
            console.log("Populating with unit members from embedded data.");
        } else {
            // Assuming inviteeId might correspond to a group ID
            membersToUse = membersData.group_members.map(m => ({
                value: m.id,
                label: `${m.first_name} ${m.last_name}`
            }));
            console.log("Populating with group members from embedded data.");
        }
        populateChoicesDropdowns(membersToUse);
        // We don't need to return anything as populateChoicesDropdowns does the work
    } else {
        console.warn("Embedded members data not found. Falling back to fetch.");
        try {
            const res = await fetch(`/members?invitee_id=${inviteeId}`);
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const data = await res.json();
            const members = (data.results || []).map(m => ({
                value: m.id,
                label: `${m.first_name} ${m.last_name}`
            }));
            populateChoicesDropdowns(members);
            console.log("Members fetched successfully.");
            // Optionally, you could update membersData here if needed for future calls
        } catch (error) {
            console.error("Error fetching members:", error);
        }
    }
}



function populateChoicesDropdowns(members) {
    if (organiserChoices) organiserChoices.destroy();
    if (leaderChoices) leaderChoices.destroy();
    if (assistantChoices) assistantChoices.destroy();
    organiserChoices = new Choices("#editOrganiser", { removeItemButton: true });
    leaderChoices = new Choices("#editLeaders", { removeItemButton: true });
    assistantChoices = new Choices("#editAssistants", { removeItemButton: true });
    organiserChoices.setChoices(members, 'value', 'label', true);
    leaderChoices.setChoices(members, 'value', 'label', true);
    assistantChoices.setChoices(members, 'value', 'label', true);
}


function resetDropdowns() {
  if (challengeAreaChoices) challengeAreaChoices.destroy();
  if (scoutMethodChoices) scoutMethodChoices.destroy();

  challengeAreaChoices = new Choices("#editChallengeArea", { removeItemButton: true });
  scoutMethodChoices = new Choices("#editScoutMethod", {
    removeItemButton: true,
    searchEnabled: false
  });

  challengeAreaChoices.setChoices(
    challengeAreaList.map(e => ({ value: e, label: formatCamelCase(e) })),
    'value', 'label', true
  );

  scoutMethodChoices.setChoices(
    scoutMethodList.map(e => ({ value: e, label: formatCamelCase(e) })),
    'value', 'label', true
  );

  // Clear previous selections
  [organiserChoices, leaderChoices, assistantChoices, challengeAreaChoices, scoutMethodChoices].forEach(choice => {
    if (choice) {
      choice.removeActiveItems();
      choice.removeHighlightedItems();
    }
  });
}



// --- Render Events (Title + Icon) ---
function renderEventContent(arg) {
  const props = arg.event.extendedProps;
  const isConcluded = props.event_status?.toLowerCase() === "concluded";

  const wrapper = document.createElement('div');
  wrapper.className = 'fc-event-main';

  if (isConcluded) {
    const icon = document.createElement('i');
    icon.className = 'bi bi-check-circle-fill text-success me-1';
    icon.style.fontSize = '0.95rem';
    wrapper.appendChild(icon);
  }

  const title = document.createElement('span');
  title.className = 'fc-event-title';
  title.textContent = arg.event.title;
  wrapper.appendChild(title);

  return { domNodes: [wrapper] };
}

// --- Fetch Events from Backend ---
async function fetchEvents(fetchInfo, successCallback, failureCallback) {
  const url = `/events?start=${encodeURIComponent(fetchInfo.startStr)}&end=${encodeURIComponent(fetchInfo.endStr)}`;
  const errorEl = document.getElementById('calendarError');
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const events = await res.json();

    if (!Array.isArray(events) || events.length === 0) {
      console.warn("[Calendar] No events found or session expired.");
      if (errorEl) errorEl.classList.remove('d-none');
    } else {
      if (errorEl) errorEl.classList.add('d-none');  // Hide error
    }

    allEvents = events;
    populateInviteeFilter();
    successCallback(filterEvents());
  } catch (error) {
    console.error("[Calendar] Error fetching events:", error);
    if (errorEl) errorEl.classList.remove('d-none');
    failureCallback(error);
  }
}


function filterEvents() {
  const selectedInvitee = document.getElementById('inviteeFilter')?.value || "";
  if (!selectedInvitee) {
    return [...allEvents];
  }
  return allEvents.filter(event => event.invitee_name === selectedInvitee);
}


// --- Handle Day Click (Create New Event) ---
function handleDateClick(info) {
  console.log("Clicked date:", info.dateStr);

  currentInviteeId = userUnitId;

  dom.eventEditModalLabel.textContent = "Create New Event";
  dom.deleteEventBtn.classList.add('d-none');

  clearAllChoiceSelections();

  // Prefill blank fields
  dom.editTitle.value = "";
  dom.editLocation.value = "";
  dom.editDescription.value = "";
  dom.editStart.value = info.dateStr + "T18:30";
  dom.editEnd.value = info.dateStr + "T20:00";

  dom.readOnlyReason.classList.add('d-none');

  document.querySelectorAll('#eventEditModal input, #eventEditModal select, #eventEditModal textarea, #eventEditModal button.btn-primary')
    .forEach(el => el.disabled = false);

  dom.saveChangesBtn.dataset.mode = "create";

  new bootstrap.Modal(dom.eventEditModal).show();
}



// --- Handle Event Click (Edit Existing) ---
function handleEventClick(info) {
  console.time("handleEventClick total");

    console.time("populate DOM");

  currentEventId = info.event.id;
  currentInviteeId = info.event.extendedProps.invitee_id || null;

  const statusRaw = info.event.extendedProps.event_status || '';
  const challengeRaw = info.event.extendedProps.challenge_area || '';

  document.getElementById('eventModalLabel').textContent = info.event.title;
  document.getElementById('eventStart').textContent = new Date(info.event.start).toLocaleString();
  document.getElementById('eventEnd').textContent = new Date(info.event.end).toLocaleString();
  document.getElementById('eventStatus').textContent = formatCamelCase(statusRaw);
  document.getElementById('eventChallenge').textContent = formatCamelCase(challengeRaw);
  document.getElementById('eventInvitee').textContent = info.event.extendedProps.invitee_name || '';

  // You can still store the raw values elsewhere if needed
  document.getElementById('eventStatus').dataset.raw = statusRaw;
  document.getElementById('eventChallenge').dataset.raw = challengeRaw;

  // Clear event ID
  document.getElementById('editEventId').value = '';

  // Hide Delete button
  document.getElementById('deleteEventBtn').classList.add('d-none');
  console.timeEnd("populate DOM");

  console.time("show modal");
  new bootstrap.Modal(document.getElementById('eventModal')).show();
  console.timeEnd("show modal");

    console.timeEnd("handleEventClick total");

}

// --- Setup Edit Button ---
function setupEditEventButton() {
  document.getElementById('editEventBtn').addEventListener('click', () => {
    if (!currentEventId) return;

    const btn = document.getElementById('editEventBtn');
    const spinner = document.getElementById('editBtnSpinner');
    const text = document.getElementById('editBtnText');

    btn.disabled = true;
    spinner.classList.remove('d-none');
    text.textContent = "Loading...";

    console.time("Total Edit Flow");

    console.time("fetchMembersAndPopulateSelects");
    fetchMembersAndPopulateSelects(currentInviteeId)
      .then(() => {
        console.timeEnd("fetchMembersAndPopulateSelects");

        console.time("fetchEvent");
        console.time("fetch /event/<eventId>");
        return fetch(`/event/${currentEventId}`);
        console.timeEnd("fetch /event/<eventId>");
      })
      .then(res => {
        console.timeEnd("fetchEvent");

        console.time("parseJSON");
        return res.json();
      })
      .then(data => {
        console.timeEnd("parseJSON");

        console.time("populateEditForm");
        populateEditForm(data);
        console.timeEnd("populateEditForm");
      })
      .catch(err => {
        console.error("Edit failed:", err);
        alert("Could not load event for editing.");
      })
      .finally(() => {
        console.timeEnd("Total Edit Flow");

        btn.disabled = false;
        spinner.classList.add('d-none');
        text.textContent = "Edit / View";
      });
  });
}


function populateEditForm(data) {
  setupEditModalHeader();
  resetDropdowns();
  populateTextFields(data);
  setDropdownSelections(data);
  handleReadOnlyState(data);

  new bootstrap.Modal(document.getElementById('eventEditModal')).show();
}




// --- Handle Read-Only Mode ---
function handleReadOnlyState(data) {
  const eventStatus = (data.status || data.event_status || '').toLowerCase();
  const isConcluded = eventStatus === 'concluded';
  const wrongInvitee = String(currentInviteeId) !== String(userUnitId);
  const isReadOnly = isConcluded || wrongInvitee;

  const reasonEl = document.getElementById('readOnlyReason');

  if (isReadOnly) {
    reasonEl.textContent = isConcluded
      ? "This event has concluded and is read-only."
      : "You do not have permission to edit this event.";
    reasonEl.classList.remove('d-none');
  } else {
    reasonEl.classList.add('d-none');
  }

  const allInputs = document.querySelectorAll('#eventEditModal input, #eventEditModal select, #eventEditModal textarea, #eventEditModal button.btn-primary');
  allInputs.forEach(el => el.disabled = isReadOnly);

  [organiserChoices, leaderChoices, assistantChoices, scoutMethodChoices, challengeAreaChoices].forEach(choice => {
    if (choice) isReadOnly ? choice.disable() : choice.enable();
  });

  document.getElementById('saveChangesBtn').disabled = isReadOnly;
}

// --- Save Button (Create or Edit) ---
function setupSaveButton() {
  document.getElementById('saveChangesBtn').addEventListener('click', () => {
    const mode = document.getElementById('saveChangesBtn').dataset.mode || "edit";

    if (mode === "create") {
      saveNewEvent();
    } else {
      saveEditedEvent();
    }
  });
}

function saveNewEvent() {
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

function saveEditedEvent() {
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

function buildPatchPayload() {
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


// Handle Delete Button
document.getElementById('deleteEventBtn').addEventListener('click', () => {
  if (!currentEventId) return alert("No event selected for deletion.");

  if (confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
    fetch(`/event/${currentEventId}`, {
      method: "DELETE"
    })
    .then(res => {
      if (!res.ok) throw new Error("Failed to delete event");
      alert("✅ Event deleted successfully!");
      location.reload();
    })
    .catch(err => {
      console.error("Delete error:", err);
      alert("Could not delete event.");
    });
  }
})


// --- Fetch Members ---
function populateMemberChoices(members) {
    organiserChoices = resetChoices(organiserChoices, "#editOrganiser", { removeItemButton: true });
    leaderChoices = resetChoices(leaderChoices, "#editLeaders", { removeItemButton: true });
    assistantChoices = resetChoices(assistantChoices, "#editAssistants", { removeItemButton: true });

    organiserChoices.setChoices(members, 'value', 'label', true);
    leaderChoices.setChoices(members, 'value', 'label', true);
    assistantChoices.setChoices(members, 'value', 'label', true);
}

async function fetchMembersAndPopulateSelects(inviteeId) {
    try {
        // Safely access membersData and its properties
        const membersDataElement = document.getElementById('members-data');
        if (!membersDataElement) {
            console.warn("members-data script tag not found!");
            return; // Or handle this more gracefully (e.g., fetch from the server)
        }

        const membersData = JSON.parse(membersDataElement.textContent);

        if (membersData && membersData.unit_members && membersData.group_members) {
            const isGroup = String(inviteeId) !== String(userData.unit_id);
            const members = isGroup
                ? membersData.group_members.map(m => ({ value: m.id, label: `${m.first_name} ${m.last_name}` }))
                : membersData.unit_members.map(m => ({ value: m.id, label: `${m.first_name} ${m.last_name}` }));

            populateMemberChoices(members);
            return members;
        } else {
            console.warn("Incomplete members data found.");
            // Optionally, you could fetch from the server here as a fallback
            // and call populateMemberChoices with the fetched data
            return [];
        }

    } catch (error) {
        console.error("Error processing members data:", error);
        // Handle the error appropriately (e.g., display a message to the user)
        return [];
    }
}


// --- Startup ---
function initializeApp() {
  console.log("Initializing Calendar...");
  initCalendar();
  setupEditEventButton();
  setupSaveButton();
  initStaticChoiceDropdowns();
  unitMembers = membersData.unit_members.map(m => ({ value: m.id, label: `${m.first_name} ${m.last_name}` }));
  populateMemberChoices(unitMembers);
  console.log("Initialization complete.");
}

document.addEventListener('DOMContentLoaded', initializeApp);
