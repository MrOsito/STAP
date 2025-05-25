// static/calendar.ui.js
import {
    dom, currentEventId, setCurrentEventId, currentInviteeId, setCurrentInviteeId, userUnitId,
    organiserChoices, leaderChoices, assistantChoices, challengeAreaChoices, scoutMethodChoices
} from './calendar.config.js';
import { clearAllChoiceSelections, formatCamelCase } from './calendar.utils.js';
import {
    fetchMembersAndPopulateSelects, resetDropdowns,
    populateTextFields, setDropdownSelections
} from './calendar.choices.js';
import { saveNewEvent, saveEditedEvent, deleteEventAPI } from './calendar.api.js'; // Import API functions
// import bootstrap from 'bootstrap'; // If using npm

 


export function setupEditModalHeader() {
  document.getElementById('eventEditModalLabel').textContent = "Edit Event";
  document.getElementById('deleteEventBtn').classList.remove('d-none');
}


// --- Handle Day Click (Create New Event) ---
export function handleDateClick(info) {
  console.log("Clicked date:", info.dateStr);

  setCurrentInviteeId = userUnitId;

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
export function handleEventClick(info) {
  console.time("handleEventClick total");

    console.time("populate DOM");

  setCurrentEventId = info.event.id;
  setCurrentInviteeId = info.event.extendedProps.invitee_id || null;

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
export function setupEditEventButton() {
  dom.editEventBtn.addEventListener('click', () => {
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
        return fetch(`/event/${currentEventId}`);
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

export function populateEditForm(data) {
  setupEditModalHeader();
  resetDropdowns();
  populateTextFields(data);
  setDropdownSelections(data);
  handleReadOnlyState(data);

  new bootstrap.Modal(document.getElementById('eventEditModal')).show();
}

// --- Handle Read-Only Mode ---
export function handleReadOnlyState(data) {
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



export function setupSaveButton() {
  dom.saveChangesBtn.addEventListener('click', () => {
    const mode = dom.saveChangesBtn.dataset.mode || "edit";

    if (mode === "create") {
      saveNewEvent();
    } else {
      saveEditedEvent();
    }
  });
}


// Add event listener for delete button here, calling the API function
dom.deleteEventBtn.addEventListener('click', () => {
    if (!currentEventId) return alert("No event selected for deletion.");
    if (confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
        deleteEventAPI(currentEventId) // from api.js
            .then(res => {
                if (!res.ok) throw new Error("Failed to delete event from UI call"); // or check res.json() if API returns JSON
                alert("✅ Event deleted successfully!");
                location.reload();
            })
            .catch(err => {
                console.error("Delete error (from UI):", err);
                alert("Could not delete event.");
            });
    }
});