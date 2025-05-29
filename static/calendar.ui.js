// static/calendar.ui.js
import {
    dom, calendar, // Assuming 'calendar' instance from FullCalendar is exported from config or passed
    currentEventId, setCurrentEventId,
    currentInviteeId, setCurrentInviteeId,
    currentInviteeType, setCurrentInviteeType, // Import new type and setter
    userUnitId, userMemberId, // userMemberId might be needed if creating events implies self as organiser
    organiserChoices, leaderChoices, assistantChoices,
    challengeAreaChoices, scoutMethodChoices
} from './calendar.config.js';
import { formatCamelCase } from './calendar.utils.js';
import {
    fetchMembersAndPopulateSelects,
    resetDropdowns,
    populateTextFields,
    setDropdownSelections
} from './calendar.choices.js';
import { getEventDetailsAPI, saveNewEvent, saveEditedEvent, deleteEventAPI } from './calendar.api.js';

// Bootstrap Modal an ESM import if you installed it via npm, otherwise it's global.
// Assuming global 'bootstrap' for now as per original comments.
// import bootstrap from 'bootstrap'; 


/**
 * Sets up the header for the event edit modal when editing an existing event.
 */
export function setupEditModalHeader() {
  dom.eventEditModalLabel.textContent = "Edit Event";
  dom.deleteEventBtn.classList.remove('d-none');
  dom.saveChangesBtn.dataset.mode = "edit"; // Ensure mode is set for editing
}

/**
 * Handles click on a date to create a new event.
 * @param {object} info - FullCalendar date click information.
 */
export async function handleDateClick(info) { // Ensure it's async
  console.log("Creating new event for date:", info.dateStr);

  // 1. Set up context for a new event
  setCurrentEventId(null);
  setCurrentInviteeId(userUnitId); // Default to user's unit
  setCurrentInviteeType('unit');   // Default type for new events

  // 2. Configure modal appearance for "Create" mode
  dom.eventEditModalLabel.textContent = "Create New Event";
  dom.deleteEventBtn.classList.add('d-none');
  dom.saveChangesBtn.dataset.mode = "create";
  dom.readOnlyReason.classList.add('d-none');

  // 3. IMPORTANT: Enable all underlying form elements first, including <select> tags
  // This ensures that when Choices.js initializes, it does so on enabled elements.
  document.querySelectorAll('#eventEditModal input, #eventEditModal select, #eventEditModal textarea, #eventEditModal button.btn-primary')
    .forEach(el => {
      el.disabled = false;
    });

  // 4. Reset all dropdowns (this will destroy and re-create Choices.js instances)
  // Now that the underlying <select> elements are enabled, new Choices instances should also be enabled.
  resetDropdowns(); // from calendar.choices.js

  // 5. Prefill basic form fields for a new event
  populateTextFields({
      title: "",
      location: "",
      description: "",
      start_datetime: info.dateStr + "T18:30", // Default start time
      end_datetime: info.dateStr + "T20:00"    // Default end time
  });
  
  // 6. Fetch and populate member-specific dropdowns (Organisers, Leaders, Assistants)
  // Disable save button during this async operation for better UX
  dom.saveChangesBtn.disabled = true;
  try {
    await fetchMembersAndPopulateSelects(userUnitId, 'unit'); // Fetch for current user's unit
    console.log("Members populated for new event form.");
  } catch (error) {
    console.error("Failed to populate members for new event form:", error);
    alert("Could not load members for the new event form. Please try again.");
    // Decide if modal should still show or if we should return
    dom.saveChangesBtn.disabled = false; // Re-enable save if error occurs here
    return; 
  }
  dom.saveChangesBtn.disabled = false; // Re-enable save button

  // 7. Explicitly ensure all Choices.js instances are enabled (belt and suspenders)
  // This should ideally not be needed if step 3 and 4 work correctly, but adds robustness.
  [organiserChoices, leaderChoices, assistantChoices, scoutMethodChoices, challengeAreaChoices].forEach(choiceInstance => {
    if (choiceInstance && typeof choiceInstance.enable === 'function') {
      choiceInstance.enable();
    }
  });
  
  // 8. Show the modal
  new bootstrap.Modal(dom.eventEditModal).show();
}

/**
 * Handles click on an existing event in the calendar.
 * @param {object} info - FullCalendar event click information.
 */
