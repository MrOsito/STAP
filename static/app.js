// app.js - Main entry point for the calendar application

import { initCalendar } from './calendarInitializer.js';
// Import initializeMemberChoices and setupModals from modalHandler
// populateChoicesDropdowns is now called internally within modalHandler
import { initializeMemberChoices, setupModals } from './modalHandler.js';
import { initStaticChoiceDropdowns } from './utils.js';
// We still need membersData here to potentially check for initial population logic if necessary,
// although the logic is now primarily in fetchAndPopulateMembers within modalHandler.
import { membersData, allEvents, userUnitId } from './state.js';


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

  // Initialize static Choices dropdowns (Challenge Area, Scout Method) once
  // These instances are now stored in state within initStaticChoiceDropdowns
  initStaticChoiceDropdowns();

  // Initialize the member Choices dropdowns once when the app starts
  initializeMemberChoices();

  // Set up event listeners for modals.
  setupModals(); // Call setupModals to set up event listeners


  // Note: The initial population of member dropdowns on page load
  // is now implicitly handled:
  // 1. initializeMemberChoices creates empty Choices instances.
  // 2. When the calendar fetches events, if any events are present and you click one,
  //    handleEventClick -> handleEditEventClick -> fetchAndPopulateMembers is called,
  //    which will fetch/use embedded data and call populateChoicesDropdowns to fill the instances.
  // 3. If you click a date to create a new event, handleDateClick -> fetchAndPopulateMembers(userUnitId)
  //    is called, which will use embedded unit data and call populateChoicesDropdowns to fill them.
  //    So, there's no explicit need to call populateChoicesDropdowns here on initial page load
  //    unless you want the dropdowns populated immediately even before user interaction.
  //    Given the error context, it's safer to let the modal logic handle population on open/edit.


  // Initialize the calendar, passing the filterEvents function
  initCalendar(filterEvents);

  console.log("Initialization complete.");
}

document.addEventListener('DOMContentLoaded', initializeApp);