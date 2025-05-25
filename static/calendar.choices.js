// static/calendar.choices.js
import {
    dom, // <<<< ADD 'dom' TO YOUR IMPORTS FROM CONFIG
    challengeAreaList, scoutMethodList, membersData, userData,
    setOrganiserChoices, setLeaderChoices, setAssistantChoices,
    setChallengeAreaChoices, setScoutMethodChoices,
    organiserChoices, leaderChoices, assistantChoices,
    challengeAreaChoices, scoutMethodChoices,
    TERRAIN_MEMBERS_API_URL
} from './calendar.config.js';
import { formatCamelCase, toLocalDatetimeInputValue, resetChoicesInstance } from './calendar.utils.js';

export function initStaticChoiceDropdowns() {
  console.log("Defining and initializing static choice dropdowns...");
  if (challengeAreaChoices) challengeAreaChoices.destroy();
  const newChallengeAreaChoices = new Choices(dom.editChallengeArea, { removeItemButton: true }); // Use dom
  newChallengeAreaChoices.setChoices(challengeAreaList.map(e => ({ value: e, label: formatCamelCase(e) })), 'value', 'label', true);
  setChallengeAreaChoices(newChallengeAreaChoices);

  if (scoutMethodChoices) scoutMethodChoices.destroy();
  const newScoutMethodChoices = new Choices(dom.editScoutMethod, { removeItemButton: true, searchEnabled: false }); // Use dom
  newScoutMethodChoices.setChoices(scoutMethodList.map(e => ({ value: e, label: formatCamelCase(e) })), 'value', 'label', true);
  setScoutMethodChoices(newScoutMethodChoices);
  console.log("Static choice dropdowns initialization complete.");
}

export function populateTextFields(data) {
  dom.editTitle.value = data.title || ''; // Use dom
  dom.editLocation.value = data.location || ''; // Use dom
  dom.editDescription.value = data.description || ''; // Use dom
  dom.editStart.value = data.start_datetime ? toLocalDatetimeInputValue(data.start_datetime) : ''; // Use dom
  dom.editEnd.value = data.end_datetime ? toLocalDatetimeInputValue(data.end_datetime) : ''; // Use dom
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
            membersToUse = membersData.group_members.map(m => ({
                value: m.id,
                label: `${m.first_name} ${m.last_name}`
            }));
            console.log("Populating with group members from embedded data.");
        }
        populateChoicesDropdowns(membersToUse);
    } else {
        console.warn("Embedded members data not found. Falling back to fetch.");
        try {
            // Decision: Keep this fetch to Flask backend OR refactor to direct Terrain API
            // For now, keeping existing Flask backend call.
            // If changing to direct Terrain API:
            // const directApiUrl = `${TERRAIN_MEMBERS_API_URL}/units/${inviteeId}/members`; // Adjust endpoint as needed
            // const headers = { "Authorization": userData.id_token };
            // const res = await fetch(directApiUrl, { headers });
            const res = await fetch(`/members?invitee_id=${inviteeId}`);
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const data = await res.json();
            const members = (data.results || []).map(m => ({
                value: m.id,
                label: `${m.first_name} ${m.last_name}`
            }));
            populateChoicesDropdowns(members);
            console.log("Members fetched successfully.");
        } catch (error) {
            console.error("Error fetching members:", error);
        }
    }
}

export function populateChoicesDropdowns(members) {
    const newOrganiser = resetChoicesInstance(organiserChoices, dom.editOrganiser, { removeItemButton: true }); // Use dom
    newOrganiser.setChoices(members, 'value', 'label', true);
    setOrganiserChoices(newOrganiser);

    const newLeader = resetChoicesInstance(leaderChoices, dom.editLeaders, { removeItemButton: true }); // Use dom
    newLeader.setChoices(members, 'value', 'label', true);
    setLeaderChoices(newLeader);

    const newAssistant = resetChoicesInstance(assistantChoices, dom.editAssistants, { removeItemButton: true }); // Use dom
    newAssistant.setChoices(members, 'value', 'label', true);
    setAssistantChoices(newAssistant);
}

export function resetDropdowns() {
  if (challengeAreaChoices) challengeAreaChoices.destroy();
  if (scoutMethodChoices) scoutMethodChoices.destroy();

  const newChallengeAreaInstance = new Choices(dom.editChallengeArea, { removeItemButton: true }); // Use dom
  newChallengeAreaInstance.setChoices(
    challengeAreaList.map(e => ({ value: e, label: formatCamelCase(e) })),
    'value', 'label', true
  );
  setChallengeAreaChoices(newChallengeAreaInstance);

  const newScoutMethodInstance = new Choices(dom.editScoutMethod, { // Use dom
    removeItemButton: true,
    searchEnabled: false
  });
  newScoutMethodInstance.setChoices(
    scoutMethodList.map(e => ({ value: e, label: formatCamelCase(e) })),
    'value', 'label', true
  );
  setScoutMethodChoices(newScoutMethodInstance);

  [
    organiserChoices, leaderChoices, assistantChoices,
    challengeAreaChoices, scoutMethodChoices
  ].forEach(choice => {
    if (choice) choice.removeActiveItems();
  });
}

export function populateMemberChoices(members) {
    const newOrganiserInstance = resetChoicesInstance(organiserChoices, dom.editOrganiser, { removeItemButton: true }); // Use dom
    newOrganiserInstance.setChoices(members, 'value', 'label', true);
    setOrganiserChoices(newOrganiserInstance);

    const newLeaderInstance = resetChoicesInstance(leaderChoices, dom.editLeaders, { removeItemButton: true }); // Use dom
    newLeaderInstance.setChoices(members, 'value', 'label', true);
    setLeaderChoices(newLeaderInstance);

    const newAssistantInstance = resetChoicesInstance(assistantChoices, dom.editAssistants, { removeItemButton: true }); // Use dom
    newAssistantInstance.setChoices(members, 'value', 'label', true);
    setAssistantChoices(newAssistantInstance);
}

export async function fetchMembersAndPopulateSelects(inviteeId) {
    try {
        // Use the imported membersData from calendar.config.js
        if (membersData && membersData.unit_members && membersData.group_members) {
            const isGroup = String(inviteeId) !== String(userData.unit_id);
            const members = isGroup
                ? membersData.group_members.map(m => ({ value: m.id, label: `${m.first_name} ${m.last_name}` }))
                : membersData.unit_members.map(m => ({ value: m.id, label: `${m.first_name} ${m.last_name}` }));

            populateMemberChoices(members);
            return members;
        } else {
            console.warn("Incomplete members data found (using imported membersData). Will try to fetch if necessary or return empty.");
            // If fetchAndPopulateMembers is the primary way to get members when not embedded,
            // you might call it here, or ensure it's called appropriately elsewhere.
            // For now, just returning empty array as per original fallback logic.
            return [];
        }
    } catch (error) {
        console.error("Error processing members data in fetchMembersAndPopulateSelects:", error);
        return [];
    }
}