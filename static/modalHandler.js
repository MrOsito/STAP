// modalHandler.js - Manages modal interactions

import { dom, userUnitId, userMemberId, userMemberName, membersData } from './state.js';
// Keep createAndResetChoices if needed elsewhere, but for member dropdowns, we'll just set choices after initial creation
import { formatCamelCase, toLocalDatetimeInputValue, setupEditModalHeader, handleReadOnlyState, clearAllChoiceSelections, createAndResetChoices } from './utils.js';
import { fetchEventDetail, fetchMembers, saveEvent, deleteEvent, buildPatchPayload } from './apiService.js';
// Import Choices instances and setters from state.js
import { setCurrentEventId, setCurrentInviteeId, setOrganiserChoices, setLeaderChoices, setAssistantChoices, organiserChoices, leaderChoices, assistantChoices, scoutMethodChoices, challengeAreaChoices } from './state.js';

// Removed local declarations for Choices instances - now managed via state.js

// New function to initialize member Choices instances once
export function initializeMemberChoices() {
    // Use createAndResetChoices for the initial creation to handle potential prior states
    const org = createAndResetChoices("#editOrganiser", { removeItemButton: true });
    const leader = createAndResetChoices("#editLeaders", { removeItemButton: true });
    const assistant = createAndResetChoices("#editAssistants", { removeItemButton: true });

    // Store the instances in state for later access
    setOrganiserChoices(org);
    setLeaderChoices(leader);
    setAssistantChoices(assistant);

    console.log("Member Choices instances initialized.");
}


export function setupModals() {
  // Set up event listeners for the view and edit modals
  dom.editEventBtn.addEventListener('click', handleEditEventClick);
  dom.saveChangesBtn.addEventListener('click', handleSaveChangesClick);
  dom.deleteEventBtn.addEventListener('click', handleDeleteEventClick);

  // Event listener for the edit modal being hidden to clear choices
  dom.eventEditModal.addEventListener('hidden.bs.modal', () => {
      // Use imported choicesInstances from state
      // Only clear selections, don't destroy/recreate instances here
      clearAllChoiceSelections([organiserChoices, leaderChoices, assistantChoices, scoutMethodChoices, challengeAreaChoices]);
      setCurrentEventId(null); // Clear current event ID
      setCurrentInviteeId(null); // Clear current invitee ID
  });

   // Event listener for the view modal being hidden
   dom.eventModal.addEventListener('hidden.bs.modal', () => {
        // Any cleanup needed when the view modal is closed
   });
}


// --- Handle Event Click (View Existing) ---
export function handleEventClick(info) {
  console.time("handleEventClick total");

  console.time("populate DOM");
  setCurrentEventId(info.event.id);
  // Ensure invitee_id is captured from extendedProps
  setCurrentInviteeId(info.event.extendedProps.invitee_id || null);
  console.log("Set currentInviteeId:", info.event.extendedProps.invitee_id);


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

  // Hide Delete button in the view modal initially
  dom.deleteEventBtn.classList.add('d-none');
  console.timeEnd("populate DOM");

  console.time("show modal");
  new bootstrap.Modal(dom.eventModal).show();
  console.timeEnd("show modal");

  console.timeEnd("handleEventClick total");
}

// --- Handle Day Click (Create New Event) ---
export function handleDateClick(info) {
  console.log("Clicked date:", info.dateStr);

  setCurrentInviteeId(userUnitId); // Set invitee to the current user's unit for new events

  setupEditModalHeader(); // Set modal title and show delete button (will be hidden later for create)
  dom.deleteEventBtn.classList.add('d-none'); // Hide delete button for create mode

  // Use imported choicesInstances from state
  clearAllChoiceSelections([organiserChoices, leaderChoices, assistantChoices, scoutMethodChoices, challengeAreaChoices]); // Clear selections

  // Prefill blank fields
  dom.editTitle.value = "";
  dom.editLocation.value = "";
  dom.editDescription.value = "";
  dom.editStart.value = info.dateStr + "T18:30";
  dom.editEnd.value = info.dateStr + "T20:00";

  dom.readOnlyReason.classList.add('d-none'); // Hide read-only reason

  // Enable all fields for creation
  dom.eventEditModal.querySelectorAll('input, select, textarea, button.btn-primary')
    .forEach(el => el.disabled = false);

  dom.saveChangesBtn.dataset.mode = "create"; // Set mode to create

  // Populate member dropdowns for the user's unit
  fetchAndPopulateMembers(userUnitId).then(members => {
      // populateChoicesDropdowns is called within fetchAndPopulateMembers
      // After populating, manage the read-only state for create mode (always editable)
      handleReadOnlyState({}, userUnitId, userUnitId); // Pass empty data, userUnitId for both
  }).catch(console.error);


  new bootstrap.Modal(dom.eventEditModal).show(); // Show the edit modal
}


