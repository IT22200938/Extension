// Popup Script - Manages the extension UI and user interactions

console.log('🚀 popup.js loaded');

// Initialize API client
let apiClient;
try {
  apiClient = new APIClient();
  console.log('✓ APIClient initialized:', apiClient.baseURL);
} catch (error) {
  console.error('✗ Failed to initialize APIClient:', error);
}

const REGISTRATION_FLOW_STATE_KEY = 'registrationFlowState';
const REGISTRATION_FLOW_STAGES = {
  CONSENT_PENDING: 'consent_pending',
  ONBOARDING_PENDING: 'onboarding_pending',
};
const PERSONALIZED_PROFILE_KEY = 'AURA_EXT_ML_PERSONALIZED_PROFILE';
const ADAPTIVE_PROFILE_KEY = 'AURA_EXT_ADAPTIVE_OPTIMIZED_PROFILE';
const DEMO_PROFILE_META_KEY = 'AURA_EXT_DEMO_PRESET_META';
const DEMO_PROFILE_BACKUP_KEY = 'AURA_EXT_DEMO_PRESET_BACKUP';

const DEMO_PROFILE_PRESETS = [
  {
    id: 'u_normal',
    label: 'Normal User',
    origin: 'user',
    confidence: 0.82,
    version: 1,
    profile: {
      font_size: 12,
      line_height: 1.15,
      contrast_mode: 'normal',
      primary_color: '#2563eb',
      primary_color_content: '#ffffff',
      secondary_color: '#0ea5e9',
      secondary_color_content: '#ffffff',
      accent_color: '#f97316',
      accent_color_content: '#111111',
      theme: 'light',
      element_spacing_x: 10,
      element_spacing_y: 10,
      element_padding_x: 12,
      element_padding_y: 10,
      reduced_motion: false,
      target_size: 14,
      tooltip_assist: false,
      layout_simplification: false,
    },
  },
  {
    id: 'u_vision',
    label: 'Visual Impaired',
    origin: 'user',
    confidence: 0.9,
    version: 1,
    profile: {
      font_size: 20,
      line_height: 1.7,
      contrast_mode: 'high',
      primary_color: '#000000',
      primary_color_content: '#ffffff',
      secondary_color: '#1f2937',
      secondary_color_content: '#ffffff',
      accent_color: '#facc15',
      accent_color_content: '#111111',
      theme: 'light',
      element_spacing_x: 14,
      element_spacing_y: 14,
      element_padding_x: 16,
      element_padding_y: 14,
      reduced_motion: true,
      target_size: 32,
      tooltip_assist: true,
      layout_simplification: false,
    },
  },
  {
    id: 'u_motor',
    label: 'Motor Support',
    origin: 'user',
    confidence: 0.88,
    version: 1,
    profile: {
      font_size: 18,
      line_height: 1.6,
      contrast_mode: 'high',
      primary_color: '#2563eb',
      primary_color_content: '#ffffff',
      secondary_color: '#0ea5e9',
      secondary_color_content: '#ffffff',
      accent_color: '#22c55e',
      accent_color_content: '#052e16',
      theme: 'dark',
      element_spacing_x: 18,
      element_spacing_y: 18,
      element_padding_x: 20,
      element_padding_y: 18,
      reduced_motion: true,
      target_size: 44,
      tooltip_assist: false,
      layout_simplification: false,
    },
  },
  {
    id: 'u_lowlit',
    label: 'Low Literacy',
    origin: 'user',
    confidence: 0.86,
    version: 1,
    profile: {
      font_size: 18,
      line_height: 1.6,
      contrast_mode: 'normal',
      primary_color: '#2563eb',
      primary_color_content: '#ffffff',
      secondary_color: '#64748b',
      secondary_color_content: '#ffffff',
      accent_color: '#f97316',
      accent_color_content: '#111111',
      theme: 'light',
      element_spacing_x: 16,
      element_spacing_y: 16,
      element_padding_x: 18,
      element_padding_y: 16,
      reduced_motion: true,
      target_size: 36,
      tooltip_assist: true,
      layout_simplification: true,
    },
  },
];

function nowIso() {
  return new Date().toISOString();
}

function getDemoPresetById(presetId) {
  return DEMO_PROFILE_PRESETS.find((preset) => preset.id === presetId) || null;
}

