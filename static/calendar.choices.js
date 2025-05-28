// static/calendar.choices.js
import {
    dom,
    challengeAreaList, scoutMethodList,
    // userData might be needed if you switch to direct Terrain API calls with auth token
    // For now, it's not directly used here as /members is a backend call.
    // userData, TERRAIN_MEMBERS_API_URL, 
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
  setChallengeAreaChoices(newChallengeAreaChoices);

  if (scoutMethodChoices) scoutMethodChoices.destroy();
  const newScoutMethodChoices = new Choices(dom.editScoutMethod, { removeItemButton: true, searchEnabled: false });
  newScoutMethodChoices.setChoices(scoutMethodList.map(e => ({ value: e, label: formatCamelCase(e) })), 'value', 'label', true);
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
 * This is the primary function to get members for UI elements.
 * @param {string} inviteeId - The ID of the invitee (unit or group).
 * @param {string} inviteeType - The type of invitee ('unit' or 'group').
 * @returns {Promise<Array|undefined>} A promise that resolves with the fetched members array or undefined on error.
 */
export async function fetchMembersAndPopulateSelects(inviteeId, inviteeType = 'unit') {
    console.log(`Fetching members for Invitee ID: ${inviteeId}, Type: ${inviteeType}`);
    if (!inviteeId) {
        console.warn("No inviteeId provided to fetchMembersAndPopulateSelects. Cannot populate member choices.");
        populateChoicesDropdowns([]); // Populate with empty or handle error UI
        return;
    }

    try {
        const response = await fetch(`/members?invitee_id=${inviteeId}&invitee_type=${inviteeType}`);
        if (!response.ok) {
            // Attempt to get error message from response body if available
            let errorMsg = `HTTP error fetching members: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMsg += ` - ${errorData.error || response.statusText}`;
            } catch (e) { /* Ignore if response body isn't JSON */ }
            throw new Error(errorMsg);
        }
        const data = await response.json(); // Expects { "results": [{"id": "...", "first_name": "...", "last_name": "..."}] }
        
        let membersToUse = [];
        if (data.results && Array.isArray(data.results)) {
             membersToUse = data.results.map(m => ({
                value: String(m.id), // Ensure value is a string for Choices.js consistency
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
        populateChoicesDropdowns([]); // Populate with empty on error to clear previous state
        // Optionally re-throw or provide user feedback
        throw error; // Re-throw so the caller can catch it if needed
    }
}

/**
 * (Re)Initializes and populates the Choices.js instances for Organiser, Leaders, and Assistants.
 * @param {Array} members - Array of member objects ({ value: id, label: name }).
 */
export function populateChoicesDropdowns(members) {
    const newOrganiser = resetChoicesInstance(organiserChoices, dom.editOrganiser, { removeItemButton: true, classNames: { containerOuter: 'choices form-select-sm' } });
    newOrganiser.setChoices(members, 'value', 'label', true);
    setOrganiserChoices(newOrganiser);

    const newLeader = resetChoicesInstance(leaderChoices, dom.editLeaders, { removeItemButton: true, classNames: { containerOuter: 'choices form-select-sm' } });
    newLeader.setChoices(members, 'value', 'label', true);
    setLeaderChoices(newLeader);

    const newAssistant = resetChoicesInstance(assistantChoices, dom.editAssistants, { removeItemButton: true, classNames: { containerOuter: 'choices form-select-sm' } });
    newAssistant.setChoices(members, 'value', 'label', true);
    setAssistantChoices(newAssistant);
}

/**
 * Resets all dropdowns in the edit modal to their initial state and clears selections.
 * This is typically called when opening the modal for a new event or before loading an existing one.
 */
export function resetDropdowns() {
    // Re-initialize static dropdowns (Challenge Area, Scout Method)
    // This ensures they are clean if they were previously manipulated.
    if (challengeAreaChoices) challengeAreaChoices.destroy();
    const newChallengeAreaInstance = new Choices(dom.editChallengeArea, { removeItemButton: true });
    newChallengeAreaInstance.setChoices(
        challengeAreaList.map(e => ({ value: e, label: formatCamelCase(e) })),
        'value', 'label', true
    );
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
    setScoutMethodChoices(newScoutMethodInstance);

    // Clear member-based dropdowns (they will be populated on demand)
    // Pass an empty array to clear their current choices.
    populateChoicesDropdowns([]);

    // Clear any active selections from all relevant Choices instances
    // Note: populateChoicesDropdowns([]) already handles clearing for member dropdowns.
    // This loop is more for the static ones if they somehow retained values.
    [
      organiserChoices, leaderChoices, assistantChoices,
      challengeAreaChoices, // Access the updated instances
      scoutMethodChoices   // Access the updated instances
    ].forEach(choiceInstance => {
      if (choiceInstance) {
        choiceInstance.removeActiveItems();
        // choiceInstance.clearStore(); // If you want to remove all choices, not just selections
      }
    });
}

// The old `fetchAndPopulateMembers` that used embedded `membersData` is removed
// as we are now always fetching from the API via `fetchMembersAndPopulateSelects`.

// The old `populateMemberChoices` was identical to `populateChoicesDropdowns`
// and can be removed to avoid duplication.