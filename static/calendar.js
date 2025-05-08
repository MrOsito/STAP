// Global Variables
let calendar, allEvents = [], cachedMembers = [], currentEventId = null, currentInviteeId = null;
let unitMembers = [];
let groupMembers = [];
let organiserChoices, leaderChoices, assistantChoices, scoutMethodChoices, challengeAreaChoices;

// --- Logging Setup ---
// Use console methods for client-side logging
// console.log for general output
// console.info for informational messages
// console.warn for potential issues
// console.error for errors

// Retrieve data embedded in the HTML (assuming it's properly JSON-encoded on the server)
// Using .textContent is safe as it gets the text content, not interpreting HTML
try {
  const userDataElement = document.getElementById('user-data');
  const membersDataElement = document.getElementById('members-data');

  if (!userDataElement) {
    console.error("Error: user-data script tag not found!");
    // Handle this critical error, e.g., redirect to login or show a message
    alert("Application error: User data not available. Please try logging in again.");
    // Consider redirecting: window.location.href = '/login';
    throw new Error("User data element missing"); // Stop execution
  }
   if (!membersDataElement) {
    console.error("Error: members-data script tag not found!");
    alert("Application error: Members data not available.");
     throw new Error("Members data element missing"); // Stop execution
  }


  const userData = JSON.parse(userDataElement.textContent);
  const membersData = JSON.parse(membersDataElement.textContent); // Data used to populate dropdowns

  const userUnitId = userData.unit_id;
  const userMemberId = userData.member_id;
  const userMemberName = userData.member_name;

  console.info("User data and members data loaded successfully.");
  // console.debug("User Data:", userData); // Use debug for potentially sensitive/verbose data
  // console.debug("Members Data:", membersData); // Use debug for potentially sensitive/verbose data

} catch (error) {
  console.error("Failed to parse initial data:", error);
  alert("Error loading required data. Please check the console for details.");
   // Depending on severity, might prevent further script execution or redirect
   throw new Error("Failed to parse initial data");
}


// Cached DOM elements
const dom = {
  calendarLoader: document.getElementById('calendarLoader'),
  inviteeFilter: document.getElementById('inviteeFilter'), // This is injected later, handle with care
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
  editEventId: document.getElementById('editEventId'), // This seems unused in the provided code
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

const scoutMethodList = [
  "symbolic_framework", "community_involvement", "learn_by_doing",
  "nature_and_outdoors", "patrol_system", "youth_leading_adult_supporting",
  "promise_and_law", "personal_progression"
];

const challengeAreaList = [
  "community", "creative", "outdoors", "personal_growth", "not_applicable"
];


// --- Utilities ---
function toLocalDatetimeInputValue(utcString) {
  if (!utcString) return '';
  try {
    const date = new Date(utcString);
     if (isNaN(date.getTime())) {
       console.warn(`Invalid date string provided to toLocalDatetimeInputValue: ${utcString}`);
       return '';
     }
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  } catch (e) {
    console.error(`Error parsing date string ${utcString} in toLocalDatetimeInputValue:`, e);
    return '';
  }
}

function toTerrainDatetime(localInputVal) {
   if (!localInputVal) return '';
   try {
      const d = new Date(localInputVal);
       if (isNaN(d.getTime())) {
         console.warn(`Invalid date string provided to toTerrainDatetime: ${localInputVal}`);
         return '';
       }
      return d.toISOString(); // ISO string is generally preferred for APIs
   } catch (e) {
      console.error(`Error parsing date string ${localInputVal} in toTerrainDatetime:`, e);
      return '';
   }
}

function showSpinner(isLoading) {
  console.debug(`Setting calendar loader visibility: ${isLoading}`);
  if (dom.calendarLoader) {
      dom.calendarLoader.style.display = isLoading ? 'block' : 'none';
  } else {
      console.warn("Calendar loader element not found.");
  }
}

function formatCamelCase(text) {
   if (typeof text !== 'string') {
     console.warn("Non-string value provided to formatCamelCase:", text);
     return ''; // Return empty string or original value depending on desired behavior
   }
  return text.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function resetChoices(instance, selector, options = {}) {
  if (instance) {
    try {
      instance.destroy();
    } catch (e) {
      console.error("Error destroying Choices.js instance:", e);
      // Continue execution even if destruction fails
    }
  }
  const element = document.querySelector(selector);
  if (element) {
     try {
       return new Choices(element, options);
     } catch (e) {
       console.error(`Error initializing Choices.js for selector ${selector}:`, e);
       return null; // Return null if initialization fails
     }
  } else {
      console.warn(`Element not found for Choices.js selector: ${selector}`);
      return null; // Return null if element not found
  }
}

function clearAllChoiceSelections() {
   console.debug("Clearing all Choices.js selections.");
  [organiserChoices, leaderChoices, assistantChoices, challengeAreaChoices, scoutMethodChoices].forEach(choice => {
    if (choice) {
      try {
        choice.removeActiveItems();
        //choice.removeHighlightedItems(); // Highlighted items are temporary visual states
      } catch (e) {
         console.warn("Error clearing Choices.js selection:", e);
      }
    }
  });
}

function setupEditModalHeader(isCreateMode = false) {
  if (dom.eventEditModalLabel) {
     dom.eventEditModalLabel.textContent = isCreateMode ? "Create New Event" : "Edit Event";
  } else {
      console.warn("eventEditModalLabel element not found.");
  }

  if (dom.deleteEventBtn) {
    dom.deleteEventBtn.classList.toggle('d-none', isCreateMode);
  } else {
      console.warn("deleteEventBtn element not found.");
  }
}


// --- Calendar Setup ---
function initCalendar() {
  const calendarEl = document.getElementById('calendar');

  if (!calendarEl) {
    console.error("Calendar element (#calendar) not found!");
    return; // Cannot initialize calendar without the element
  }

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    displayEventTime: false, // Events are displayed without time
    dayMaxEventRows: 2, // Limit the number of events per day
    height: 'auto', // Calendar height adjusts to content
    headerToolbar: { // Configure the header buttons and title
      left: '',
      center: 'title',
      right: 'prev,next today'
    },
    loading: showSpinner, // Function to show/hide spinner during loading
    eventContent: renderEventContent, // Function to customize event rendering
    eventSources: [fetchEvents], // Function to fetch events
    eventClick: handleEventClick, // Handler for clicking on an event
    dateClick: handleDateClick, // Handler for clicking on a date cell
    fixedWeekCount: false // Allow the calendar to have a variable number of weeks
  });

  calendar.render(); // Render the calendar
  console.info("FullCalendar initialized and rendered.");
  injectInviteeFilter(); // Inject the custom filter dropdown
}