function buildStoredProfileFromPreset(activeUserId, preset) {
  const profile = { ...preset.profile };

  return {
    user_id: activeUserId || preset.id,
    metadata: {
      origin: preset.origin,
      created_at: nowIso(),
      confidence_overall: preset.confidence,
      version: preset.version,
      demo_preset_id: preset.id,
      demo_preset_label: preset.label,
    },
    profile,
    profile_changes: {
      changed: Object.keys(profile),
      old: null,
      new: { ...profile },
    },
  };
}

function formatProfileSnapshot(profileValue, emptyMessage) {
  if (!profileValue) return emptyMessage;
  return JSON.stringify(profileValue, null, 2);
}

function setDemoControlsBusy(isBusy) {
  document.querySelectorAll('[data-demo-profile-btn]').forEach((button) => {
    button.disabled = isBusy;
  });
  const resetBtn = document.getElementById('resetDemoProfileBtn');
  const refreshBtn = document.getElementById('refreshDemoProfileBtn');
  if (resetBtn) resetBtn.disabled = isBusy || resetBtn.dataset.enabled !== 'true';
  if (refreshBtn) refreshBtn.disabled = isBusy;
}

function renderDemoProfileButtons() {
  const root = document.getElementById('demoProfileButtons');
  if (!root) return;

  root.innerHTML = '';

  DEMO_PROFILE_PRESETS.forEach((preset) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-demo-preset';
    button.dataset.demoProfileBtn = preset.id;
    button.textContent = preset.label;
    button.addEventListener('click', () => {
      applyDemoPreset(preset.id);
    });
    root.appendChild(button);
  });
}

async function ensureDemoProfileBackup() {
  const result = await chrome.storage.local.get([DEMO_PROFILE_BACKUP_KEY, ADAPTIVE_PROFILE_KEY]);
  if (result[DEMO_PROFILE_BACKUP_KEY]) return result[DEMO_PROFILE_BACKUP_KEY];

  const adaptiveProfile = result[ADAPTIVE_PROFILE_KEY] ?? null;
  const backup = {
    hasAdaptiveProfile: !!adaptiveProfile,
    profile: adaptiveProfile,
    capturedAt: nowIso(),
  };

  await chrome.storage.local.set({ [DEMO_PROFILE_BACKUP_KEY]: backup });
  return backup;
}

async function applyDemoPreset(presetId) {
  const preset = getDemoPresetById(presetId);
  if (!preset) {
    showNotification('Unknown demo preset.', 'error');
    return;
  }

  setDemoControlsBusy(true);

  try {
    const { userId } = await chrome.storage.local.get(['userId']);
    if (!userId) {
      throw new Error('Login required before applying demo profiles.');
    }

    await ensureDemoProfileBackup();

    const response = await chrome.runtime.sendMessage({
      type: 'SET_ADAPTIVE_PROFILE_REQUEST',
      source: 'popup-demo-preset',
      profile: buildStoredProfileFromPreset(userId, preset),
    });

    if (!response?.success) {
      throw new Error(response?.error || 'Could not store demo profile override.');
    }

    await chrome.storage.local.set({
      [DEMO_PROFILE_META_KEY]: {
        presetId: preset.id,
        label: preset.label,
        appliedAt: nowIso(),
      },
    });

    await refreshDemoProfilePanel();
    showNotification(`${preset.label} override applied.`, 'success');
  } catch (error) {
    console.error('Failed to apply demo preset:', error);
    showNotification(error.message || 'Failed to apply demo preset.', 'error');
  } finally {
    setDemoControlsBusy(false);
  }
}

