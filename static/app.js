// app.js - Main entry point for the calendar application

import { initCalendar } from './calendarInitializer.js';
import { setupModals, populateChoicesDropdowns } from './modalHandler.js'; // Import setupModals and populateChoicesDropdowns
import { initStaticChoiceDropdowns } from './utils.js'; // Import only initStaticChoiceDropdowns
import { membersData, allEvents, userUnitId } from './state.js'; // Import necessary state variables

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

  // Initialize static Choices dropdowns (Challenge Area, Scout Method)
  // These instances are now stored in state within initStaticChoiceDropdowns
   initStaticChoiceDropdowns();

  // Set up event listeners for modals.
  // The Choices instances for members are created and managed within modalHandler now.
   setupModals();

  // Populate initial member choices for the edit/create modal dropdowns
  // when the page loads, using the embedded unit members data.
  // This populates the dropdowns even before a modal is opened,
  // ensuring they are ready if the user clicks 'Create Event' or 'Edit/View'.
    if (membersData && membersData.unit_members) {
        const initialUnitMembers = membersData.unit_members.map(m => ({
            value: m.id,
            label: `${m.first_name} ${m.last_name}`
        }));
        populateChoicesDropdowns(initialUnitMembers); // Call the function from modalHandler
    } else {
        console.warn("Embedded unit members data not found. Member dropdowns may not be populated initially.");
        // Consider adding logic here to fetch members if embedded data is missing.
    }


  // Initialize the calendar, passing the filterEvents function
  initCalendar(filterEvents);

  console.log("Initialization complete.");
}

document.addEventListener('DOMContentLoaded', initializeApp);