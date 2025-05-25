import {
    challengeAreaList, scoutMethodList, membersData, userData,
    setOrganiserChoices, setLeaderChoices, setAssistantChoices,
    setChallengeAreaChoices, setScoutMethodChoices, // setters for choice instances
    organiserChoices, leaderChoices, assistantChoices, // direct let exports from config
    challengeAreaChoices, scoutMethodChoices,
    TERRAIN_MEMBERS_API_URL // Assuming this is added to config.js and exported
} from './calendar.config.js';
import { formatCamelCase, toLocalDatetimeInputValue, resetChoicesInstance } from './calendar.utils.js';


// --- PREPOULATE CHOICES ---

export function initStaticChoiceDropdowns() {
  console.log("Defining and initializing static choice dropdowns...");
  const newChallengeAreaChoices = new Choices("#editChallengeArea", { removeItemButton: true });
  newChallengeAreaChoices.setChoices(challengeAreaList.map(e => ({ value: e, label: formatCamelCase(e) })), 'value', 'label', true);
  setChallengeAreaChoices(newChallengeAreaChoices); // Update shared instance

  const newScoutMethodChoices = new Choices("#editScoutMethod", { removeItemButton: true, searchEnabled: false });
  newScoutMethodChoices.setChoices(scoutMethodList.map(e => ({ value: e, label: formatCamelCase(e) })), 'value', 'label', true);
  setScoutMethodChoices(newScoutMethodChoices); // Update shared instance
  console.log("Static choice dropdowns initialization complete.");
}


export function populateTextFields(data) {
  document.getElementById('editTitle').value = data.title || '';
  document.getElementById('editLocation').value = data.location || '';
  document.getElementById('editDescription').value = data.description || '';
  document.getElementById('editStart').value = data.start_datetime ? toLocalDatetimeInputValue(data.start_datetime) : '';
  document.getElementById('editEnd').value = data.end_datetime ? toLocalDatetimeInputValue(data.end_datetime) : '';
}

export function setDropdownSelections(data) {
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
export async function fetchAndPopulateMembers(inviteeId) {
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



export function populateChoicesDropdowns(members) {
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


export function resetDropdowns() {
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

// --- Fetch Members ---
export function populateMemberChoices(members) {
    organiserChoices = resetChoices(organiserChoices, "#editOrganiser", { removeItemButton: true });
    leaderChoices = resetChoices(leaderChoices, "#editLeaders", { removeItemButton: true });
    assistantChoices = resetChoices(assistantChoices, "#editAssistants", { removeItemButton: true });

    organiserChoices.setChoices(members, 'value', 'label', true);
    leaderChoices.setChoices(members, 'value', 'label', true);
    assistantChoices.setChoices(members, 'value', 'label', true);
}

export async function fetchMembersAndPopulateSelects(inviteeId) {
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