async function resetDemoProfileOverride() {
  setDemoControlsBusy(true);

  try {
    const result = await chrome.storage.local.get([DEMO_PROFILE_META_KEY, DEMO_PROFILE_BACKUP_KEY]);
    const meta = result[DEMO_PROFILE_META_KEY] || null;
    const backup = result[DEMO_PROFILE_BACKUP_KEY] || null;

    if (!meta && !backup) {
      await refreshDemoProfilePanel();
      showNotification('Real extension profile is already active.', 'info');
      return;
    }

    let response;
    if (backup?.hasAdaptiveProfile && backup.profile) {
      response = await chrome.runtime.sendMessage({
        type: 'SET_ADAPTIVE_PROFILE_REQUEST',
        source: 'popup-demo-restore',
        profile: backup.profile,
      });
    } else {
      response = await chrome.runtime.sendMessage({
        type: 'CLEAR_ADAPTIVE_PROFILE_REQUEST',
        source: 'popup-demo-restore',
      });
    }

    if (!response?.success) {
      throw new Error(response?.error || 'Could not restore the real extension profile.');
    }

    await chrome.storage.local.remove([DEMO_PROFILE_META_KEY, DEMO_PROFILE_BACKUP_KEY]);
    await refreshDemoProfilePanel();
    showNotification('Real extension profile restored.', 'success');
  } catch (error) {
    console.error('Failed to reset demo profile override:', error);
    showNotification(error.message || 'Failed to restore real extension profile.', 'error');
  } finally {
    setDemoControlsBusy(false);
  }
}

async function refreshDemoProfilePanel() {
  const realProfileNode = document.getElementById('realProfileSnapshot');
  const finalProfileNode = document.getElementById('finalProfileSnapshot');
  const finalSourceNode = document.getElementById('finalProfileSource');
  const realSourceNode = document.getElementById('realProfileSource');
  const statusNode = document.getElementById('demoProfileStatus');
  const badgeNode = document.getElementById('demoProfileModeBadge');
  const resetBtn = document.getElementById('resetDemoProfileBtn');

  if (!realProfileNode || !finalProfileNode || !finalSourceNode || !realSourceNode || !statusNode || !badgeNode || !resetBtn) {
    return;
  }

  const result = await chrome.storage.local.get([
    PERSONALIZED_PROFILE_KEY,
    ADAPTIVE_PROFILE_KEY,
    DEMO_PROFILE_META_KEY,
  ]);

  const personalized = result[PERSONALIZED_PROFILE_KEY] ?? null;
  const adaptive = result[ADAPTIVE_PROFILE_KEY] ?? null;
  const demoMeta = result[DEMO_PROFILE_META_KEY] ?? null;
  const finalProfile = adaptive || personalized || null;

  document.querySelectorAll('[data-demo-profile-btn]').forEach((button) => {
    button.classList.toggle('active', button.dataset.demoProfileBtn === demoMeta?.presetId);
  });

  if (demoMeta?.label && adaptive) {
    badgeNode.textContent = `Demo override: ${demoMeta.label}`;
    statusNode.textContent = `${demoMeta.label} is overriding the real extension profile. Pages using the npm package will read this as the final effective profile until you restore the real path.`;
    resetBtn.dataset.enabled = 'true';
  } else if (adaptive) {
    badgeNode.textContent = 'Adaptive profile';
    statusNode.textContent = 'A real adaptive profile is active in extension storage. The demo reset action stays disabled unless this popup applied a demo override.';
    resetBtn.dataset.enabled = 'false';
  } else {
    badgeNode.textContent = 'Real profile';
    statusNode.textContent = 'Adaptive override is not active. The app will use the stored real extension profile.';
    resetBtn.dataset.enabled = demoMeta ? 'true' : 'false';
  }

  resetBtn.disabled = resetBtn.dataset.enabled !== 'true';
  realSourceNode.textContent = personalized?.metadata?.origin || 'not available';
  finalSourceNode.textContent = adaptive
    ? (demoMeta?.label ? 'adaptive demo' : 'adaptive')
    : (personalized?.metadata?.origin || 'not available');

  realProfileNode.textContent = formatProfileSnapshot(
    personalized,
    'No personalized profile is stored yet in the real extension.'
  );
  finalProfileNode.textContent = formatProfileSnapshot(
    finalProfile,
    'No final profile is available yet. Complete onboarding or fetch the personalized profile first.'
  );
}

async function getRegistrationFlowState() {
  const result = await chrome.storage.local.get([REGISTRATION_FLOW_STATE_KEY]);
  return result?.[REGISTRATION_FLOW_STATE_KEY] || null;
}

async function setRegistrationFlowState(stage) {
  if (!stage) return;
  await chrome.storage.local.set({
    [REGISTRATION_FLOW_STATE_KEY]: {
      stage,
      updatedAt: Date.now(),
    },
  });
}

async function clearRegistrationFlowState() {
  await chrome.storage.local.remove([REGISTRATION_FLOW_STATE_KEY]);
}