// Inject a filter into the Calendar based on Invitee Name i.e. Cubs/Scouts/Group
function injectInviteeFilter() {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) {
    console.warn("Calendar element not found, cannot inject invitee filter.");
    return;
  }
  const headerLeft = calendarEl.querySelector('.fc-toolbar .fc-toolbar-chunk:first-child');

  if (headerLeft) {
    const filterHTML = `
      <select id="inviteeFilter" class="form-select form-select-sm" style="width: auto; display: inline-block; margin-left: 8px;">
        <option value="">All Invitees</option>
      </select>
    `;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = filterHTML; // This is static HTML, safe.
    headerLeft.appendChild(wrapper);

    // Cache the injected invitee filter element
    dom.inviteeFilter = document.getElementById('inviteeFilter');

    if (dom.inviteeFilter) {
       dom.inviteeFilter.addEventListener('change', () => {
         console.log("Invitee filter changed to:", dom.inviteeFilter.value);
         calendar.removeAllEvents(); // Remove current events from calendar display
         calendar.addEventSource(filterEvents()); // Add filtered events back
       });
       console.info("Invitee filter injected and event listener added.");
    } else {
       console.error("Injected inviteeFilter element not found after appending.");
    }

  } else {
      console.warn("Calendar header left chunk not found, cannot inject invitee filter.");
  }
}



//Populate the Event Filter
function populateInviteeFilter() {
  if (!dom.inviteeFilter) {
     console.warn("Invitee filter element not available, cannot populate filter.");
     return;
  }

  const inviteeNames = [...new Set(allEvents.map(event => event.invitee_name).filter(Boolean))].sort();
  console.debug("Unique invitee names for filter:", inviteeNames);

  // Using innerHTML for options is generally safe with trusted data, but building options with textContent is more robust
  dom.inviteeFilter.innerHTML = '<option value="">All Invitees</option>'; // Static HTML is safe

  inviteeNames.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name; // Use textContent to set option text safely
    dom.inviteeFilter.appendChild(option);
  });
  console.info("Invitee filter populated.");
}


// --- PREPOULATE CHOICES ---

function initStaticChoiceDropdowns() {
    console.log("Defining and initializing static choice dropdowns...");
    // Initialize Challenge Area Choices
    challengeAreaChoices = resetChoices(null, "#editChallengeArea", {
        removeItemButton: true
    });
     if (challengeAreaChoices) {
        challengeAreaChoices.setChoices(
            challengeAreaList.map(e => ({ value: e, label: formatCamelCase(e) })),
            'value',
            'label',
            true
        );
        console.log("Challenge Area Choices initialized.");
     } else {
         console.error("Failed to initialize Challenge Area Choices.");
     }


    // Initialize Scout Method Choices
    scoutMethodChoices = resetChoices(null, "#editScoutMethod", {
        removeItemButton: true,
        searchEnabled: false // Disable search for static list
    });
     if (scoutMethodChoices) {
        scoutMethodChoices.setChoices(
            scoutMethodList.map(e => ({ value: e, label: formatCamelCase(e) })),
            'value',
            'label',
            true
        );
        console.log("Scout Method Choices initialized.");
     } else {
          console.error("Failed to initialize Scout Method Choices.");
     }
    console.log("Static choice dropdowns initialization complete.");
}


function populateTextFields(data) {
   console.debug("Populating text fields with data:", data);
  if (dom.editTitle) dom.editTitle.value = data.title || '';
  if (dom.editLocation) dom.editLocation.value = data.location || '';
  if (dom.editDescription) dom.editDescription.value = data.description || '';

  if (dom.editStart) dom.editStart.value = data.start_datetime ? toLocalDatetimeInputValue(data.start_datetime) : '';
  if (dom.editEnd) dom.editEnd.value = data.end_datetime ? toLocalDatetimeInputValue(data.end_datetime) : '';

   // ### Client-side Input Validation Note:
   // Before sending the data from these fields to the server (in saveNewEvent/saveEditedEvent),
   // you should add client-side validation here or in buildPatchPayload.
   // For example, check if required fields like title and dates are filled,
   // if dates are valid and in the correct range (end after start), and
   // if text lengths adhere to backend constraints (maxlength attributes help, but server validation is needed).
   // This provides immediate feedback to the user and reduces unnecessary requests with invalid data.

}

