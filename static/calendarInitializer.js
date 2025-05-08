// calendarInitializer.js - Initializes and renders the calendar

import { showSpinner } from './utils.js';
import { fetchEvents } from './apiService.js';
import { handleEventClick, handleDateClick } from './modalHandler.js'; // Import handlers
import { calendar, allEvents, setAllEvents } from './state.js'; // Import necessary state variables

// --- Calendar Setup ---
export function initCalendar(filterEventsCallback) { // Accept filterEventsCallback
  const calendarEl = document.getElementById('calendar');

  const calendarInstance = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    displayEventTime: false,
    dayMaxEventRows: 2,
    height: 'auto',
    headerToolbar: {
      left: '',
      center: 'title',
      right: 'prev,next today'
    },
    loading: showSpinner,
    eventContent: renderEventContent,
    eventSources: [{
        events: (fetchInfo, successCallback, failureCallback) => {
            fetchEvents(fetchInfo)
                .then(events => {
                    setAllEvents(events); // Update the global state
                    populateInviteeFilter(); // Populate filter after fetching all events
                    successCallback(filterEventsCallback()); // Use the provided callback
                })
                .catch(failureCallback);
        }
    }],
    eventClick: handleEventClick,
    dateClick: handleDateClick,
    fixedWeekCount: false
  });

  calendarInstance.render();
  injectInviteeFilter(calendarInstance, filterEventsCallback); // Pass calendarInstance and callback
  return calendarInstance; // Return the calendar instance
}

// Inject a filter into the Calendar based on Invitee Name i.e. Cubs/Scouts/Group
function injectInviteeFilter(calendarInstance, filterEventsCallback) { // Accept calendarInstance and callback
  const calendarEl = document.getElementById('calendar');
  const headerLeft = calendarEl.querySelector('.fc-toolbar .fc-toolbar-chunk:first-child');

  if (headerLeft) {
    const filterHTML = `
      <select id="inviteeFilter" class="form-select form-select-sm" style="width: auto; display: inline-block; margin-left: 8px;">
        <option value="">All Invitees</option>
      </select>
    `;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = filterHTML;
    headerLeft.appendChild(wrapper);

    document.getElementById('inviteeFilter').addEventListener('change', () => {
      calendarInstance.removeAllEvents(); // Use the passed instance
      calendarInstance.addEventSource(filterEventsCallback()); // Use the provided callback
    });
  }
}

//Populate the Event Filter
function populateInviteeFilter() {
  const inviteeSelect = document.getElementById('inviteeFilter');
  if (!inviteeSelect) return;

  const inviteeNames = [...new Set(allEvents.map(event => event.invitee_name).filter(Boolean))].sort();

  inviteeSelect.innerHTML = '<option value="">All Invitees</option>';
  inviteeNames.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    inviteeSelect.appendChild(option);
  });
}


// --- Render Events (Title + Icon) ---
function renderEventContent(arg) {
  const props = arg.event.extendedProps;
  const isConcluded = props.event_status?.toLowerCase() === "concluded";

  const wrapper = document.createElement('div');
  wrapper.className = 'fc-event-main';

  if (isConcluded) {
    const icon = document.createElement('i');
    icon.className = 'bi bi-check-circle-fill text-success me-1';
    icon.style.fontSize = '0.95rem';
    wrapper.appendChild(icon);
  }

  const title = document.createElement('span');
  title.className = 'fc-event-title';
  title.textContent = arg.event.title;
  wrapper.appendChild(title);

  return { domNodes: [wrapper] };
}