document.addEventListener('DOMContentLoaded', async function() {
  console.log('📄 DOMContentLoaded event fired');
  
  // Initialize event listeners FIRST before any async operations
  initializeEventListeners();
  console.log('✅ Event listeners initialized early');
  
  // Check if user is logged in
  const token = await apiClient.getToken();
  console.log('🔑 Token status:', token ? 'Found' : 'Not found');
  
  if (!token) {
    await clearRegistrationFlowState();
    showAuthSection();
    return;
  }
  
  // Verify token is valid
  try {
    const userData = await apiClient.getCurrentUser();
    
    // CRITICAL: Sync user profile and settings from server to local storage
    // This ensures settings and userId are always in sync, even after a browser restart
    console.log('📥 Syncing user profile and settings from server...');
    await chrome.storage.local.set({
      userId: userData.user._id,
      consentGiven: userData.user.consentGiven || false,
      trackingEnabled: userData.user.trackingEnabled || false,
      userProfile: {
        userId: userData.user._id,
        email: userData.user.email ?? null,
        name: userData.user.name ?? null,
      }
    });
    console.log('✅ Settings synced:', {
      userId: userData.user._id,
      consentGiven: userData.user.consentGiven,
      trackingEnabled: userData.user.trackingEnabled
    });
    
    // Initialize aggregator if tracking is enabled
    if (userData.user.trackingEnabled) {
      chrome.runtime.sendMessage({ type: 'INIT_TRACKING' }).catch(err => {
        console.warn('⚠️ Could not initialize tracking:', err.message);
      });
    }
    
    // Registration flow gating (consent + onboarding) is only enforced for users
    // currently in registration flow. Login flow always lands on main content.
    let registrationFlowState = await getRegistrationFlowState();

    if (registrationFlowState?.stage === REGISTRATION_FLOW_STAGES.CONSENT_PENDING) {
      if (!userData.user.consentGiven) {
        showConsentSection();
        return;
      }

      await setRegistrationFlowState(REGISTRATION_FLOW_STAGES.ONBOARDING_PENDING);
      registrationFlowState = { stage: REGISTRATION_FLOW_STAGES.ONBOARDING_PENDING };
    }

    if (registrationFlowState?.stage === REGISTRATION_FLOW_STAGES.ONBOARDING_PENDING) {
      let onboardingStatus = { completed: false };
      try {
        onboardingStatus = await apiClient.getOnboardingStatus() || { completed: false };
      } catch (err) {
        console.warn('Could not get onboarding status:', err.message);
      }

      if (!onboardingStatus.completed) {
        showOnboardingPrompt(userData.user);
        return;
      }

      await chrome.storage.local.set({ onboardingCompleted: true });
      await clearRegistrationFlowState();
    }

    showMainContent();
    displayUserInfo(userData.user);
    await loadData();
  } catch (error) {
    console.error('Authentication error:', error);
    await apiClient.clearToken();
    await clearRegistrationFlowState();
    showAuthSection();
  }
});

// Show auth section
function showAuthSection() {
  console.log('📝 Showing auth section');
  hideOnboardingPrompt();
  document.getElementById('authSection').style.display = 'block';
  document.getElementById('consentSection').style.display = 'none';
  document.getElementById('mainContent').style.display = 'none';
}

function hideOnboardingPrompt() {
  const onboardingPrompt = document.getElementById('onboardingPrompt');
  if (onboardingPrompt) {
    onboardingPrompt.style.display = 'none';
  }
}