function setDropdownSelections(data) {
   console.debug("Setting dropdown selections with data:", data);
   // Use .map(String) to ensure values are strings for comparison, as Choices.js might return strings
  if (organiserChoices) organiserChoices.setChoiceByValue((data.organisers || []).map(o => String(o.id)));
  if (leaderChoices) leaderChoices.setChoiceByValue((data.attendance?.leader_members || []).map(m => String(m.id)));
  if (assistantChoices) assistantChoices.setChoiceByValue((data.attendance?.assistant_members || []).map(m => String(m.id)));

  if (challengeAreaChoices && data.challenge_area) {
     // Ensure data.challenge_area is treated as an array of strings
    const challengeAreaValues = Array.isArray(data.challenge_area)
      ? data.challenge_area.map(String)
      : (data.challenge_area ? [String(data.challenge_area)] : []);
    challengeAreaChoices.setChoiceByValue(challengeAreaValues);
  }

  if (scoutMethodChoices) {
    // Ensure data.review?.scout_method_elements is treated as an array of strings
    const scoutMethodValues = (data.review?.scout_method_elements || []).map(String);
    scoutMethodChoices.setChoiceByValue(scoutMethodValues);
  }
}



function populateChoicesDropdowns(members) {
    console.debug("Populating Choices.js dropdowns with members:", members);
    // Destroy existing instances before creating new ones
    organiserChoices = resetChoices(organiserChoices, "#editOrganiser", { removeItemButton: true });
    leaderChoices = resetChoices(leaderChoices, "#editLeaders", { removeItemButton: true });
    assistantChoices = resetChoices(assistantChoices, "#editAssistants", { removeItemButton: true });

    // Set the new choices
    if (organiserChoices) organiserChoices.setChoices(members, 'value', 'label', true);
    if (leaderChoices) leaderChoices.setChoices(members, 'value', 'label', true);
    if (assistantChoices) assistantChoices.setChoices(members, 'value', 'label', true);
}


function resetDropdowns() {
    console.debug("Resetting Choices.js dropdowns.");
    // Re-initialize static dropdowns (Challenge Area, Scout Method) to clear previous selections
    initStaticChoiceDropdowns(); // This will destroy and re-create with base choices

    // Clear selections for member dropdowns - re-population happens later in fetchMembersAndPopulateSelects
     if (organiserChoices) organiserChoices.removeActiveItems();
     if (leaderChoices) leaderChoices.removeActiveItems();
     if (assistantChoices) assistantChoices.removeActiveItems();
}



// --- Render Events (Title + Icon) ---
function renderEventContent(arg) {
  const props = arg.event.extendedProps;
  // Check if props and event_status exist before accessing to avoid errors
  const isConcluded = props?.event_status?.toLowerCase() === "concluded";

  const wrapper = document.createElement('div');
  wrapper.className = 'fc-event-main';
  wrapper.style.cssText = `
      display: flex;
      align-items: center;
      overflow: visible; /* Allow content to overflow if needed */
      white-space: normal; /* Allow text wrapping */
  `;


  if (isConcluded) {
    const icon = document.createElement('i');
    icon.className = 'bi bi-check-circle-fill text-success me-1';
    icon.style.fontSize = '0.95rem';
    wrapper.appendChild(icon);
  }

  const title = document.createElement('span');
  title.className = 'fc-event-title';
   // Use textContent to safely display the event title
  title.textContent = arg.event.title || 'No Title'; // Provide default if title is missing
  title.style.cssText = `
      flex-grow: 1; /* Allow title to take available space */
      overflow: visible; /* Ensure text doesn't get hidden */
      text-overflow: unset; /* Prevent ellipsis */
  `;

  wrapper.appendChild(title);

   // Return as a DOM node array as expected by eventContent
  return { domNodes: [wrapper] };
}

// --- Fetch Events from Backend ---
async function fetchEvents(fetchInfo, successCallback, failureCallback) {
   console.info(`Workspaceing events from ${fetchInfo.startStr} to ${fetchInfo.endStr}`);
  const url = `/events?start=${encodeURIComponent(fetchInfo.startStr)}&end=${encodeURIComponent(fetchInfo.endStr)}`;
  const errorEl = document.getElementById('calendarError');

  // Show the loader only for the duration of the fetch
  showSpinner(true);

  try {
    const res = await fetch(url);
    // Check for non-ok status codes explicitly
    if (!res.ok) {
       // Attempt to read error response from server if available and not a 204 (No Content)
       const errorText = await res.text();
       console.error(`[Calendar] HTTP error fetching events: ${res.status} - ${res.statusText}`, errorText);
       throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
    }

    // Check if response has content before trying to parse JSON (handle 204 No Content)
    const events = res.status === 204 ? [] : await res.json();

    if (!Array.isArray(events)) {
       console.error("[Calendar] Fetched data is not an array:", events);
        if (errorEl) {
           errorEl.textContent = "Error: Received invalid data format from server.";
           errorEl.classList.remove('d-none');
        }
       // Pass an empty array to successCallback to clear calendar if data is malformed
        successCallback([]);
       return; // Stop processing
    }


    if (events.length === 0) {
      console.warn("[Calendar] No events found in the fetched range.");
      if (errorEl) errorEl.classList.remove('d-none'); // Keep/Show error if 0 events considered an issue
       if (errorEl) { // Adjust error message for no events vs fetch error
         errorEl.textContent = "No events found for the selected period.";
         errorEl.classList.remove('d-none');
       }
    } else {
      console.info(`[Calendar] Successfully fetched ${events.length} events.`);
      if (errorEl) errorEl.classList.add('d-none');  // Hide error if events were loaded
    }

    allEvents = events; // Cache all fetched events
    populateInviteeFilter(); // Update filter options based on all events
    successCallback(filterEvents()); // Pass filtered events to FullCalendar

  } catch (error) {
    console.error("[Calendar] Error fetching events:", error);
    if (errorEl) {
      errorEl.textContent = `Error loading events: ${error.message}. Your session may have expired. Please log out and log back in.`;
      errorEl.classList.remove('d-none');
    }
    failureCallback(error); // Notify FullCalendar of the error
  } finally {
    showSpinner(false); // Always hide the loader
  }
}