// --- Setup Edit Button within View Modal ---
async function handleEditEventClick() {
    const eventId = document.getElementById('editEventId').value;
    if (!eventId) return;

    console.time("Edit flow");

    const btn = dom.editEventBtn;
    const spinner = dom.editBtnSpinner;
    const text = dom.editBtnText;

    btn.disabled = true;
    spinner.classList.remove('d-none');
    text.textContent = "Loading...";

    try {
        // Close the view modal
        const viewModal = bootstrap.Modal.getInstance(dom.eventModal);
        if (viewModal) viewModal.hide();

        console.time("fetchEventDetail");
        const eventData = await fetchEventDetail(eventId);
        console.timeEnd("fetchEventDetail");

        console.log(eventData.invitee_id)
        console.log(setscurrentInviteeId)
        console.log(currentInviteeId)

        console.time("fetchAndPopulateMembers");
        // Use eventData.invitee_id if available, otherwise use the stored currentInviteeId
        const inviteeIdToUse = eventData.invitee_id || currentInviteeId;

        if (!inviteeIdToUse) {
            console.error("Cannot fetch members: No invitee ID available from event data or state.");
            alert("Could not determine invitee for this event.");
            // Also reset button state if we can't proceed
            btn.disabled = false;
            spinner.classList.add('d-none');
            text.textContent = "Edit / View";
            return; // Stop the process if inviteeId is missing
        }
        // fetchAndPopulateMembers now calls populateChoicesDropdowns internally
        await fetchAndPopulateMembers(inviteeIdToUse);
        console.timeEnd("fetchAndPopulateMembers");

        populateEditForm(eventData);

    } catch (err) {
        console.error("Edit failed:", err);
        alert("Could not load event for editing.");
    } finally {
        // Ensure button state is reset even on error after the initial fetch
        btn.disabled = false;
        spinner.classList.add('d-none');
        text.textContent = "Edit / View";
    }
}

function populateEditForm(data) {
  setupEditModalHeader();
  // populateChoicesDropdowns is called within fetchAndPopulateMembers

  populateTextFields(data);
  setDropdownSelections(data);
  // Use the determined inviteeId for read-only state check
  const inviteeIdForReadOnly = data.invitee_id || currentInviteeId;
  handleReadOnlyState(data, userUnitId, inviteeIdForReadOnly); // Pass userUnitId and event's invitee_id or fallback

  // Need to manually enable/disable Choices instances based on read-only state
   const isReadOnly = (data.status || data.event_status || '').toLowerCase() === 'concluded' || String(inviteeIdForReadOnly) !== String(userUnitId);
   // Use imported choicesInstances from state
   [organiserChoices, leaderChoices, assistantChoices, scoutMethodChoices, challengeAreaChoices].forEach(choice => {
     if (choice) isReadOnly ? choice.disable() : choice.enable();
   });


  // Set the mode to edit for the save button
  dom.saveChangesBtn.dataset.mode = "edit";

  new bootstrap.Modal(dom.eventEditModal).show();
}


function populateTextFields(data) {
  dom.editTitle.value = data.title || '';
  dom.editLocation.value = data.location || '';
  dom.editDescription.value = data.description || '';
  dom.editStart.value = data.start_datetime ? toLocalDatetimeInputValue(data.start_datetime) : '';
  dom.editEnd.value = data.end_datetime ? toLocalDatetimeInputValue(data.end_datetime) : '';
}

