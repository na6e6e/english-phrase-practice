'use strict';

const STORAGE_KEY = 'phraseMasterProgress';

/**
 * Returns the full progress object from localStorage.
 * Shape: { [questionId]: { status: 'unanswered'|'correct'|'incorrect', flagged: boolean } }
 */
function getProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

/** Persists the progress object to localStorage. */
function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // localStorage may be unavailable (private mode, storage full)
  }
}

/**
 * Returns the state for a single question.
 * @returns {{ status: string, flagged: boolean }}
 */
function getQuestionState(id) {
  const progress = getProgress();
  return progress[id] || { status: 'unanswered', flagged: false };
}

/**
 * Updates the status of a question ('correct' | 'incorrect').
 * Only upgrades 'incorrect' → 'correct', never the other way.
 */
function setQuestionStatus(id, status) {
  const progress = getProgress();
  const current = progress[id] || { status: 'unanswered', flagged: false };

  // Once correct, don't regress to incorrect
  if (current.status === 'correct' && status === 'incorrect') return;

  progress[id] = { ...current, status };
  saveProgress(progress);
}

/**
 * Toggles the flagged state of a question.
 * @returns {boolean} new flagged state
 */
function toggleFlag(id) {
  const progress = getProgress();
  const current = progress[id] || { status: 'unanswered', flagged: false };
  progress[id] = { ...current, flagged: !current.flagged };
  saveProgress(progress);
  return progress[id].flagged;
}

/** Returns an array of question IDs that are currently flagged. */
function getFlaggedIds() {
  const progress = getProgress();
  return Object.keys(progress).filter(id => progress[id].flagged);
}

/** Wipes all stored progress. */
function resetProgress() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
