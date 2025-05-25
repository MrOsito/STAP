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
import { getEventDetailsAPI, saveNewEvent, saveEditedEvent, deleteEventAPI } from './calendar.api.js'; // Import API functions
// import bootstrap from 'bootstrap'; // If using npm

 


export function setupEditModalHeader() {
  dom.eventEditModalLabel.textContent = "Edit Event";
  dom.deleteEventBtn.classList.remove('d-none');
}


// --- Handle Day Click (Create New Event) ---
export function handleDateClick(info) {
  console.log("Clicked date:", info.dateStr);

  setCurrentInviteeId(userUnitId);

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

  setCurrentEventId(info.event.id); // Call the function
  setCurrentInviteeId(info.event.extendedProps.invitee_id || null); // Call this function too

  const statusRaw = info.event.extendedProps.event_status || '';
  const challengeRaw = info.event.extendedProps.challenge_area || '';

  dom.eventModalLabel.textContent = info.event.title;
  dom.eventStart.textContent = new Date(info.event.start).toLocaleString();
  dom.eventEnd.textContent = new Date(info.event.end).toLocaleString();
  dom.eventStatus.textContent = formatCamelCase(statusRaw);
  dom.eventChallenge.textContent = formatCamelCase(challengeRaw);
  dom.eventInvitee.textContent = info.event.extendedProps.invitee_name || '';

  // You can still store the raw values elsewhere if needed
  dom.eventStatus.dataset.raw = statusRaw;
  dom.eventChallenge.dataset.raw = challengeRaw;

  // Clear event ID
  dom.editEventId.value = '';

  // Hide Delete button
  dom.deleteEventBtn.classList.add('d-none');
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

    const btn = dom.editEventBtn;
    const spinner = dom.editBtnSpinner;
    const text = dom.editBtnText;

    btn.disabled = true;
    spinner.classList.remove('d-none');
    text.textContent = "Loading...";

    console.time("Total Edit Flow");

    console.time("fetchMembersAndPopulateSelects");
    fetchMembersAndPopulateSelects(currentInviteeId) // currentInviteeId should be available from config
      .then(() => {
        console.timeEnd("fetchMembersAndPopulateSelects");
        console.time("fetchEventDetails");
        return getEventDetailsAPI(currentEventId); // This promise resolves directly to the parsed JSON
      })
      .then(data => { // 'data' is now the actual event details object (already parsed JSON)
        console.timeEnd("fetchEventDetails"); // Adjusted log
        // The .then(res => res.json()) step has been removed.

        console.time("populateEditForm");
        populateEditForm(data); // Pass the data directly to populateEditForm
        console.timeEnd("populateEditForm");
      })
      .catch(err => {
        console.error("Edit failed:", err); // This will now catch errors from getEventDetailsAPI or populateEditForm
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

  new bootstrap.Modal(dom.eventEditModal).show();
}

// --- Handle Read-Only Mode ---
export function handleReadOnlyState(data) {
  const eventStatus = (data.status || data.event_status || '').toLowerCase();
  const isConcluded = eventStatus === 'concluded';
  const wrongInvitee = String(currentInviteeId) !== String(userUnitId);
  const isReadOnly = isConcluded || wrongInvitee;

  const reasonEl = dom.readOnlyReason;

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

  dom.saveChangesBtn.disabled = isReadOnly;
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
if (dom.deleteEventBtn) { // Good practice to check if element exists
    dom.deleteEventBtn.addEventListener('click', () => {
        if (!currentEventId) return alert("No event selected for deletion.");
        if (confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
            deleteEventAPI(currentEventId)
                .then(res => {
                    if (!res.ok) {
                        // Try to get more error info
                        return res.text().then(text => { throw new Error(`Failed to delete: ${res.status} ${text}`); });
                    }
                    alert("✅ Event deleted successfully!");
                    location.reload();
                })
                .catch(err => {
                    console.error("Delete error (from UI):", err);
                    alert(`Could not delete event. ${err.message || err}`);
                });
        }
    });
}