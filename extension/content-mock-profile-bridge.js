// Dev-only relay for popup mock profile changes.
// Remove this file and its manifest entry to remove the mock profile feature later.

(function () {
  'use strict';

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type !== 'AURA_PROFILE_CHANGED') return false;

    window.postMessage({
      type: 'AURA_EXT_PROFILE_CHANGED',
      source: 'aura-extension',
      profileId: message.profileId ?? null,
    }, '*');

    sendResponse({ success: true });
    return true;
  });
})();