function filterEvents() {
  const selectedInvitee = dom.inviteeFilter?.value || "";
  console.debug(`Filtering events by invitee: "${selectedInvitee}"`);
  if (!selectedInvitee) {
    return [...allEvents]; // Return a copy of all events if no filter
  }
  // Ensure comparison is safe by converting to string
  return allEvents.filter(event => String(event.invitee_name) === String(selectedInvitee));
}


// --- Handle Day Click (Create New Event) ---
function handleDateClick(info) {
  console.log("Clicked date:", info.dateStr);

  // Set currentInviteeId to the user's unit ID for new events
  currentInviteeId = userUnitId;
  currentEventId = null; // Ensure no event ID is set for creation

  setupEditModalHeader(true); // Configure modal header for creation

  clearAllChoiceSelections(); // Clear selections from previous modal uses

  // Prefill blank fields and set default start/end times
  if (dom.editTitle) dom.editTitle.value = "";
  if (dom.editLocation) dom.editLocation.value = "";
  if (dom.editDescription) dom.editDescription.value = "";

   // Set default times, e.g., 6:30 PM to 8:00 PM on the clicked date
  const defaultStartTime = info.dateStr + "T18:30";
  const defaultEndTime = info.dateStr + "T20:00";

  if (dom.editStart) dom.editStart.value = defaultStartTime;
  if (dom.editEnd) dom.editEnd.value = defaultEndTime;


  if (dom.readOnlyReason) dom.readOnlyReason.classList.add('d-none'); // Hide read-only message

   // Enable all form elements for editing
  document.querySelectorAll('#eventEditModal input, #eventEditModal select, #eventEditModal textarea, #eventEditModal button.btn-primary')
    .forEach(el => el.disabled = false);

   // Set save button mode to 'create'
  if (dom.saveChangesBtn) dom.saveChangesBtn.dataset.mode = "create";


   // Fetch and populate member choices based on the user's unit for a new event
   // Note: For creating events, members should typically be those the user can invite,
   // which might be their unit members or potentially others depending on rules.
   // Assuming new events are created within the user's unit context for member selection.
  fetchMembersAndPopulateSelects(userUnitId);


   // Show the edit/create modal
  const editModalInstance = bootstrap.Modal.getOrCreateInstance(dom.eventEditModal);
  editModalInstance.show();
   console.info("Create new event modal opened.");
}



// --- Handle Event Click (Edit Existing) ---
function handleEventClick(info) {
  console.time("handleEventClick total");
  console.log("Clicked event:", info.event.id, info.event.title);

  currentEventId = info.event.id;
  currentInviteeId = info.event.extendedProps.invitee_id || null;

  const statusRaw = info.event.extendedProps.event_status || '';
  const challengeRaw = info.event.extendedProps.challenge_area || '';

   // Populate the view-only modal (eventModal)
   // Use textContent for safe display of event details
  if (dom.eventModalLabel) dom.eventModalLabel.textContent = info.event.title || 'No Title';
  if (dom.eventStart) dom.eventStart.textContent = info.event.start ? new Date(info.event.start).toLocaleString() : 'N/A';
  if (dom.eventEnd) dom.eventEnd.textContent = info.event.end ? new Date(info.event.end).toLocaleString() : 'N/A';
  if (dom.eventStatus) dom.eventStatus.textContent = formatCamelCase(statusRaw);
  if (dom.eventChallenge) dom.eventChallenge.textContent = formatCamelCase(challengeRaw);
  if (dom.eventInvitee) dom.eventInvitee.textContent = info.event.extendedProps.invitee_name || 'N/A';


  // You can still store the raw values elsewhere if needed (e.g., on data attributes)
  if (dom.eventStatus) dom.eventStatus.dataset.raw = statusRaw;
  if (dom.eventChallenge) dom.eventChallenge.dataset.raw = challengeRaw;

  // Clear event ID from any hidden input in the view modal if it was used (editEventId seems unused in template)
  // if (dom.editEventId) dom.editEventId.value = '';

  // Hide Delete button in the view modal footer - it's in the edit modal
  // This line might be left over from a different structure? The delete button is in edit_event_modal.html
  // if (dom.deleteEventBtn) dom.deleteEventBtn.classList.add('d-none');

   console.info(`View event modal populated for event ID: ${currentEventId}`);

   // Show the view-only modal
   console.debug("Showing view event modal.");
  const viewModalInstance = bootstrap.Modal.getOrCreateInstance(dom.eventModal);
  viewModalInstance.show();
   console.timeEnd("handleEventClick total");

}

