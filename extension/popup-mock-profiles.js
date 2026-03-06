// Dev-only mock profile controls.
// Remove this file, mock-profiles.js, the popup HTML section, and the manifest/content
// bridge entry to fully remove the feature later.

(function () {
  'use strict';

  const MOCK_PROFILE_STORAGE_KEY = 'AURA_EXT_ACTIVE_MOCK_PROFILE_ID';
  const ADAPTIVE_PROFILE_STORAGE_KEY = 'AURA_EXT_ADAPTIVE_OPTIMIZED_PROFILE';
  const REAL_PROFILE_ID = '__real__';

  function getPresets() {
    return Array.isArray(window.__AURA_MOCK_PROFILE_PRESETS__)
      ? window.__AURA_MOCK_PROFILE_PRESETS__
      : [];
  }

  async function getAuthState() {
    const result = await chrome.storage.local.get(['authToken', 'userId']);
    return {
      loggedIn: !!(result.authToken && result.userId),
    };
  }

  async function getSelectedProfileId() {
    const result = await chrome.storage.local.get([MOCK_PROFILE_STORAGE_KEY]);
    return typeof result[MOCK_PROFILE_STORAGE_KEY] === 'string'
      ? result[MOCK_PROFILE_STORAGE_KEY]
      : REAL_PROFILE_ID;
  }

  async function notifyActiveTabProfileChanged(profileId) {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tabId = tabs?.[0]?.id;
      if (!tabId) return;

      chrome.tabs.sendMessage(tabId, {
        type: 'AURA_PROFILE_CHANGED',
        profileId,
      }).catch(() => {});
    } catch (error) {
      console.warn('Mock profile notify failed:', error);
    }
  }

  function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 12px 20px;
      background: ${type === 'success' ? '#4CAF50' : '#f44336'};
      color: white;
      border-radius: 6px;
      font-size: 13px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 2500);
  }

  function buildStoredMockProfile(preset) {
    return {
      user_id: preset.id,
      metadata: {
        origin: preset.id === 'guest' ? 'category' : 'user',
        created_at: new Date().toISOString(),
        confidence_overall: 0.99,
        version: 1,
      },
      profile: preset.profile,
      profile_changes: {
        changed: Object.keys(preset.profile || {}),
        old: null,
        new: preset.profile,
      },
    };
  }

  async function applySelection(profileId) {
    if (profileId === REAL_PROFILE_ID) {
      await chrome.storage.local.remove([
        ADAPTIVE_PROFILE_STORAGE_KEY,
        MOCK_PROFILE_STORAGE_KEY,
      ]);
      await notifyActiveTabProfileChanged(profileId);
      showNotification('Using real extension profile', 'success');
      return;
    }

    const preset = getPresets().find((item) => item.id === profileId);
    if (!preset?.profile) {
      throw new Error('Mock profile not found');
    }

    await chrome.storage.local.set({
      [ADAPTIVE_PROFILE_STORAGE_KEY]: buildStoredMockProfile(preset),
      [MOCK_PROFILE_STORAGE_KEY]: preset.id,
    });

    await notifyActiveTabProfileChanged(profileId);
    showNotification(`${preset.label} applied`, 'success');
  }

  async function render() {
    const root = document.getElementById('mockProfileButtons');
    const status = document.getElementById('mockProfileStatus');
    const hint = document.getElementById('mockProfileHint');
    if (!root || !status || !hint) return;

    const { loggedIn } = await getAuthState();
    const activeId = loggedIn ? await getSelectedProfileId() : REAL_PROFILE_ID;
    const options = [
      {
        id: REAL_PROFILE_ID,
        label: 'Real profile',
        description: "Use the extension's current personalized flow",
      },
      ...getPresets(),
    ];

    root.innerHTML = '';

    options.forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'mock-profile-btn';
      if (option.id === activeId) {
        button.classList.add('active');
      }
      button.disabled = !loggedIn;

      const label = document.createElement('span');
      label.className = 'mock-profile-btn-label';
      label.textContent = option.label;

      const copy = document.createElement('span');
      copy.className = 'mock-profile-btn-copy';
      copy.textContent = option.description;

      button.appendChild(label);
      button.appendChild(copy);

      button.addEventListener('click', async () => {
        if (!loggedIn) return;
        try {
          await applySelection(option.id);
          await render();
        } catch (error) {
          console.error('Mock profile apply failed:', error);
          showNotification(error?.message || 'Failed to apply mock profile', 'error');
        }
      });

      root.appendChild(button);
    });

    const activeOption = options.find((option) => option.id === activeId) || options[0];
    status.textContent = loggedIn ? activeOption.label : 'Login required';
    hint.textContent = loggedIn
      ? activeId === REAL_PROFILE_ID
        ? "Using the extension's current final profile. Choose a mock profile to temporarily override the demo UI."
        : 'Mock adaptive override stored. The active demo tab should refresh immediately.'
      : 'Log in to apply a temporary adaptive override to the active tab.';
  }

  document.addEventListener('DOMContentLoaded', () => {
    render().catch((error) => {
      console.error('Mock profile render failed:', error);
    });
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    if (
      changes.authToken ||
      changes.userId ||
      changes[MOCK_PROFILE_STORAGE_KEY] ||
      changes[ADAPTIVE_PROFILE_STORAGE_KEY]
    ) {
      render().catch((error) => {
        console.error('Mock profile refresh failed:', error);
      });
    }
  });
})();
