// STAP/static/calendar.config.js

// --- Global Variables for Calendar State & Choices Instances ---
export let calendar = null;
export let allEvents = [];
// export let cachedMembers = []; // Consider if this is still needed or how it's populated
export let currentEventId = null;
export let currentInviteeId = null;
export let currentInviteeType = null; // For 'unit' or 'group'

// These unitMembers/groupMembers are for shared state if needed by other modules.
// They are not pre-populated from HTML anymore.
export let unitMembers = [];
export let groupMembers = [];

// To hold Choices.js instances
export let organiserChoices = null;
export let leaderChoices = null;
export let assistantChoices = null;
export let scoutMethodChoices = null;
export let challengeAreaChoices = null;

// --- Setter Functions for Global State ---
export function setCalendar(instance) { calendar = instance; }
export function setAllEvents(events) { allEvents = events; }
export function setCurrentEventId(id) { currentEventId = id; }
export function setCurrentInviteeId(id) { currentInviteeId = id; }
export function setCurrentInviteeType(type) { currentInviteeType = type; } // Setter for invitee type

export function setOrganiserChoices(choices) { organiserChoices = choices; }
export function setAssistantChoices(choices) { assistantChoices = choices; }
export function setLeaderChoices(choices) { leaderChoices = choices; }
export function setScoutMethodChoices(instance) { scoutMethodChoices = instance; }
export function setChallengeAreaChoices(instance) { challengeAreaChoices = instance; }

export function setUnitMembers(members) { unitMembers = members; }
export function setGroupMembers(members) { groupMembers = members; }


// --- Safely Parse Embedded JSON Data ---

function parseJsonFromDom(elementId) {
    try {
        const element = document.getElementById(elementId);
        if (element && element.textContent) {
            return JSON.parse(element.textContent);
        } else {
            console.warn(`Data script tag with ID '${elementId}' not found or empty.`);
        }
    } catch (e) {
        console.error(`Error parsing JSON from ID '${elementId}':`, e);
    }
    return {}; // Return empty object on error or if not found
}

export const userData = parseJsonFromDom('user-data');
export const membersData = parseJsonFromDom('members-data'); // Expected to be {} now
export const apiConfigData = parseJsonFromDom('api-config-data');

// --- Derived Constants (with fallbacks for safety) ---
export const userUnitId = userData?.unit_id || null;
export const userMemberId = userData?.member_id || null;
export const userMemberName = userData?.member_name || '';

export const TERRAIN_EVENTS_API_URL = apiConfigData?.EVENTS_API_URL || '';
export const TERRAIN_MEMBERS_API_URL = apiConfigData?.MEMBERS_API_URL || '';

// --- Cached DOM Elements ---
// These are loaded when the module first executes.
// This assumes this config file is ONLY loaded on pages where these elements are expected to exist.
// If not, these could be null, and code using them would need to check.
export const dom = {
  calendarLoader: document.getElementById('calendarLoader'),
  // inviteeFilter is dynamically injected, so might be null here. Better to get it when needed.
  // inviteeFilter: document.getElementById('inviteeFilter'), 
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
  editEventId: document.getElementById('editEventId'), // Assuming this is always present in edit modal context
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

// --- Static Lists for Choices.js ---
export const scoutMethodList = [
  "symbolic_framework", "community_involvement", "learn_by_doing",
  "nature_and_outdoors", "patrol_system", "youth_leading_adult_supporting",
  "promise_and_law", "personal_progression"
];

export const challengeAreaList = [
  "community", "creative", "outdoors", "personal_growth", "not_applicable"
];