// Show onboarding prompt
function showOnboardingPrompt(user) {
  console.log('🎮 Showing onboarding prompt for user:', user?.name);
  
  try {
    // Hide other sections
    const authSection = document.getElementById('authSection');
    const consentSection = document.getElementById('consentSection');
    const mainContent = document.getElementById('mainContent');
    
    if (authSection) authSection.style.display = 'none';
    if (consentSection) consentSection.style.display = 'none';
    if (mainContent) mainContent.style.display = 'none';
    
    // Create or find onboarding prompt
    const container = document.querySelector('.container');
    if (!container) {
      console.error('❌ Container not found!');
      return;
    }
    
    let onboardingPrompt = document.getElementById('onboardingPrompt');
    
    if (!onboardingPrompt) {
      onboardingPrompt = document.createElement('div');
      onboardingPrompt.id = 'onboardingPrompt';
      onboardingPrompt.className = 'section';
      
      // Try to insert before footer, or just append
      const footer = container.querySelector('footer');
      if (footer) {
        container.insertBefore(onboardingPrompt, footer);
      } else {
        container.appendChild(onboardingPrompt);
      }
    }
    
    const userName = user?.name || 'User';
    
    onboardingPrompt.style.display = 'block';
    onboardingPrompt.innerHTML = `
      <div class="onboarding-prompt">
        <div class="onboarding-hero">
          <div class="welcome-badge">
            <span class="welcome-emoji">&#128161;</span>
          </div>
          <div class="onboarding-hero-copy">
            <h2>Welcome ${userName}!</h2>
            <p class="onboarding-description">
              Complete four quick assessments to generate your personalized AURA profile.
            </p>
          </div>
        </div>

        <div class="onboarding-meta">
          <span class="meta-chip"><strong>4</strong> Challenges</span>
          <span class="meta-chip"><strong>~5 min</strong> Duration</span>
        </div>

        <div class="challenge-list">
          <div class="challenge-item">
            <div class="challenge-index">01</div>
            <div class="challenge-body">
              <div class="challenge-title-row">
                <h3>Calibrate the Light Colors</h3>
              </div>
              <p>Align the prism so signals are not lost.</p>
            </div>
          </div>

          <div class="challenge-item">
            <div class="challenge-index">02</div>
            <div class="challenge-body">
              <div class="challenge-title-row">
                <h3>Focus the Beam</h3>
              </div>
              <p>Sharpen the light to reach distant signals.</p>
            </div>
          </div>

          <div class="challenge-item">
            <div class="challenge-index">03</div>
            <div class="challenge-body">
              <div class="challenge-title-row">
                <h3>Clear the Rising Fog</h3>
              </div>
              <p>Remove corrupted data blocking the path.</p>
            </div>
          </div>

          <div class="challenge-item">
            <div class="challenge-index">04</div>
            <div class="challenge-body">
              <div class="challenge-title-row">
                <h3>Restore the Control Panel</h3>
              </div>
              <p>Make correct operational decisions.</p>
            </div>
          </div>
        </div>

        <div class="onboarding-actions">
          <button id="startOnboardingBtn" class="btn btn-primary full-width btn-glow" aria-label="Start onboarding game - opens in new tab">
            <span class="btn-text">Start Lighthouse Mission</span>
            <span class="btn-arrow" aria-hidden="true">&rarr;</span>
          </button>
          <p class="onboarding-footnote">Opens in a new tab. You can return here anytime.</p>
        </div>
      </div>
    `;
    
    // Add event listener
    const startBtn = document.getElementById('startOnboardingBtn');
    if (startBtn) {
      startBtn.addEventListener('click', startOnboardingGame);
    }
    
    console.log('✅ Onboarding prompt displayed');
    
  } catch (error) {
    console.error('❌ Error showing onboarding prompt:', error);
  }
}

// Start onboarding game in new tab
async function startOnboardingGame() {
  const startBtn = document.getElementById('startOnboardingBtn');
  
  try {
    // Disable button during processing
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.textContent = 'Opening...';
    }
    
    const token = await apiClient.getToken();
    
    if (!token) {
      throw new Error('No authentication token');
    }
    
    // Try to get user data, but proceed even if it fails
    let userId = null;
    try {
      const userData = await apiClient.getCurrentUser();
      userId = userData?.user?._id;
    } catch (err) {
      console.warn('Could not get user data:', err.message);
    }
    
    // Build game URL with parameters - go directly to /play route (skip module selection)
    let gameUrl = `${API_CONFIG.ONBOARDING_GAME_URL}/play?token=${token}&mode=aura`;
    if (userId) {
      gameUrl += `&userId=${userId}`;
    }
    
    console.log('🎮 Opening onboarding game:', gameUrl);
    
    // Open in new tab
    chrome.tabs.create({ url: gameUrl }, (tab) => {
      if (chrome.runtime.lastError) {
        console.error('Tab creation error:', chrome.runtime.lastError);
        showNotification('Failed to open game tab', 'error');
        return;
      }
      
      console.log('✅ Onboarding game opened in tab:', tab?.id);
      showNotification('Onboarding game opened in new tab!', 'success');
      
      // Store tab ID to listen for completion
      if (tab?.id) {
        chrome.storage.local.set({ onboardingTabId: tab.id });
      }
    });
    
    // Close popup after a short delay
    setTimeout(() => window.close(), 500);
    
  } catch (error) {
    console.error('Failed to start onboarding:', error);
    showNotification('Failed to open onboarding game: ' + error.message, 'error');
    
    // Re-enable button
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.textContent = 'Start Onboarding Game';
    }
  }
}