export function handleEventClick(info) {
  console.time("handleEventClick total");
  console.time("populate DOM for event view modal");

  const eventProps = info.event.extendedProps;
  setCurrentEventId(info.event.id);
  setCurrentInviteeId(eventProps.invitee_id || null);
  setCurrentInviteeType(eventProps.invitee_type || 'unit'); // Store invitee_type

  const statusRaw = eventProps.event_status || '';
  const challengeRaw = eventProps.challenge_area || '';

  dom.eventModalLabel.textContent = info.event.title;
  dom.eventStart.textContent = info.event.start ? new Date(info.event.start).toLocaleString() : 'N/A';
  dom.eventEnd.textContent = info.event.end ? new Date(info.event.end).toLocaleString() : 'N/A';
  dom.eventStatus.textContent = formatCamelCase(statusRaw);
  dom.eventChallenge.textContent = formatCamelCase(challengeRaw);
  dom.eventInvitee.textContent = eventProps.invitee_name || 'N/A';

  dom.eventStatus.dataset.raw = statusRaw;
  dom.eventChallenge.dataset.raw = challengeRaw;

  // dom.editEventId is part of the edit modal, not the view modal usually.
  // No need to clear it here. The view modal (eventModal) doesn't have this field.

  console.timeEnd("populate DOM for event view modal");

  console.time("show event view modal");
  const eventViewModal = new bootstrap.Modal(dom.eventModal); // Get modal instance
  eventViewModal.show();
  console.timeEnd("show event view modal");
  console.timeEnd("handleEventClick total");
}

/**
 * Sets up the "Edit/View" button on the event view modal.
 * This button transitions to the detailed edit modal.
 */
export function setupEditEventButton() {
  dom.editEventBtn.addEventListener('click', async () => { // Make async
    if (!currentEventId) {
      console.warn("No currentEventId set. Cannot open edit modal.");
      return;
    }

    const btn = dom.editEventBtn;
    const spinner = dom.editBtnSpinner;
    const text = dom.editBtnText;

    btn.disabled = true;
    spinner.classList.remove('d-none');
    text.textContent = "Loading...";
    console.time("Total Edit Flow");

    try {
      console.time("resetDropdowns in edit flow");
      resetDropdowns(); // Reset dropdowns before fetching new data
      console.timeEnd("resetDropdowns in edit flow");

      console.time("fetchMembersAndPopulateSelects in edit flow");
      // Crucially, pass currentInviteeType here
      await fetchMembersAndPopulateSelects(currentInviteeId, currentInviteeType);
      console.timeEnd("fetchMembersAndPopulateSelects in edit flow");

      console.time("fetchEventDetails in edit flow");
      const eventAPIData = await getEventDetailsAPI(currentEventId);
      console.timeEnd("fetchEventDetails in edit flow");
      
      console.time("populateEditForm in edit flow");
      populateEditForm(eventAPIData); // This function also shows the modal
      console.timeEnd("populateEditForm in edit flow");

    } catch (err) {
      console.error("Failed to load event for editing:", err);
      alert(`Could not load event for editing. ${err.message || 'Please try again.'}`);
    } finally {
      console.timeEnd("Total Edit Flow");
      btn.disabled = false;
      spinner.classList.add('d-none');
      text.textContent = "Edit / View";
      // Optionally hide the view modal if the edit modal is now shown
      const eventViewModalInstance = bootstrap.Modal.getInstance(dom.eventModal);
      if (eventViewModalInstance) {
        eventViewModalInstance.hide();
      }
    }
  });
}

/**
 * Populates the event edit form with data and shows the modal.
 * @param {object} eventData - The detailed event data from the API.
 */
export function populateEditForm(eventData) {
  setupEditModalHeader(); // Sets title, shows delete button, sets mode to 'edit'
  // resetDropdowns(); // Moved to be called before fetching members in setupEditEventButton

  populateTextFields(eventData);
  setDropdownSelections(eventData); // This assumes member dropdowns are already populated by fetchMembersAndPopulateSelects
  handleReadOnlyState(eventData);

  new bootstrap.Modal(dom.eventEditModal).show();
}

/**
 * Handles the read-only state of the edit modal based on event status or permissions.
 * @param {object} eventData - Event data from the API.
 */
