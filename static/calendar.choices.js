// static/calendar.choices.js
import {
    dom,
    challengeAreaList, scoutMethodList,
    setOrganiserChoices, setLeaderChoices, setAssistantChoices,
    setChallengeAreaChoices, setScoutMethodChoices,
    organiserChoices, leaderChoices, assistantChoices,
    challengeAreaChoices, scoutMethodChoices
} from './calendar.config.js';
import { formatCamelCase, toLocalDatetimeInputValue, resetChoicesInstance } from './calendar.utils.js';

/**
 * Initializes static (non-member) dropdowns like Challenge Area and Scout Method.
 */
export function initStaticChoiceDropdowns() {
  console.log("Initializing static choice dropdowns...");
  if (challengeAreaChoices) challengeAreaChoices.destroy();
  const newChallengeAreaChoices = new Choices(dom.editChallengeArea, { removeItemButton: true });
  newChallengeAreaChoices.setChoices(challengeAreaList.map(e => ({ value: e, label: formatCamelCase(e) })), 'value', 'label', true);
  if (newChallengeAreaChoices.containerOuter?.element) {
    newChallengeAreaChoices.containerOuter.element.classList.add('form-select-sm'); // Apply styling class
  }
  setChallengeAreaChoices(newChallengeAreaChoices);

  if (scoutMethodChoices) scoutMethodChoices.destroy();
  const newScoutMethodChoices = new Choices(dom.editScoutMethod, { removeItemButton: true, searchEnabled: false });
  newScoutMethodChoices.setChoices(scoutMethodList.map(e => ({ value: e, label: formatCamelCase(e) })), 'value', 'label', true);
  if (newScoutMethodChoices.containerOuter?.element) {
    newScoutMethodChoices.containerOuter.element.classList.add('form-select-sm'); // Apply styling class
  }
  setScoutMethodChoices(newScoutMethodChoices);
  console.log("Static choice dropdowns initialization complete.");
}

/**
 * Populates standard text input fields in the event edit modal.
 * @param {object} data - Event data object.
 */
export function populateTextFields(data) {
  dom.editTitle.value = data.title || '';
  dom.editLocation.value = data.location || '';
  dom.editDescription.value = data.description || '';
  dom.editStart.value = data.start_datetime ? toLocalDatetimeInputValue(data.start_datetime) : '';
  dom.editEnd.value = data.end_datetime ? toLocalDatetimeInputValue(data.end_datetime) : '';
}

/**
 * Sets selected values for various dropdowns based on event data.
 * @param {object} data - Event data object.
 */
export function setDropdownSelections(data) {
  if (organiserChoices) organiserChoices.setChoiceByValue(data.organisers?.map(o => o.id) || []);
  if (leaderChoices) leaderChoices.setChoiceByValue(data.attendance?.leader_members?.map(m => m.id) || []);
  if (assistantChoices) assistantChoices.setChoiceByValue(data.attendance?.assistant_members?.map(m => m.id) || []);
  
  if (challengeAreaChoices && data.challenge_area) {
    const challengeValues = Array.isArray(data.challenge_area) ? data.challenge_area : [data.challenge_area];
    challengeAreaChoices.setChoiceByValue(challengeValues);
  }
  if (scoutMethodChoices && data.review?.scout_method_elements) {
    scoutMethodChoices.setChoiceByValue(data.review.scout_method_elements);
  }
}

/**
 * Fetches members from the backend API and populates member-related dropdowns.
 * @param {string} inviteeId - The ID of the invitee (unit or group).
 * @param {string} inviteeType - The type of invitee ('unit' or 'group').
 * @returns {Promise<Array|undefined>} A promise that resolves with the fetched members array or undefined on error.
 */
