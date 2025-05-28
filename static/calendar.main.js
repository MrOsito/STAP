// static/calendar.main.js
import { setUnitMembers } from './calendar.config.js'; // Keep if setUnitMembers is used elsewhere or for future use
import { initCalendar } from './calendar.init.js';
import { setupEditEventButton, setupSaveButton, setupDeleteButton } from './calendar.ui.js'; // Added setupDeleteButton
import { initStaticChoiceDropdowns } from './calendar.choices.js'; // Removed populateMemberChoices

// --- Startup ---
function initializeApp() {
  console.log("Initializing Calendar...");
  
  console.time("initCalendar");
  initCalendar();
  console.timeEnd("initCalendar");
  
  console.time("setupEditEventButton");
  setupEditEventButton();
  console.timeEnd("setupEditEventButton");
  
  console.time("setupSaveButton");
  setupSaveButton();
  console.timeEnd("setupSaveButton");

  console.time("setupDeleteButton"); // Add this call
  setupDeleteButton();
  console.timeEnd("setupDeleteButton");
  
  console.time("initStaticChoiceDropdowns");
  initStaticChoiceDropdowns(); // This initializes Challenge Area, Scout Method etc.
  console.timeEnd("initStaticChoiceDropdowns");

  // REMOVED the "unitMembersSetup" block as members are fetched on-demand by calendar.ui.js
  // console.time("unitMembersSetup");
  // const localUnitMembers = membersData.unit_members.map(m => ({ value: m.id, label: `${m.first_name} ${m.last_name}` })); // membersData no longer has this
  // setUnitMembers(localUnitMembers); 
  // populateMemberChoices(localUnitMembers); // This function was removed
  // console.timeEnd("unitMembersSetup");

  // If you want to clear/initialize the shared unitMembers in config.js:
  setUnitMembers([]); // Initialize as empty or based on a new strategy if needed

  console.log("Initialization complete.");
}

document.addEventListener('DOMContentLoaded', initializeApp);