// --- Setup Edit Button in View Modal ---
function setupEditEventButton() {
  if (!dom.editEventBtn) {
    console.error("Edit event button (#editEventBtn) not found.");
    return;
  }
  dom.editEventBtn.addEventListener('click', async () => {
    if (!currentEventId) {
      console.warn("Edit button clicked but no currentEventId is set.");
      alert("No event selected for editing."); // User feedback
      return;
    }
    console.log(`Edit button clicked for event ID: ${currentEventId}`);

    // Hide the view modal
    const viewModalInstance = bootstrap.Modal.getInstance(dom.eventModal);
     if (viewModalInstance) viewModalInstance.hide();


    // Show spinner and disable button while loading edit data
    const btn = dom.editEventBtn;
    const spinner = dom.editBtnSpinner;
    const text = dom.editBtnText;

    if (btn) btn.disabled = true;
    if (spinner) spinner.classList.remove('d-none');
    if (text) text.textContent = "Loading...";

    console.time("Total Edit Flow");

    try {
      // Fetch members and populate select dropdowns first
      console.time("fetchMembersAndPopulateSelects");
       // Use currentInviteeId to fetch members relevant to this event's invitee
      await fetchMembersAndPopulateSelects(currentInviteeId);
      console.timeEnd("fetchMembersAndPopulateSelects");


      console.time("fetchEventDetail");
      const res = await fetch(`/event/${currentEventId}`);
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`HTTP error fetching event detail: ${res.status} - ${res.statusText}`, errorText);
        throw new Error(`Failed to fetch event details: ${res.statusText}`);
      }
      console.timeEnd("fetchEventDetail");


      console.time("parseEventDetailJSON");
      const data = await res.json();
      console.timeEnd("parseEventDetailJSON");

      console.time("populateEditForm");
      populateEditForm(data); // Populate the edit modal form
      console.timeEnd("populateEditForm");

       console.info(`Edit modal populated for event ID: ${currentEventId}`);

    } catch (err) {
      console.error("Error loading event for editing:", err);
      alert(`Could not load event for editing: ${err.message}`); // User feedback
    } finally {
      console.timeEnd("Total Edit Flow");
      // Restore button state
      if (btn) btn.disabled = false;
      if (spinner) spinner.classList.add('d-none');
      if (text) text.textContent = "Edit / View";
    }
  });
   console.info("Edit button event listener setup.");
}



function populateEditForm(data) {
   console.debug("Populating edit form with data:", data);
  setupEditModalHeader(false); // Configure modal header for editing
  resetDropdowns(); // Reset and re-initialize Choices.js dropdowns
  populateTextFields(data); // Populate text inputs
  setDropdownSelections(data); // Set selections in Choices.js dropdowns
  handleReadOnlyState(data); // Determine if the form should be read-only

  // Show the edit modal
  const editModalInstance = bootstrap.Modal.getOrCreateInstance(dom.eventEditModal);
  editModalInstance.show();
}




// --- Handle Read-Only Mode in Edit Modal ---
function handleReadOnlyState(data) {
  // Determine if the form should be read-only
  const eventStatus = (data.status || data.event_status || '').toLowerCase();
  const isConcluded = eventStatus === 'concluded';
  // Compare currentInviteeId (from clicked event) with user's unit ID (for permission check)
  const wrongInvitee = String(currentInviteeId) !== String(userUnitId);
  const isReadOnly = isConcluded || wrongInvitee;

  console.debug(`Handling read-only state: Concluded=${isConcluded}, WrongInvitee=${wrongInvimee}, ReadOnly=${isReadOnly}`);

  const reasonEl = dom.readOnlyReason;
  if (reasonEl) {
    if (isReadOnly) {
      reasonEl.textContent = isConcluded
        ? "This event has concluded and is read-only."
        : "You do not have permission to edit this event.";
      reasonEl.classList.remove('d-none');
    } else {
      reasonEl.classList.add('d-none');
    }
  } else {
      console.warn("readOnlyReason element not found.");
  }


   // Disable/enable all relevant form elements
  const formElements = document.querySelectorAll('#eventEditModal input, #eventEditModal select, #eventEditModal textarea, #eventEditModal button.btn-primary');
  formElements.forEach(el => el.disabled = isReadOnly);

   // Disable/enable Choices.js instances
  [organiserChoices, leaderChoices, assistantChoices, scoutMethodChoices, challengeAreaChoices].forEach(choice => {
    if (choice) {
      try {
        isReadOnly ? choice.disable() : choice.enable();
      } catch (e) {
         console.warn("Error enabling/disabling Choices.js instance:", e);
      }
    }
  });

   // Disable/enable the main save button
  if (dom.saveChangesBtn) dom.saveChangesBtn.disabled = isReadOnly;

   // The delete button is handled in setupEditModalHeader based on create/edit mode,
   // but you might also want to disable it here if in read-only edit mode.
   // If the user is in edit mode but doesn't have permission (wrongInvitee),
   // the delete button should also be disabled.
   if (dom.deleteEventBtn && !dom.deleteEventBtn.classList.contains('d-none')) {
       dom.deleteEventBtn.disabled = wrongInvitee; // Cannot delete if wrong invitee
   }


   console.info(`Edit modal set to read-only: ${isReadOnly}`);
}