// Show consent section
function showConsentSection() {
  hideOnboardingPrompt();
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('consentSection').style.display = 'block';
  document.getElementById('mainContent').style.display = 'none';
}

// Show main content
function showMainContent() {
  hideOnboardingPrompt();
  document.getElementById('authSection').style.display = 'none';
  document.getElementById('consentSection').style.display = 'none';
  document.getElementById('mainContent').style.display = 'block';
}

// Display user info
function displayUserInfo(user) {
  document.getElementById('userName').textContent = user.name;
  document.getElementById('userEmail').textContent = user.email;
}

// Initialize all event listeners
function initializeEventListeners() {
  console.log('🎧 Initializing event listeners...');
  
  // Auth tabs
  const loginTab = document.getElementById('loginTab');
  const registerTab = document.getElementById('registerTab');
  
  console.log('Login tab element:', loginTab);
  console.log('Register tab element:', registerTab);
  
  loginTab?.addEventListener('click', () => {
    console.log('🖱️ Login tab clicked');
    document.getElementById('loginTab').classList.add('active');
    document.getElementById('registerTab').classList.remove('active');
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
  });
  
  registerTab?.addEventListener('click', () => {
    console.log('🖱️ Register tab clicked');
    document.getElementById('registerTab').classList.add('active');
    document.getElementById('loginTab').classList.remove('active');
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('loginForm').style.display = 'none';
  });
  
  console.log('✓ Auth tab listeners attached');
  
  // Debug: Test if elements are actually in DOM
  setTimeout(() => {
    const authSection = document.getElementById('authSection');
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    
    console.log('🔍 DOM Check (after timeout):');
    console.log('  authSection display:', authSection?.style.display);
    console.log('  loginTab:', loginTab ? 'EXISTS' : 'NULL');
    console.log('  registerTab:', registerTab ? 'EXISTS' : 'NULL');
    
    if (registerTab) {
      console.log('  registerTab is clickable:', registerTab.disabled ? 'NO (disabled)' : 'YES');
      console.log('  registerTab parent visible:', registerTab.parentElement ? 'YES' : 'NO');
    }
  }, 100);
  
  // Auth buttons
  document.getElementById('loginBtn')?.addEventListener('click', handleLogin);
  document.getElementById('registerBtn')?.addEventListener('click', handleRegister);
  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
  
  // Consent button
  document.getElementById('acceptConsent')?.addEventListener('click', handleAcceptConsent);

  renderDemoProfileButtons();
  document.getElementById('resetDemoProfileBtn')?.addEventListener('click', resetDemoProfileOverride);
  document.getElementById('refreshDemoProfileBtn')?.addEventListener('click', () => {
    refreshDemoProfilePanel().catch((error) => {
      console.error('Failed to refresh demo profile panel:', error);
      showNotification('Could not refresh profile snapshot.', 'error');
    });
  });
}

// Manual test function (accessible from console)
window.testRegisterTab = function() {
  console.log('🧪 Manual test: Clicking register tab...');
  const registerTab = document.getElementById('registerTab');
  const registerForm = document.getElementById('registerForm');
  const loginForm = document.getElementById('loginForm');
  
  console.log('registerTab:', registerTab);
  console.log('registerForm:', registerForm);
  console.log('loginForm:', loginForm);
  
  if (registerTab) {
    registerTab.click();
    console.log('✓ Click triggered');
  } else {
    console.log('✗ Register tab not found');
  }
};

console.log('💡 Tip: Run window.testRegisterTab() in console to manually test');