export function handleReadOnlyState(eventData) {
  const eventStatus = (eventData.status || eventData.event_status || '').toLowerCase();
  const isConcluded = eventStatus === 'concluded';
  
  // Check if current user's unit ID matches the event's invitee ID
  // AND if the invitee type is 'unit'. Group events might have different edit rules.
  // For simplicity, let's assume only 'unit' events tied to the user's unit are editable for now.
  // This logic might need to be more sophisticated based on user roles.
  const canEditBasedOnInvitee = (String(currentInviteeId) === String(userUnitId) && currentInviteeType === 'unit');

  const isReadOnly = isConcluded || !canEditBasedOnInvitee;

  const reasonEl = dom.readOnlyReason;

  if (isReadOnly) {
    if (isConcluded) {
      reasonEl.textContent = "This event has concluded and is read-only.";
    } else if (!canEditBasedOnInvitee) {
      reasonEl.textContent = "You do not have permission to edit this event directly (e.g., it may be a group event or belong to another unit).";
    }
    reasonEl.classList.remove('d-none');
  } else {
    reasonEl.classList.add('d-none');
  }

  // Enable/disable all form elements
  const formElements = document.querySelectorAll('#eventEditModal input, #eventEditModal select, #eventEditModal textarea');
  formElements.forEach(el => el.disabled = isReadOnly);

  // Enable/disable Choices.js instances
  [organiserChoices, leaderChoices, assistantChoices, scoutMethodChoices, challengeAreaChoices].forEach(choiceInstance => {
    if (choiceInstance) {
      isReadOnly ? choiceInstance.disable() : choiceInstance.enable();
    }
  });

  // Enable/disable action buttons
  dom.saveChangesBtn.disabled = isReadOnly;
  // Delete button should also be disabled if read-only, but its visibility is handled by setupEditModalHeader
  if (dom.deleteEventBtn) dom.deleteEventBtn.disabled = isReadOnly;
}

/**
 * Sets up the event listener for the "Save Changes" button in the edit modal.
 */
export function setupSaveButton() {
  dom.saveChangesBtn.addEventListener('click', async () => { // Make async for await
    const mode = dom.saveChangesBtn.dataset.mode || "edit";
    const btn = dom.saveChangesBtn;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...`;

    try {
      if (mode === "create") {
        await saveNewEvent(); // Assuming saveNewEvent is async and handles UI feedback
      } else {
        await saveEditedEvent(); // Assuming saveEditedEvent is async
      }
      // If successful, the API functions should handle success messages/reloads
      // or the modal should be hidden here.
      const editModalInstance = bootstrap.Modal.getInstance(dom.eventEditModal);
      if (editModalInstance) {
          editModalInstance.hide();
      }
    } catch (error) {
      console.error(`Error during ${mode} event:`, error);
      // Alert is handled in API functions, but good to have a fallback or more specific UI feedback here.
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}

/**
 * Sets up the event listener for the "Delete Event" button in the edit modal.
 */
export function setupDeleteButton() {
    if (dom.deleteEventBtn) {
        dom.deleteEventBtn.addEventListener('click', async () => { //
            if (!currentEventId) {
                alert("No event selected for deletion.");
                return;
            }
            if (confirm("Are you sure you want to delete this event? This action cannot be undone.")) { //
                const btn = dom.deleteEventBtn;
                const originalText = btn.textContent;
                btn.disabled = true;
                btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Deleting...`; //

                try {
                    await deleteEventAPI(currentEventId); //
                    
                    alert("✅ Event deleted successfully!"); // User feedback

                    // Hide the edit modal
                    const editModalInstance = bootstrap.Modal.getInstance(dom.eventEditModal); //
                    if (editModalInstance) {
                        editModalInstance.hide(); //
                    }
                    
                    // Trying to establish why refechEvents is not running
                    console.log("In setupDeleteButton: Checking 'calendar' instance before refetch:", calendar); 

                    // Refresh the FullCalendar events
                    if (calendar) { // 'calendar' is the FullCalendar instance from calendar.config.js
                        calendar.refetchEvents();
                        console.log("### Calendar events refetched after deletion. ###");
                    } else {
                        // Fallback if the calendar instance isn't available for some reason
                        console.warn("Calendar instance not found, falling back to page reload.");
                        location.reload();
                    }

                } catch (error) {
                    console.error("Delete operation failed (UI):", error);
                    alert(`Could not delete event: ${error.message || 'An unexpected error occurred.'}`);
                } finally {
                    btn.disabled = false; //
                    btn.textContent = originalText; //
                }
            }
        });
    } else {
        console.warn("Delete button (dom.deleteEventBtn) not found in the DOM during setup.");
    }
}