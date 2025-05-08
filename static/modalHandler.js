// modalHandler.js - Manages modal interactions

import { dom, userUnitId, userMemberId, userMemberName, membersData } from './state.js';
import { formatCamelCase, toLocalDatetimeInputValue, setupEditModalHeader, resetDropdowns, handleReadOnlyState, clearAllChoiceSelections, resetChoices } from './utils.js';
import { fetchEventDetail, fetchMembers, saveEvent, deleteEvent, buildPatchPayload } from './apiService.js';
import { setCurrentEventId, setCurrentInviteeId } from './state.js'; // Import functions to update state

let organiserChoices, leaderChoices, assistantChoices, scoutMethodChoices, challengeAreaChoices;

export function setupModals(choicesInstances) {
  ({ organiserChoices, leaderChoices, assistantChoices, scoutMethodChoices, challengeAreaChoices } = choicesInstances);

  // Set up event listeners for the view and edit modals
  dom.editEventBtn.addEventListener('click', handleEditEventClick);
  dom.saveChangesBtn.addEventListener('click', handleSaveChangesClick);
  dom.deleteEventBtn.addEventListener('click', handleDeleteEventClick);

  // Event listener for the edit modal being hidden to clear choices
  dom.eventEditModal.addEventListener('hidden.bs.modal', () => {
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
  setCurrentInviteeId(info.event.extendedProps.invitee_id || null);

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
      populateChoicesDropdowns(members);
  }).catch(console.error);


  new bootstrap.Modal(dom.eventEditModal).show(); // Show the edit modal
}


// --- Setup Edit Button within View Modal ---
async function handleEditEventClick() {
    const eventId = document.getElementById('editEventId').value; // Assuming eventId is stored here
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

        console.time("fetchAndPopulateMembers");
        const members = await fetchAndPopulateMembers(eventData.invitee_id); // Fetch members based on event invitee
        populateChoicesDropdowns(members); // Populate dropdowns with fetched members
        console.timeEnd("fetchAndPopulateMembers");


        populateEditForm(eventData);

    } catch (err) {
        console.error("Edit failed:", err);
        alert("Could not load event for editing.");
    } finally {
        console.timeEnd("Edit flow");
        btn.disabled = false;
        spinner.classList.add('d-none');
        text.textContent = "Edit / View";
    }
}

function populateEditForm(data) {
  setupEditModalHeader();
  // No need to resetDropdowns here, fetchAndPopulateMembers handles Choices initialization
  populateTextFields(data);
  setDropdownSelections(data);
  handleReadOnlyState(data, userUnitId, data.invitee_id); // Pass userUnitId and event's invitee_id

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
  if (organiserChoices) organiserChoices.setChoiceByValue(data.organisers?.map(o => o.id) || []);
  if (leaderChoices) leaderChoices.setChoiceByValue(data.attendance?.leader_members?.map(m => m.id) || []);
  if (assistantChoices) assistantChoices.setChoiceByValue(data.attendance?.assistant_members?.map(m => m.id) || []);
  if (challengeAreaChoices && data.challenge_area) {
    challengeAreaChoices.setChoiceByValue(Array.isArray(data.challenge_area) ? data.challenge_area : [data.challenge_area]);
  }
  if (scoutMethodChoices) {
    scoutMethodChoices.setChoiceByValue(data.review?.scout_method_elements || []);
  }
}

// Fetch Members and Cache Them (Moved from main calendar.js)
async function fetchAndPopulateMembers(inviteeId) {
    console.log("Attempting to populate members from embedded data.");
    if (membersData && membersData.unit_members && membersData.group_members) {
        let membersToUse = [];
        if (String(inviteeId) === String(userUnitId)) {
            membersToUse = membersData.unit_members.map(m => ({
                value: m.id,
                label: `${m.first_name} ${m.last_name}`
            }));
            console.log("Populating with unit members from embedded data.");
        } else {
            // Assuming inviteeId might correspond to a group ID
             // Find the group in membersData.group_members based on inviteeId (if necessary)
            const targetGroup = membersData.group_members.find(group => String(group.id) === String(inviteeId));
             if (targetGroup && targetGroup.members) {
                membersToUse = targetGroup.members.map(m => ({ // Assuming groups have a 'members' array
                    value: m.id,
                    label: `${m.first_name} ${m.last_name}`
                }));
                console.log("Populating with group members from embedded data.");
             } else {
                 console.warn(`Group with inviteeId ${inviteeId} not found in embedded data or has no members. Falling back to fetch.`);
                 return fetchMembers(inviteeId); // Fallback to API fetch
             }
        }
        return membersToUse; // Return members array
    } else {
        console.warn("Embedded members data not found. Falling back to fetch.");
        return fetchMembers(inviteeId); // Fallback to API fetch
    }
}

function populateChoicesDropdowns(members) {
    organiserChoices = resetChoices(organiserChoices, "#editOrganiser", { removeItemButton: true });
    leaderChoices = resetChoices(leaderChoices, "#editLeaders", { removeItemButton: true });
    assistantChoices = resetChoices(assistantChoices, "#editAssistants", { removeItemButton: true });

    organiserChoices.setChoices(members, 'value', 'label', true);
    leaderChoices.setChoices(members, 'value', 'label', true);
    assistantChoices.setChoices(members, 'value', 'label', true);
}


// --- Save Button (Create or Edit) ---
async function handleSaveChangesClick() {
    const mode = dom.saveChangesBtn.dataset.mode || "edit";
    const eventId = mode === "edit" ? document.getElementById('editEventId').value : null; // Get event ID only in edit mode
    const payload = buildPatchPayload(currentInviteeId, organiserChoices, leaderChoices, assistantChoices, challengeAreaChoices, scoutMethodChoices); // Pass inviteeId and Choices instances

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