// Handle login
async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorDiv = document.getElementById('loginError');
  
  if (!email || !password) {
    errorDiv.textContent = 'Please fill in all fields';
    errorDiv.style.display = 'block';
    return;
  }
  
  try {
    document.getElementById('loginBtn').disabled = true;
    document.getElementById('loginBtn').textContent = 'Logging in...';
    errorDiv.style.display = 'none';
    
    const data = await apiClient.login(email, password);
    
    // CRITICAL: Sync consent and tracking settings from server to local storage
    // Include userId so aggregator and background have it immediately (avoids race with api-client setToken)
    console.log('📥 Syncing user settings from server...');
    const activeUserId = data.user._id || data.user.id;
    await chrome.storage.local.set({
      userId: activeUserId,
      consentGiven: data.user.consentGiven || false,
      trackingEnabled: data.user.trackingEnabled || false,
      userProfile: {
        userId: activeUserId,
        email: data.user.email ?? null,
        name: data.user.name ?? null,
      },
    });
    console.log('✅ Settings synced:', {
      consentGiven: data.user.consentGiven,
      trackingEnabled: data.user.trackingEnabled
    });
    
    // Initialize aggregator if tracking is enabled
    if (data.user.trackingEnabled) {
      chrome.runtime.sendMessage({ type: 'INIT_TRACKING' }).catch(err => {
        console.warn('⚠️ Could not initialize tracking:', err.message);
      });
    }
    
    await clearRegistrationFlowState();
    showMainContent();
    displayUserInfo(data.user);
    await loadData();
    
    // Notify other components (tabs with sensecheck, dashboard, etc.) - broadcast token and userId
    chrome.runtime.sendMessage({
      type: 'BROADCAST_USER_LOGIN',
      token: data.token,
      userId: activeUserId,
      user: {
        email: data.user.email ?? null,
        name: data.user.name ?? null,
      },
      source: 'login',
    }).catch(() => {});

    // Fetch ML personalized profile on login (and when logging in again after logout)
    chrome.runtime.sendMessage({ type: 'FETCH_ML_PERSONALIZED_PROFILE' }).catch(() => {});
    
    showNotification('Login successful!', 'success');
    
  } catch (error) {
    console.error('Login error:', error);
    errorDiv.textContent = error.message || 'Login failed. Please check your credentials.';
    errorDiv.style.display = 'block';
  } finally {
    document.getElementById('loginBtn').disabled = false;
    document.getElementById('loginBtn').textContent = 'Login';
  }
}

// Handle register
async function handleRegister() {
  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const age = parseInt(document.getElementById('registerAge').value);
  const gender = document.getElementById('registerGender').value;
  const errorDiv = document.getElementById('registerError');
  
  if (!name || !email || !password || !age || !gender) {
    errorDiv.textContent = 'Please fill in all required fields';
    errorDiv.style.display = 'block';
    return;
  }
  
  if (password.length < 6) {
    errorDiv.textContent = 'Password must be at least 6 characters';
    errorDiv.style.display = 'block';
    return;
  }
  
  if (age < 18 || age > 120) {
    errorDiv.textContent = 'Please enter a valid age (18-120)';
    errorDiv.style.display = 'block';
    return;
  }
  
  try {
    document.getElementById('registerBtn').disabled = true;
    document.getElementById('registerBtn').textContent = 'Creating account...';
    errorDiv.style.display = 'none';
    
    const data = await apiClient.register(email, password, name, age, gender);
    
    // Sync userProfile and userId to storage so ping-pong and aggregator have them immediately
    if (data.user) {
      await chrome.storage.local.set({
        userId: data.user._id,
        userProfile: {
          userId: data.user._id,
          email: data.user.email ?? null,
          name: data.user.name ?? null,
        },
      });
    }
    
    // Do NOT broadcast at registration – broadcast happens when onboarding completes
    // (ONBOARDING_COMPLETE from sensecheck), so pages get token only when user is fully set up
    // Do NOT fetch ML profile from daily GET API here – it has no data for new users.
    // Initial profile comes from ONBOARDING_COMPLETE → impairment POST API.
    
    await setRegistrationFlowState(REGISTRATION_FLOW_STAGES.CONSENT_PENDING);
    showConsentSection();
    showNotification('Account created successfully!', 'success');
    
  } catch (error) {
    console.error('Registration error:', error);
    errorDiv.textContent = error.message || 'Registration failed. Please try again.';
    errorDiv.style.display = 'block';
  } finally {
    document.getElementById('registerBtn').disabled = false;
    document.getElementById('registerBtn').textContent = 'Create Account';
  }
}

