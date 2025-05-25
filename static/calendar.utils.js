import {
    organiserChoices, leaderChoices, assistantChoices,
    challengeAreaChoices, scoutMethodChoices
} from './calendar.config.js';



// --- Utilities ---
export function toLocalDatetimeInputValue(utcString) {
  const date = new Date(utcString);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function toTerrainDatetime(localInputVal) {
  const d = new Date(localInputVal);
  return d.toISOString().replace("Z", "+00:00");
}

export function showSpinner(isLoading) {
  document.getElementById('calendarLoader').style.display = isLoading ? 'block' : 'none';
}

export function formatCamelCase(text) {
  return text.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function resetChoices(instance, selector, options = {}) {
  if (instance) instance.destroy();
  return new Choices(selector, options);
}

export function clearAllChoiceSelections() {
  [organiserChoices, leaderChoices, assistantChoices, challengeAreaChoices, scoutMethodChoices].forEach(choice => {
    if (choice) {
      choice.removeActiveItems();
      //choice.removeHighlightedItems();
    }
  });
}