function setDropdownSelections(data) {
  // Use imported choicesInstances from state
  if (organiserChoices) organiserChoices.setChoiceByValue(data.organisers?.map(o => o.id) || []);
  if (leaderChoices) leaderChoices.setChoiceByValue(data.attendance?.leader_members?.map(m => m.id) || []);
  if (assistantChoices) assistantChoices.setChoiceByValue(data.attendance?.assistant_members?.map(m => m.id) || []);
  // Ensure challenge_area is treated as an array for setChoiceByValue if it's a single string
  if (challengeAreaChoices && data.challenge_area) {
    const challengeAreaValues = Array.isArray(data.challenge_area) ? data.challenge_area : [data.challenge_area].filter(Boolean);
    challengeAreaChoices.setChoiceByValue(challengeAreaValues);
  } else if (challengeAreaChoices) {
      challengeAreaChoices.setChoiceByValue([]); // Clear if no value
  }

  if (scoutMethodChoices) {
      const scoutMethodValues = data.review?.scout_method_elements || [];
      scoutMethodChoices.setChoiceByValue(scoutMethodValues);
  } else if (scoutMethodChoices) {
      scoutMethodChoices.setChoiceByValue([]); // Clear if no value
  }
}

// Fetch Members and Populate Choices Dropdowns
// This function remains in modalHandler as it directly populates the modal's dropdowns
async function fetchAndPopulateMembers(inviteeId) {
    console.log("Attempting to fetch and populate members for inviteeId:", inviteeId);
    let membersToUse = [];

    // First, try to get members from the embedded data (membersData) if inviteeId is the user's unit
    if (membersData && membersData.unit_members && String(inviteeId) === String(userUnitId)) {
         membersToUse = membersData.unit_members.map(m => ({
            value: m.id,
            label: `${m.first_name} ${m.last_name}`
        }));
        console.log("Populating with unit members from embedded data.");
    } else {
        // For any other inviteeId (including group IDs or if embedded unit data is missing), always fetch from API for robustness
        console.warn(`InviteeId ${inviteeId} is not the user's unit OR embedded data is incomplete. Fetching members via API.`);
        try {
            membersToUse = await fetchMembers(inviteeId); // Call the fetchMembers function from apiService
        } catch (error) {
            console.error("Failed to fetch members via API:", error);
            // Decide how to handle this error - maybe populate dropdowns with an empty list?
            membersToUse = [];
            alert("Failed to load members for dropdowns."); // Alert the user
        }
    }

     // Populate the Choices dropdowns with the fetched/extracted members
     // This function now only sets choices on existing instances
    populateChoicesDropdowns(membersToUse);
    return membersToUse; // Return the members array
}

// This function now ONLY sets the choices on the EXISTING instances
// The instances are created once during initialization by initializeMemberChoices
export function populateChoicesDropdowns(members) {
    // Check if instances exist before setting choices
    if (organiserChoices) organiserChoices.setChoices(members, 'value', 'label', true);
    if (leaderChoices) leaderChoices.setChoices(members, 'value', 'label', true);
    if (assistantChoices) assistantChoices.setChoices(members, 'value', 'label', true);
}


// --- Save Button (Create or Edit) ---
async function handleSaveChangesClick() {
    const mode = dom.saveChangesBtn.dataset.mode || "edit";
    const eventId = mode === "edit" ? document.getElementById('editEventId').value : null; // Get event ID only in edit mode
    // Pass the Choices instances from state when building the payload
    const payload = buildPatchPayload(currentInviteeId, organiserChoices, leaderChoices, assistantChoices, challengeAreaChoices, scoutMethodChoices);

    try {
        await saveEvent(mode, eventId, payload);
        alert(`✅ Event ${mode === "create" ? "created" : "updated"} successfully!`);
        location.reload(); // Reload the page to refresh calendar
    } catch (err) {
        alert(`Could not ${mode} event.`);
    }
}

// Handle Delete Button
async function handleDeleteEventClick() {
  const eventId = document.getElementById('editEventId').value;
  if (!eventId) return alert("No event selected for deletion.");

  if (confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
    try {
      await deleteEvent(eventId);
      alert("✅ Event deleted successfully!");
      location.reload(); // Reload the page to refresh calendar
    } catch (err) {
      alert("Could not delete event.");
    }
  }
}