export async function fetchMembersAndPopulateSelects(inviteeId, inviteeType = 'unit') {
    console.log(`Fetching members for Invitee ID: ${inviteeId}, Type: ${inviteeType}`);
    if (!inviteeId) {
        console.warn("No inviteeId provided to fetchMembersAndPopulateSelects. Cannot populate member choices.");
        populateChoicesDropdowns([]);
        return;
    }

    try {
        const response = await fetch(`/members?invitee_id=${inviteeId}&invitee_type=${inviteeType}`);
        if (!response.ok) {
            let errorMsg = `HTTP error fetching members: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMsg += ` - ${errorData.error || response.statusText}`;
            } catch (e) { /* Ignore if response body isn't JSON */ }
            throw new Error(errorMsg);
        }
        const data = await response.json();
        
        let membersToUse = [];
        if (data.results && Array.isArray(data.results)) {
             membersToUse = data.results.map(m => ({
                value: String(m.id),
                label: `${m.first_name || ''} ${m.last_name || ''}`.trim()
            }));
        } else {
            console.warn("Unexpected data structure from /members endpoint:", data);
        }
        
        populateChoicesDropdowns(membersToUse);
        console.log("Member dropdowns populated successfully from /members API.");
        return membersToUse; 
    } catch (error) {
        console.error("Error fetching or populating members for dropdowns:", error);
        populateChoicesDropdowns([]);
        throw error;
    }
}

/**
 * (Re)Initializes and populates the Choices.js instances for Organiser, Leaders, and Assistants.
 * @param {Array} members - Array of member objects ({ value: id, label: name }).
 */
export function populateChoicesDropdowns(members) {
    // Initialize without the problematic multi-token classNames option
    const newOrganiser = resetChoicesInstance(organiserChoices, dom.editOrganiser, { removeItemButton: true });
    newOrganiser.setChoices(members, 'value', 'label', true);
    // Add Bootstrap class to the Choices.js generated container AFTER initialization
    if (newOrganiser.containerOuter?.element) {
        newOrganiser.containerOuter.element.classList.add('form-select-sm');
    }
    setOrganiserChoices(newOrganiser);

    const newLeader = resetChoicesInstance(leaderChoices, dom.editLeaders, { removeItemButton: true });
    newLeader.setChoices(members, 'value', 'label', true);
    if (newLeader.containerOuter?.element) {
        newLeader.containerOuter.element.classList.add('form-select-sm');
    }
    setLeaderChoices(newLeader);

    const newAssistant = resetChoicesInstance(assistantChoices, dom.editAssistants, { removeItemButton: true });
    newAssistant.setChoices(members, 'value', 'label', true);
    if (newAssistant.containerOuter?.element) {
        newAssistant.containerOuter.element.classList.add('form-select-sm');
    }
    setAssistantChoices(newAssistant);
}

/**
 * Resets all dropdowns in the edit modal to their initial state and clears selections.
 */
export function resetDropdowns() {
    if (challengeAreaChoices) challengeAreaChoices.destroy();
    const newChallengeAreaInstance = new Choices(dom.editChallengeArea, { removeItemButton: true });
    newChallengeAreaInstance.setChoices(
        challengeAreaList.map(e => ({ value: e, label: formatCamelCase(e) })),
        'value', 'label', true
    );
    if (newChallengeAreaInstance.containerOuter?.element) { // Apply styling class
        newChallengeAreaInstance.containerOuter.element.classList.add('form-select-sm');
    }
    setChallengeAreaChoices(newChallengeAreaInstance);

    if (scoutMethodChoices) scoutMethodChoices.destroy();
    const newScoutMethodInstance = new Choices(dom.editScoutMethod, {
        removeItemButton: true,
        searchEnabled: false
    });
    newScoutMethodInstance.setChoices(
        scoutMethodList.map(e => ({ value: e, label: formatCamelCase(e) })),
        'value', 'label', true
    );
    if (newScoutMethodInstance.containerOuter?.element) { // Apply styling class
        newScoutMethodInstance.containerOuter.element.classList.add('form-select-sm');
    }
    setScoutMethodChoices(newScoutMethodInstance);

    populateChoicesDropdowns([]); // Clears member-based dropdowns

    // This loop might be redundant if populateChoicesDropdowns([]) and re-init of static ones handles clearing.
    // However, explicitly removing active items from re-instantiated choices is safe.
    [
      organiserChoices, leaderChoices, assistantChoices,
      challengeAreaChoices, // Access the updated instances from setChallengeAreaChoices
      scoutMethodChoices   // Access the updated instances from setScoutMethodChoices
    ].forEach(choiceInstance => {
      if (choiceInstance) {
        choiceInstance.removeActiveItems();
      }
    });
}