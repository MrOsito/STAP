// app.js - Main entry point for the calendar application

import { initCalendar } from './calendarInitializer.js';
import { setupModals } from './modalHandler.js';
import { initStaticChoiceDropdowns, populateMemberChoices } from './utils.js';
import { membersData, unitMembers, groupMembers, allEvents } from './state.js'; // Import necessary state

// Function to filter events based on the selected invitee
function filterEvents() {
  const selectedInvitee = document.getElementById('inviteeFilter')?.value || "";
  if (!selectedInvitee) {
    return [...allEvents]; // Use the imported allEvents
  }
  return allEvents.filter(event => event.invitee_name === selectedInvitee);
}

// --- Startup ---
function initializeApp() {
  console.log("Initializing Calendar...");

  // Initialize static Choices dropdowns
  const { challengeAreaChoices, scoutMethodChoices } = initStaticChoiceDropdowns();

  // Populate initial member choices (assuming for the current user's unit initially)
  const initialMembers = membersData.unit_members.map(m => ({ value: m.id, label: `${m.first_name} ${m.last_name}` }));
  const { organiserChoices, leaderChoices, assistantChoices } = populateMemberChoices(initialMembers);


  // Pass Choices instances to setupModals
  setupModals({ organiserChoices, leaderChoices, assistantChoices, challengeAreaChoices, scoutMethodChoices });


  // Initialize the calendar, passing the filterEvents function
  initCalendar(filterEvents);

  console.log("Initialization complete.");
}

document.addEventListener('DOMContentLoaded', initializeApp);