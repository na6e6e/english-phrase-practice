'use strict';

/**
 * Speaks the given text using the Web Speech API (en-US).
 * Silently does nothing if the API is unavailable.
 */
function speak(text) {
  if (!window.speechSynthesis) return;

  // Cancel any in-progress speech first
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.88;
  utterance.pitch = 1;

  // Some browsers need a small delay after cancel()
  setTimeout(() => {
    window.speechSynthesis.speak(utterance);
  }, 80);
}