// --- Save Button (Create or Edit) ---
function setupSaveButton() {
  if (!dom.saveChangesBtn) {
     console.error("Save changes button (#saveChangesBtn) not found.");
     return;
  }
  dom.saveChangesBtn.addEventListener('click', () => {
    const mode = dom.saveChangesBtn.dataset.mode || "edit";
    console.log(`Save button clicked in mode: ${mode}`);

    // ### Client-side Input Validation Call:
    // Call a validation function here before proceeding
    if (!validateEventForm()) {
        console.warn("Client-side validation failed.");
        // The validation function should provide user feedback (e.g., highlight fields, show error messages)
        return; // Stop if validation fails
    }


    if (mode === "create") {
      saveNewEvent();
    } else { // mode === "edit"
      saveEditedEvent();
    }
  });
   console.info("Save changes button event listener setup.");
}

// ### Client-side Validation Function (Example Structure)
function validateEventForm() {
    console.debug("Performing client-side form validation.");
    let isValid = true;
    const errors = [];

    // Clear previous validation feedback (you'll need to implement this in your UI)
    // e.g., remove 'is-invalid' classes, clear error message spans

    // Example: Check if Title is not empty
    if (dom.editTitle && dom.editTitle.value.trim() === "") {
        isValid = false;
        errors.push("Title is required.");
        dom.editTitle.classList.add('is-invalid'); // Example feedback
    } else if (dom.editTitle) {
         dom.editTitle.classList.remove('is-invalid');
    }

    // Example: Check if Start and End dates are provided
    if (dom.editStart && !dom.editStart.value) {
        isValid = false;
        errors.push("Start date is required.");
        dom.editStart.classList.add('is-invalid');
    } else if (dom.editStart) {
        dom.editStart.classList.remove('is-invalid');
    }

     if (dom.editEnd && !dom.editEnd.value) {
        isValid = false;
        errors.push("End date is required.");
        dom.editEnd.classList.add('is-invalid');
     } else if (dom.editEnd) {
         dom.editEnd.classList.remove('is-invalid');
     }

    // Example: Check if End date is after Start date (if both are provided)
    if (dom.editStart?.value && dom.editEnd?.value) {
        const startDate = new Date(dom.editStart.value);
        const endDate = new Date(dom.editEnd.value);
        if (startDate >= endDate) {
            isValid = false;
            errors.push("End date must be after start date.");
             if (dom.editEnd) dom.editEnd.classList.add('is-invalid');
        } else {
            if (dom.editEnd) dom.editEnd.classList.remove('is-invalid');
        }
    }


    // Add validation for other fields as needed (e.g., checking format, min/max length)
    // Check Choices.js selections if they are required

    if (!isValid) {
       console.warn("Validation errors:", errors);
       // Display errors to the user (e.g., in an alert or dedicated error area in the modal)
       alert("Please fix the following errors:\n" + errors.join('\n'));
    }

    return isValid;
}