// Handle logout
async function handleLogout() {
  if (!confirm('Are you sure you want to logout?')) {
    return;
  }
  
  try {
    const { userId } = await chrome.storage.local.get(['userId']);
    // 1. Clear token + userId (triggers storage.onChanged → background cleanup)
    await apiClient.logout();
    
    // 2. Explicitly broadcast logout so background clears auth + ML profiles (belt-and-suspenders)
    await chrome.runtime.sendMessage({ type: 'BROADCAST_USER_LOGOUT', userId: userId || null }).catch(() => {});
    
    // 3. Clear remaining local storage (consent, config, etc.)
    await clearRegistrationFlowState();
    await chrome.storage.local.clear();
    
    showAuthSection();
    showNotification('Logged out successfully', 'success');
    
  } catch (error) {
    console.error('Logout error:', error);
    showNotification('Logout failed', 'error');
  }
}

// Handle consent acceptance - shows onboarding prompt
async function handleAcceptConsent() {
  const acceptBtn = document.getElementById('acceptConsent');
  
  // Disable button to prevent double clicks
  if (acceptBtn) {
    acceptBtn.disabled = true;
    acceptBtn.textContent = 'Please wait...';
  }
  
  try {
    // STEP 1: Update server first (BLOCKING - must succeed)
    console.log('📤 Updating server consent settings...');
    try {
      await apiClient.updateSettings(true, true);
      console.log('✅ Server settings updated successfully');
    } catch (err) {
      console.error('❌ Failed to update server settings:', err);
      showNotification('Failed to save consent. Please try again.', 'error');
      if (acceptBtn) {
        acceptBtn.disabled = false;
        acceptBtn.textContent = 'I Understand, Continue';
      }
      return; // Stop if server update fails
    }
    
    // STEP 2: Set in local storage
    await chrome.storage.local.set({
      trackingEnabled: true,
      consentGiven: true
    });
    await setRegistrationFlowState(REGISTRATION_FLOW_STAGES.ONBOARDING_PENDING);
    console.log('✅ Tracking enabled in local storage');
    
    // STEP 3: Notify background script to initialize aggregator
    chrome.runtime.sendMessage({ 
      type: 'INIT_TRACKING'
    }).catch(err => {
      console.warn('⚠️ Could not notify background script:', err.message);
    });
    
    // Check onboarding status
    console.log('🔍 Checking onboarding status...');
    let onboardingStatus = { completed: false };
    let userData = null;
    
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 3000)
      );
      const [status, user] = await Promise.race([
        Promise.all([
          apiClient.getOnboardingStatus(),
          apiClient.getCurrentUser()
        ]),
        timeoutPromise
      ]);
      onboardingStatus = status || { completed: false };
      userData = user;
      console.log('📋 Onboarding status:', onboardingStatus);
    } catch (err) {
      console.warn('⚠️ Could not get status:', err.message);
      try {
        userData = await apiClient.getCurrentUser();
      } catch (userErr) {}
    }
    
    // If onboarding complete, show main content
    if (onboardingStatus?.completed) {
      console.log('✅ Onboarding complete, showing main content...');
      await clearRegistrationFlowState();
      showMainContent();
      if (userData?.user) {
        displayUserInfo(userData.user);
      }
      await loadData();
      showNotification('Tracking enabled!', 'success');
    } else {
      // Show onboarding prompt
      console.log('🎮 Showing onboarding prompt...');
      const userName = userData?.user?.name || 'User';
      showOnboardingPrompt({ name: userName, _id: userData?.user?._id });
    }
    
  } catch (error) {
    console.error('❌ Consent handling failed:', error);
    
    // Even on error, show onboarding prompt
    try {
      showOnboardingPrompt({ name: 'User' });
    } catch (fallbackErr) {
      // Last resort: re-enable button
      if (acceptBtn) {
        acceptBtn.disabled = false;
        acceptBtn.textContent = 'I Understand, Continue';
      }
      showNotification('Error: ' + error.message, 'error');
    }
  }
}




// Impairment profile / ML motor-score: created only when motor game completes during onboarding.
// Do NOT call feature-vector or motor-score from popup on login – that triggers unnecessary API calls.

// Load all data
async function loadData() {
  // Nothing to load - tracking is always active
  console.log('✅ Tracking active');
  await refreshDemoProfilePanel();
}






// Show notification (simple visual feedback)
function showNotification(message, type = 'info') {
  // Create a simple notification element
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    padding: 12px 20px;
    background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
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
  }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);
