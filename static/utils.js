// utils.js - Collection of helper functions

import { dom, scoutMethodList, challengeAreaList } from './state.js'; // Import necessary state

// --- Utilities ---
export function toLocalDatetimeInputValue(utcString) {
  const date = new Date(utcString);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function toTerrainDatetime(localInputVal) {
  const d = new Date(localInputVal);
  return d.toISOString().replace("Z", "+00:00");
}

export function showSpinner(isLoading) {
  dom.calendarLoader.style.display = isLoading ? 'block' : 'none';
}

export function formatCamelCase(text) {
  return text.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function resetChoices(instance, selector, options = {}) {
  if (instance) instance.destroy();
  return new Choices(selector, options);
}

export function clearAllChoiceSelections(choicesInstances) {
  choicesInstances.forEach(choice => {
    if (choice) {
      choice.removeActiveItems();
      //choice.removeHighlightedItems(); // This might not be necessary depending on Choices.js version
    }
  });
}

export function setupEditModalHeader() {
  dom.eventEditModalLabel.textContent = "Edit Event";
  dom.deleteEventBtn.classList.remove('d-none');
}

export function handleReadOnlyState(data, userUnitId, currentInviteeId) {
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

  const allInputs = dom.eventEditModal.querySelectorAll('input, select, textarea, button.btn-primary');
  allInputs.forEach(el => el.disabled = isReadOnly);

  // Assuming you pass Choices instances to this function or access them from state
  // [organiserChoices, leaderChoices, assistantChoices, scoutMethodChoices, challengeAreaChoices].forEach(choice => {
  //   if (choice) isReadOnly ? choice.disable() : choice.enable();
  // });

  dom.saveChangesBtn.disabled = isReadOnly;
}

export function initStaticChoiceDropdowns() {
    // Initialize Challenge Area Choices
    const challengeAreaChoices = new Choices("#editChallengeArea", {
        removeItemButton: true
    });
    challengeAreaChoices.setChoices(
        challengeAreaList.map(e => ({ value: e, label: formatCamelCase(e) })),
        'value',
        'label',
        true
    );

    // Initialize Scout Method Choices
    const scoutMethodChoices = new Choices("#editScoutMethod", {
        removeItemButton: true,
        searchEnabled: false
    });
    scoutMethodChoices.setChoices(
        scoutMethodList.map(e => ({ value: e, label: formatCamelCase(e) })),
        'value',
        'label',
        true
    );
     return { challengeAreaChoices, scoutMethodChoices }; // Return instances
}

export function resetDropdowns(choicesInstances) {
  // Assuming you pass Choices instances to this function or access them from state
   choicesInstances.forEach(choice => {
     if (choice) choice.destroy();
   });

  const { challengeAreaChoices, scoutMethodChoices } = initStaticChoiceDropdowns(); // Re-initialize

  // Clear previous selections
  // [organiserChoices, leaderChoices, assistantChoices, challengeAreaChoices, scoutMethodChoices].forEach(choice => {
  //   if (choice) {
  //     choice.removeActiveItems();
  //     choice.removeHighlightedItems();
  //   }
  // });

  return { challengeAreaChoices, scoutMethodChoices }; // Return new instances
}