function saveNewEvent() {
   console.info("Attempting to create new event.");
  const payload = buildPatchPayload(); // buildPatchPayload is used for both create and update

  fetch(`/events`, { // POST request to /events endpoint
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
  .then(async res => { // Use async to await text() or json()
    if (!res.ok) {
       const errorDetail = await res.text(); // Get error details from server response
      console.error(`Failed to create event. Status: ${res.status}`, errorDetail);
       // Provide user feedback with server error details if available
      throw new Error(`Failed to create event: ${res.status} - ${res.statusText}. Details: ${errorDetail}`);
    }
     console.info("New event created successfully.");
     // Check for 204 No Content specifically
    if (res.status !== 204) {
       // If API returns content (e.g., the created event object), you might want to process it
       const responseData = await res.json();
       console.debug("Create event response data:", responseData);
    }

    alert("✅ New event created successfully!"); // Success feedback
    const editModalInstance = bootstrap.Modal.getInstance(dom.eventEditModal);
    if (editModalInstance) editModalInstance.hide(); // Hide modal on success
    calendar.refetchEvents(); // Refresh calendar to show the new event
  })
  .catch(err => {
    console.error("Create event error:", err);
    alert(`Could not create event: ${err.message}`); // User feedback including error details
  });
}

function saveEditedEvent() {
  if (!currentEventId) {
    console.warn("Save button clicked in edit mode but no currentEventId is set.");
    alert("No event selected for saving."); // User feedback
    return;
  }
  console.info(`Attempting to save edited event ID: ${currentEventId}`);

  const payload = buildPatchPayload();

  fetch(`/event/${currentEventId}`, { // PATCH request to specific event endpoint
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
  .then(async res => { // Use async to await text() or json()
    if (!res.ok) {
       const errorDetail = await res.text(); // Get error details from server response
      console.error(`Failed to update event. Status: ${res.status}`, errorDetail);
       // Provide user feedback with server error details if available
      throw new Error(`Failed to update event: ${res.status} - ${res.statusText}. Details: ${errorDetail}`);
    }
     console.info(`Event ID ${currentEventId} updated successfully.`);
     // Check for 204 No Content specifically
    if (res.status !== 204) {
        const responseData = await res.json();
        console.debug("Update event response data:", responseData);
    }


    alert("✅ Event updated successfully!"); // Success feedback
    const editModalInstance = bootstrap.Modal.getInstance(dom.eventEditModal);
    if (editModalInstance) editModalInstance.hide(); // Hide modal on success
    calendar.refetchEvents(); // Refresh calendar to show the updated event
  })
  .catch(err => {
    console.error("Save edited event error:", err);
    alert(`Could not save changes: ${err.message}`); // User feedback including error details
  });
}

function buildPatchPayload() {
   console.debug("Building patch/create payload.");

   // Get values from text inputs
  const title = dom.editTitle?.value || "";
  const description = dom.editDescription?.value || "";
  const location = dom.editLocation?.value || "";
  const startDatetime = dom.editStart?.value;
  const endDatetime = dom.editEnd?.value;


   // Get selected values from Choices.js dropdowns
  const organisers = organiserChoices?.getValue(true) || []; // .getValue(true) gets values as array
  const challengeArea = challengeAreaChoices?.getValue(true) || ""; // Can be single or multiple based on config
  const leaderMemberIds = leaderChoices?.getValue(true) || [];
  const assistantMemberIds = assistantChoices?.getValue(true) || [];
  const scoutMethodElements = scoutMethodChoices?.getValue(true) || [];

   // Ensure array types are correct even if single selection is used for Challenge Area
   const finalChallengeArea = Array.isArray(challengeArea) ? challengeArea : (challengeArea ? [challengeArea] : []);


  // ### XSS Note on Data Collection:
  // Data collected here from form inputs via .value is treated as plain text strings by the browser.
  // The vulnerability would arise if these strings (or strings from API responses)
  // are later inserted into the DOM using methods that interpret HTML (like innerHTML)
  // without prior sanitization. This code sends the data as JSON to the server,
  // relying on the server-side and the downstream API to handle it securely.

  const payload = {
    title: title,
    description: description,
    justification: "", // Assuming justification is not user-editable in this modal
    organisers: organisers.map(id => ({ id: String(id) })), // Format as required by API
    challenge_area: finalChallengeArea, // Send as array
    start_datetime: toTerrainDatetime(startDatetime),
    end_datetime: toTerrainDatetime(endDatetime),
    event_type: { // Assuming event type is based on the invitee ID selected/defaulted
      type: "unit", // Or "group", depends on invitee_id logic
      id: String(currentInviteeId) // Ensure ID is a string
    },
    attendance: {
      leader_member_ids: leaderMemberIds.map(String), // Ensure IDs are strings
      assistant_member_ids: assistantMemberIds.map(String), // Ensure IDs are strings
      attendee_member_ids: [] // Assuming attendees are not managed via this modal
    },
    schedule_items: [], // Assuming not managed via this modal
    achievement_pathway_oas_data: null, // Assuming not managed via this modal
    achievement_pathway_logbook_data: null, // Assuming not managed via this modal
    review: {
      general_tags: [], // Assuming not managed via this modal
      scout_method_elements: scoutMethodElements.map(String), // Ensure values are strings
      scout_spices_elements: [] // Assuming not managed via this modal
    },
    uploads: [], // Assuming not managed via this modal
    equipment_notes: "", // Assuming not user-editable
    additional_notes: "", // Assuming not user-editable
    location: location,
    iana_timezone: "Australia/Sydney", // Assuming timezone is fixed or determined otherwise
    status: "planned" // Assuming default status for new/edited events
  };

   console.debug("Built payload:", payload);
   return payload;
}


// Handle Delete Button
function setupDeleteButton() {
    if (!dom.deleteEventBtn) {
       console.error("Delete event button (#deleteEventBtn) not found.");
       return;
    }
    dom.deleteEventBtn.addEventListener('click', () => {
      if (!currentEventId) {
        console.warn("Delete button clicked but no currentEventId is set.");
        alert("No event selected for deletion."); // User feedback
        return;
      }
      console.log(`Delete button clicked for event ID: ${currentEventId}`);

      // Confirmation dialog for deletion
      if (confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
        console.info(`Confirmed deletion for event ID: ${currentEventId}`);
        fetch(`/event/${currentEventId}`, { // DELETE request to specific event endpoint
          method: "DELETE"
        })
        .then(async res => { // Use async to await text()
          if (!res.ok) {
             const errorDetail = await res.text(); // Get error details from server response
            console.error(`Failed to delete event. Status: ${res.status}`, errorDetail);
             // Provide user feedback with server error details if available
            throw new Error(`Failed to delete event: ${res.status} - ${res.statusText}. Details: ${errorDetail}`);
          }
          console.info(`Event ID ${currentEventId} deleted successfully.`);
          alert("✅ Event deleted successfully!"); // Success feedback
          const editModalInstance = bootstrap.Modal.getInstance(dom.eventEditModal);
          if (editModalInstance) editModalInstance.hide(); // Hide modal on success
          calendar.refetchEvents(); // Refresh calendar to remove the deleted event
        })
        .catch(err => {
          console.error("Delete event error:", err);
          alert(`Could not delete event: ${err.message}`); // User feedback including error details
        });
      } else {
          console.log(`Deletion cancelled for event ID: ${currentEventId}`);
      }
    });
     console.info("Delete event button event listener setup.");
}


// --- Fetch Members ---
// This function is used to populate the Choices.js dropdowns for members
function populateMemberChoices(members) {
    console.debug("Populating member Choices.js dropdowns with members:", members);
    // Destroy and re-create Choices.js instances for member selection dropdowns
    organiserChoices = resetChoices(organiserChoices, "#editOrganiser", { removeItemButton: true });
    leaderChoices = resetChoices(leaderChoices, "#editLeaders", { removeItemButton: true });
    assistantChoices = resetChoices(assistantChoices, "#editAssistants", { removeItemButton: true });

    // Set the new choices for each dropdown
    if (organiserChoices) organiserChoices.setChoices(members, 'value', 'label', true);
    if (leaderChoices) leaderChoices.setChoices(members, 'value', 'label', true);
    if (assistantChoices) assistantChoices.setChoices(members, 'value', 'label', true);
}

async function fetchMembersAndPopulateSelects(inviteeId) {
   console.info(`Workspaceing and populating members for invitee ID: ${inviteeId}`);
  console.time("fetchMembersAndPopulateSelects");

  try {
    const membersDataElement = document.getElementById('members-data');

    if (!membersDataElement) {
      console.error("members-data script tag not found!");
      // Fallback to fetching via API if embedded data is missing
      console.warn("Falling back to fetching members via API.");
      return await fetchMembersViaApi(inviteeId);
    }

    // Assuming membersData was parsed successfully at script start
    // Check if the embedded data contains unit and group members
    if (membersData?.unit_members && membersData?.group_members) {
      console.debug("Using embedded members data.");
      const isGroup = String(inviteeId) !== String(userUnitId);
       // Map the relevant list to the format expected by Choices.js
      const members = (isGroup ? membersData.group_members : membersData.unit_members)
        .map(m => ({ value: String(m.id), label: `${m.first_name || ''} ${m.last_name || ''}`.trim() })); // Ensure ID is string, handle missing names

      populateMemberChoices(members); // Populate the dropdowns
      console.info(`Populated ${members.length} members from embedded data for invitee ID: ${inviteeId}.`);
      console.timeEnd("fetchMembersAndPopulateSelects");
      return members; // Return the processed list
    } else {
      console.warn("Incomplete embedded members data found. Falling back to fetching via API.");
      // Fallback to fetching via API if embedded data is incomplete
      return await fetchMembersViaApi(inviteeId);
    }

  } catch (error) {
    console.error("Error processing members data:", error);
     // Fallback to fetching via API if processing embedded data fails
     console.warn("Falling back to fetching members via API due to error.");
     return await fetchMembersViaApi(inviteeId);
  }
}

// Fallback function to fetch members via the /members API endpoint
async function fetchMembersViaApi(inviteeId) {
    console.info(`Workspaceing members via API for invitee ID: ${inviteeId}`);
    try {
        const res = await fetch(`/members?invitee_id=${encodeURIComponent(inviteeId)}`); // Encode ID
        if (!res.ok) {
           const errorText = await res.text();
           console.error(`HTTP error fetching members via API: ${res.status} - ${res.statusText}`, errorText);
            // Throw a specific error that can be caught by the caller
           throw new Error(`Failed to fetch members: ${res.statusText}`);
        }
         // Assuming the /members endpoint returns {"results": [...]}
        const data = await res.json();
         if (!Array.isArray(data.results)) {
             console.error("API returned invalid format for members:", data);
             throw new Error("Received invalid data format for members from API.");
         }
        const members = (data.results || []).map(m => ({
            value: String(m.id), // Ensure ID is string
            label: `${m.first_name || ''} ${m.last_name || ''}`.trim() // Handle missing names
        }));
        populateMemberChoices(members);
        console.info(`Workspaceed and populated ${members.length} members via API for invitee ID: ${inviteeId}.`);
        return members;
    } catch (error) {
        console.error("Error fetching members via API:", error);
        alert(`Could not fetch members: ${error.message}`); // User feedback
        return []; // Return empty array on failure
    } finally {
         // No spinner to hide/show specifically for this helper, managed by the caller
    }
}



// --- Startup ---
function initializeApp() {
  console.log("Initializing application...");
  // Ensure DOM elements are available before initializing components
  if (!document.getElementById('calendar')) {
    console.error("Required DOM element #calendar not found. Aborting initialization.");
    return;
  }

  console.info("Initializing Calendar component.");
  initCalendar(); // Initialize FullCalendar

  console.info("Setting up button event listeners.");
  setupEditEventButton(); // Setup listener for the Edit/View button
  setupSaveButton(); // Setup listener for the Save Changes button
  setupDeleteButton(); // Setup listener for the Delete button

  console.info("Initializing static dropdowns (Challenge Area, Scout Method).");
  initStaticChoiceDropdowns(); // Populate static choices

  // Initial population of member choices dropdowns using embedded unit members
  // This happens on initial load, assuming the calendar view defaults to showing the user's unit
  if (membersData?.unit_members) {
      console.info("Populating initial member choices with user's unit members.");
      unitMembers = membersData.unit_members.map(m => ({ value: String(m.id), label: `${m.first_name || ''} ${m.last_name || ''}`.trim() }));
      populateMemberChoices(unitMembers);
  } else {
       console.warn("Embedded unit members data not available for initial population.");
  }


  console.log("Application initialization complete.");

   // ### Content Security Policy (CSP) Note:
   // A strong Content Security Policy header should be configured on the server-side (in Flask app.py)
   // to mitigate the impact of potential XSS vulnerabilities in client-side JavaScript.
   // CSP can restrict allowed sources for scripts, styles, etc., and prevent inline scripts,
   // significantly reducing the attack surface even if malicious content is injected into the DOM.
   // Example header (configure in Flask response):
   // Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' https://cdn.jsdelivr.net; img-src 'self' data:; connect-src 'self' https://members.terrain.scouts.com.au https://events.terrain.scouts.com.au;
}

// Add event listener to initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeApp);