// static/calendar.main.js
import { membersData, unitMembers as configUnitMembers, setUnitMembers } from './calendar.config.js'; // Assuming unitMembers is in config
import { initCalendar } from './calendar.init.js';
import { setupEditEventButton, setupSaveButton } from './calendar.ui.js';
import { initStaticChoiceDropdowns, populateMemberChoices } from './calendar.choices.js';

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
  
  console.time("initStaticChoiceDropdowns");
  initStaticChoiceDropdowns();
  console.timeEnd("initStaticChoiceDropdowns");

  console.time("unitMembersSetup");
  // Initialize unitMembers from membersData (which is from config)
  const localUnitMembers = membersData.unit_members.map(m => ({ value: m.id, label: `${m.first_name} ${m.last_name}` }));
  setUnitMembers(localUnitMembers); // Update the shared unitMembers in config.js
  populateMemberChoices(localUnitMembers); // from choices.js
  console.timeEnd("unitMembersSetup");

  console.log("Initialization complete.");
}

document.addEventListener('DOMContentLoaded', initializeApp);
