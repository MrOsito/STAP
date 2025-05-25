// Global Variables
export let calendar, allEvents = [], cachedMembers = [], currentEventId = null, currentInviteeId = null;
export let unitMembers = [];
export let groupMembers = [];
export let organiserChoices, leaderChoices, assistantChoices, scoutMethodChoices, challengeAreaChoices;

//  Functions to update these 'global' variables if needed by other modules
export function setCalendar(instance) { calendar = instance; }
export function setAllEvents(events) { allEvents = events; }
export function setCurrentEventId(id) { currentEventId = id; }
export function setCurrentInviteeId(id) { currentInviteeId = id; }
export function setOrganiserChoices(choices) { organiserChoices = choices; }
export function setAssistantChoices(choices) { assistantChoices = choices; }
export function setLeaderChoices(choices) { leaderChoices = choices; }
export function setScoutMethodChoices(instance) { scoutMethodChoices = instance; }
export function setChallengeAreaChoices(instance) { challengeAreaChoices = instance; } // <<< THIS IS THE MISSING EXPORT
export function setUnitMembers(members) { unitMembers = members; }
export function setGroupMembers(members) { groupMembers = members; }


// ... and so on for other choice instances and unitMembers/groupMembers if they are modified externally.


export const userData = JSON.parse(document.getElementById('user-data').textContent);
export const membersData = JSON.parse(document.getElementById('members-data').textContent);
export const userUnitId = userData.unit_id;
export const userMemberId = userData.member_id;
export const userMemberName = userData.member_name;
export const apiConfigData = JSON.parse(document.getElementById('api-config-data').textContent);
export const TERRAIN_EVENTS_API_URL = apiConfigData.EVENTS_API_URL;
export const TERRAIN_MEMBERS_API_URL = apiConfigData.MEMBERS_API_URL;

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

export const scoutMethodList = [
  "symbolic_framework", "community_involvement", "learn_by_doing",
  "nature_and_outdoors", "patrol_system", "youth_leading_adult_supporting",
  "promise_and_law", "personal_progression"
];

export const challengeAreaList = [
  "community", "creative", "outdoors", "personal_growth", "not_applicable"
];
