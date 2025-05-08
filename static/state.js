// state.js - Manages global state and cached data

// Global Variables (declared but not initialized here as they will be managed by other modules)
export let calendar;
export let allEvents = [];
export let cachedMembers = []; // Consider if still needed with embedded data
export let currentEventId = null;
export let currentInviteeId = null;
export let organiserChoices; // Will be initialized by utils or modalHandler
export let leaderChoices;     // Will be initialized by utils or modalHandler
export let assistantChoices;  // Will be initialized by utils or modalHandler
export let scoutMethodChoices; // Will be initialized by utils or modalHandler
export let challengeAreaChoices; // Will be initialized by utils or modalHandler


// Initial data from HTML
export const userData = JSON.parse(document.getElementById('user-data').textContent);
export const membersData = JSON.parse(document.getElementById('members-data').textContent); // Embedded member data
export const userUnitId = userData.unit_id;
export const userMemberId = userData.member_id;
export const userMemberName = userData.member_name;

// Cached DOM elements
export const dom = {
  calendarLoader: document.getElementById('calendarLoader'),
  inviteeFilter: document.getElementById('inviteeFilter'),
  eventModal: document.getElementById('eventModal'),
  eventEditModal: document.getElementById('eventEditModal'),
  eventEditModalLabel: document.getElementById('eventEditModalLabel'),
  editEventBtn: document.getElementById('editEventBtn'),
  editBtnSpinner: document.getElementById('editBtnSpinner'),
  editBtnText: document.getElementById('editBtnText'),
  eventModalLabel: document.getElementById('eventModalLabel'),
  eventStart: document.getElementById('eventStart'),
  eventEnd: document.getElementById('eventEnd'),
  eventStatus: document.getElementById('eventStatus'),
  eventChallenge: document.getElementById('eventChallenge'),
  eventInvitee: document.getElementById('eventInvitee'),
  editEventId: document.getElementById('editEventId'),
  deleteEventBtn: document.getElementById('deleteEventBtn'),
  saveChangesBtn: document.getElementById('saveChangesBtn'),
  readOnlyReason: document.getElementById('readOnlyReason'),
  editTitle: document.getElementById('editTitle'),
  editDescription: document.getElementById('editDescription'),
  editLocation: document.getElementById('editLocation'),
  editStart: document.getElementById('editStart'),
  editEnd: document.getElementById('editEnd'),
  editChallengeArea: document.getElementById('editChallengeArea'),
  editScoutMethod: document.getElementById('editScoutMethod'),
  editOrganiser: document.getElementById('editOrganiser'),
  editLeaders: document.getElementById('editLeaders'),
  editAssistants: document.getElementById('editAssistants')
};

// Static lists
export const scoutMethodList = [
  "symbolic_framework", "community_involvement", "learn_by_doing",
  "nature_and_outdoors", "patrol_system", "youth_leading_adult_supporting",
  "promise_and_law", "personal_progression"
];

export const challengeAreaList = [
  "community", "creative", "outdoors", "personal_growth", "not_applicable"
];

// Functions to update state variables (to be used by other modules)
export function setCalendarInstance(instance) {
    calendar = instance;
}

export function setAllEvents(events) {
    allEvents = events;
}

export function setCurrentEventId(id) {
    currentEventId = id;
    console.log("Current Event ID set to:", currentEventId);
    // Update the hidden input in the view modal when the ID changes
    if(dom.editEventId) {
        dom.editEventId.value = id;
    }
}

export function setCurrentInviteeId(id) {
    currentInviteeId = id;
}

export function getCurrentInviteeId() {
  return currentInviteeId;
}


// Functions to set Choices instances
export function setOrganiserChoices(choices) { organiserChoices = choices; }
export function setLeaderChoices(choices) { leaderChoices = choices; }
export function setAssistantChoices(choices) { assistantChoices = choices; }
export function setScoutMethodChoices(choices) { scoutMethodChoices = choices; }
export function setChallengeAreaChoices(choices) { challengeAreaChoices = choices; }