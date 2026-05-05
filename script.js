/**
 * AuthVault — script.js
 * Modular authentication logic:
 *   - Tab & panel switching
 *   - Real-time form validation
 *   - Password strength checking
 *   - LocalStorage session management
 *   - Toast notifications
 *   - Dark/Light theme toggle
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS & HELPERS
   ═══════════════════════════════════════════════════════════════ */

/** Regex patterns used across validations */
const REGEX = {
  email:    /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  username: /^[a-zA-Z0-9_]{3,20}$/,
  upper:    /[A-Z]/,
  lower:    /[a-z]/,
  number:   /[0-9]/,
  special:  /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/,
};

/** LocalStorage keys */
const LS = {
  users:   'authvault_users',
  session: 'authvault_session',
};

/**
 * Retrieve a value from localStorage (parsed from JSON).
 * @param {string} key
 * @returns {*}
 */
function lsGet(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

/**
 * Store a value in localStorage (stringified as JSON).
 * @param {string} key
 * @param {*} value
 */
function lsSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/** Get all registered users array */
function getUsers() {
  return lsGet(LS.users) || [];
}

/** Save the users array */
function saveUsers(users) {
  lsSet(LS.users, users);
}

/** Get active session object */
function getSession() {
  return lsGet(LS.session);
}

/** Save session object */
function saveSession(sessionData) {
  lsSet(LS.session, sessionData);
}

/** Clear the active session */
function clearSession() {
  localStorage.removeItem(LS.session);
}

/* ═══════════════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
   ═══════════════════════════════════════════════════════════════ */

const TOAST_ICONS = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
};

/**
 * Show a toast notification.
 * @param {string} message - Message to display
 * @param {'success'|'error'|'info'} type - Toast type
 * @param {number} duration - Auto-dismiss duration in ms
 */
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${TOAST_ICONS[type]}</span><span>${message}</span>`;
  container.appendChild(toast);

  // Auto-dismiss
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

/* ═══════════════════════════════════════════════════════════════
   THEME TOGGLE
   ═══════════════════════════════════════════════════════════════ */

/** Toggle between dark and light theme */
function initTheme() {
  const saved = localStorage.getItem('authvault_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

document.getElementById('themeToggle').addEventListener('click', function () {
  const html    = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('authvault_theme', next);
});

/* ═══════════════════════════════════════════════════════════════
   TAB / PANEL SWITCHING
   ═══════════════════════════════════════════════════════════════ */

let currentTab = 'login'; // 'login' | 'register' | 'forgot' | 'dashboard'

/**
 * Switch visible panel.
 * @param {'login'|'register'|'forgot'|'dashboard'} tab
 */
function switchTab(tab) {
  currentTab = tab;

  // Hide all panels
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.add('hidden'));

  // Show target panel
  const panel = document.getElementById(`panel${capitalize(tab)}`);
  if (panel) {
    panel.classList.remove('hidden');
    // Re-trigger animation
    panel.style.animation = 'none';
    panel.offsetHeight; // reflow
    panel.style.animation = '';
  }

  // Update tab buttons (only for login/register)
  const tabLogin    = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  const indicator   = document.querySelector('.tab-indicator');
  const tabSwitcher = document.querySelector('.tab-switcher');

  if (tab === 'login' || tab === 'register') {
    tabSwitcher.style.display = '';
    tabLogin.classList.toggle('active',    tab === 'login');
    tabRegister.classList.toggle('active', tab === 'register');
    tabLogin.setAttribute('aria-selected',    String(tab === 'login'));
    tabRegister.setAttribute('aria-selected', String(tab === 'register'));
    indicator.classList.toggle('right', tab === 'register');
  } else {
    tabSwitcher.style.display = 'none';
  }

  // Clear forms on switch
  if (tab === 'login')    resetForm('loginForm');
  if (tab === 'register') resetForm('registerForm');
}

/** Capitalize first letter */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Clear a form and its validation states */
function resetForm(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.reset();
  form.querySelectorAll('.field-group').forEach(g => {
    g.classList.remove('error', 'success');
  });
  form.querySelectorAll('.field-msg').forEach(m => { m.textContent = ''; });
  // Reset strength meter
  if (formId === 'registerForm') resetStrengthMeter();
}

/* ═══════════════════════════════════════════════════════════════
   FIELD VALIDATION UTILITIES
   ═══════════════════════════════════════════════════════════════ */

/**
 * Set a field group's validation state.
 * @param {string} groupId - The field-group element id
 * @param {'error'|'success'|''} state
 * @param {string} message
 */
function setFieldState(groupId, state, message = '') {
  const group = document.getElementById(groupId);
  if (!group) return;
  group.classList.remove('error', 'success');
  if (state) group.classList.add(state);

  const msgEl = group.querySelector('.field-msg');
  if (msgEl) {
    msgEl.textContent = message;
  }
}

/** Validate email format */
function isValidEmail(email) {
  return REGEX.email.test(email.trim());
}

/** Validate that a string is non-empty */
function isNotEmpty(value) {
  return value.trim().length > 0;
}

/** Validate username format */
function isValidUsername(username) {
  return REGEX.username.test(username.trim());
}

/* ═══════════════════════════════════════════════════════════════
   LOGIN FORM VALIDATION
   ═══════════════════════════════════════════════════════════════ */

/**
 * Validate a single login field in real-time.
 * @param {'lgEmail'|'lgPassword'} fieldId
 * @returns {boolean}
 */
function validateLoginField(fieldId) {
  const value = document.getElementById(fieldId)?.value || '';

  if (fieldId === 'lgEmail') {
    if (!isNotEmpty(value)) {
      setFieldState('lg-email-group', 'error', 'Email is required');
      return false;
    }
    if (!isValidEmail(value)) {
      setFieldState('lg-email-group', 'error', 'Enter a valid email address');
      return false;
    }
    setFieldState('lg-email-group', 'success', '');
    return true;
  }

  if (fieldId === 'lgPassword') {
    if (!isNotEmpty(value)) {
      setFieldState('lg-password-group', 'error', 'Password is required');
      return false;
    }
    setFieldState('lg-password-group', 'success', '');
    return true;
  }

  return true;
}

/** Validate all login fields, return true if all pass */
function validateLoginForm() {
  const emailOk    = validateLoginField('lgEmail');
  const passwordOk = validateLoginField('lgPassword');
  return emailOk && passwordOk;
}

/* ═══════════════════════════════════════════════════════════════
   REGISTER FORM VALIDATION
   ═══════════════════════════════════════════════════════════════ */

/**
 * Validate a single register field in real-time.
 * @param {string} fieldId
 * @returns {boolean}
 */
function validateRegisterField(fieldId) {
  const value = document.getElementById(fieldId)?.value || '';

  switch (fieldId) {
    case 'rgName': {
      if (!isNotEmpty(value)) {
        setFieldState('rg-name-group', 'error', 'Full name is required');
        return false;
      }
      if (value.trim().length < 2) {
        setFieldState('rg-name-group', 'error', 'Name must be at least 2 characters');
        return false;
      }
      setFieldState('rg-name-group', 'success', '');
      return true;
    }

    case 'rgUsername': {
      if (!isNotEmpty(value)) {
        setFieldState('rg-username-group', 'error', 'Username is required');
        return false;
      }
      if (!isValidUsername(value)) {
        setFieldState('rg-username-group', 'error', '3–20 chars, letters, numbers or _');
        return false;
      }
      setFieldState('rg-username-group', 'success', '');
      return true;
    }

    case 'rgEmail': {
      if (!isNotEmpty(value)) {
        setFieldState('rg-email-group', 'error', 'Email is required');
        return false;
      }
      if (!isValidEmail(value)) {
        setFieldState('rg-email-group', 'error', 'Enter a valid email address');
        return false;
      }
      // Check for duplicate email
      const existingUsers = getUsers();
      const duplicate = existingUsers.find(u => u.email.toLowerCase() === value.trim().toLowerCase());
      if (duplicate) {
        setFieldState('rg-email-group', 'error', 'This email is already registered');
        return false;
      }
      setFieldState('rg-email-group', 'success', '');
      return true;
    }

    case 'rgPassword': {
      const strength = getPasswordStrength(value);
      if (!isNotEmpty(value)) {
        setFieldState('rg-password-group', 'error', 'Password is required');
        return false;
      }
      if (value.length < 8) {
        setFieldState('rg-password-group', 'error', 'Password must be at least 8 characters');
        return false;
      }
      if (strength.score < 2) {
        setFieldState('rg-password-group', 'error', 'Password is too weak — see requirements below');
        return false;
      }
      setFieldState('rg-password-group', 'success', '');
      return true;
    }

    case 'rgConfirm': {
      const password = document.getElementById('rgPassword')?.value || '';
      if (!isNotEmpty(value)) {
        setFieldState('rg-confirm-group', 'error', 'Please confirm your password');
        return false;
      }
      if (value !== password) {
        setFieldState('rg-confirm-group', 'error', 'Passwords do not match');
        return false;
      }
      setFieldState('rg-confirm-group', 'success', 'Passwords match ✓');
      return true;
    }

    default:
      return true;
  }
}

/** Validate entire register form */
function validateRegisterForm() {
  return [
    validateRegisterField('rgName'),
    validateRegisterField('rgUsername'),
    validateRegisterField('rgEmail'),
    validateRegisterField('rgPassword'),
    validateRegisterField('rgConfirm'),
  ].every(Boolean);
}

/* ═══════════════════════════════════════════════════════════════
   PASSWORD STRENGTH
   ═══════════════════════════════════════════════════════════════ */

/**
 * Analyse password strength.
 * @param {string} password
 * @returns {{ score: number, label: string, color: string, percent: number, checks: object }}
 */
function getPasswordStrength(password) {
  const checks = {
    upper:   REGEX.upper.test(password),
    lower:   REGEX.lower.test(password),
    number:  REGEX.number.test(password),
    special: REGEX.special.test(password),
    length:  password.length >= 8,
  };

  const score = Object.values(checks).filter(Boolean).length;

  const levels = [
    { score: 0, label: '',       color: 'transparent', percent: 0   },
    { score: 1, label: 'Weak',   color: '#ff5b70',     percent: 20  },
    { score: 2, label: 'Weak',   color: '#ff5b70',     percent: 35  },
    { score: 3, label: 'Medium', color: '#ffc857',     percent: 60  },
    { score: 4, label: 'Strong', color: '#00e5c3',     percent: 85  },
    { score: 5, label: 'Strong', color: '#00e5c3',     percent: 100 },
  ];

  return { score, checks, ...levels[score] };
}

/**
 * Called on every keyup in the password field.
 * Updates strength bar, label, hints, and validates the field.
 */
function handlePasswordInput() {
  const password  = document.getElementById('rgPassword')?.value || '';
  const strength  = getPasswordStrength(password);

  // Bar
  const fill  = document.getElementById('strengthBarFill');
  const label = document.getElementById('strengthLabel');
  fill.style.width      = `${strength.percent}%`;
  fill.style.background = strength.color;
  label.textContent     = strength.label || 'Strength';
  label.style.color     = strength.score > 0 ? strength.color : '';

  // Hints
  const hintMap = {
    upper:   'hint-upper',
    lower:   'hint-lower',
    number:  'hint-number',
    special: 'hint-special',
    length:  'hint-length',
  };
  for (const [key, id] of Object.entries(hintMap)) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('met', strength.checks[key]);
  }

  // Also re-validate confirm if it has content
  const confirm = document.getElementById('rgConfirm')?.value || '';
  if (confirm.length > 0) validateRegisterField('rgConfirm');

  // Validate password field
  validateRegisterField('rgPassword');
}

/** Reset strength meter to default state */
function resetStrengthMeter() {
  const fill  = document.getElementById('strengthBarFill');
  const label = document.getElementById('strengthLabel');
  if (fill)  { fill.style.width = '0%'; fill.style.background = ''; }
  if (label) { label.textContent = 'Strength'; label.style.color = ''; }
  document.querySelectorAll('.hint-item').forEach(h => h.classList.remove('met'));
}

/* ═══════════════════════════════════════════════════════════════
   SHOW / HIDE PASSWORD TOGGLE
   ═══════════════════════════════════════════════════════════════ */

/**
 * Toggle input type between 'password' and 'text'.
 * @param {string} inputId
 * @param {HTMLButtonElement} btn
 */
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const isHidden  = input.type === 'password';
  input.type      = isHidden ? 'text' : 'password';
  const icon      = btn.querySelector('.eye-icon');
  // Eye open / closed emoji swap
  icon.textContent = isHidden ? '🙈' : '👁';
}

/* ═══════════════════════════════════════════════════════════════
   BUTTON LOADING STATE
   ═══════════════════════════════════════════════════════════════ */

/**
 * Simulate async operation with loading button state.
 * @param {string} btnId
 * @param {number} durationMs
 * @returns {Promise<void>}
 */
function withLoader(btnId, durationMs = 1200) {
  return new Promise(resolve => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.disabled = true;
      btn.classList.add('loading');
    }
    setTimeout(() => {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('loading');
      }
      resolve();
    }, durationMs);
  });
}

/* ═══════════════════════════════════════════════════════════════
   AUTH HANDLERS
   ═══════════════════════════════════════════════════════════════ */

/**
 * Handle Login form submission.
 * @param {Event} event
 */
async function handleLogin(event) {
  event.preventDefault();
  if (!validateLoginForm()) return;

  const email    = document.getElementById('lgEmail').value.trim().toLowerCase();
  const password = document.getElementById('lgPassword').value;
  const remember = document.getElementById('rememberMe').checked;

  await withLoader('loginBtn', 1400);

  const users = getUsers();
  const user  = users.find(u => u.email.toLowerCase() === email && u.password === password);

  if (!user) {
    setFieldState('lg-email-group', 'error', '');
    setFieldState('lg-password-group', 'error', 'Invalid email or password');
    showToast('Invalid credentials. Please try again.', 'error');
    return;
  }

  // Create session
  const session = {
    userId:    user.id,
    email:     user.email,
    name:      user.name,
    username:  user.username,
    loginTime: Date.now(),
    remember,
  };
  saveSession(session);

  showToast(`Welcome back, ${user.name.split(' ')[0]}! 👋`, 'success');
  loadDashboard(session);
}

/**
 * Handle Register form submission.
 * @param {Event} event
 */
async function handleRegister(event) {
  event.preventDefault();

  if (!validateRegisterForm()) {
    showToast('Please fix the errors before continuing.', 'error');
    return;
  }

  // Terms checkbox
  if (!document.getElementById('termsCheck').checked) {
    showToast('You must agree to the Terms of Service.', 'error');
    return;
  }

  const name     = document.getElementById('rgName').value.trim();
  const username = document.getElementById('rgUsername').value.trim();
  const email    = document.getElementById('rgEmail').value.trim().toLowerCase();
  const password = document.getElementById('rgPassword').value;

  await withLoader('registerBtn', 1600);

  // Final duplicate check (in case component wasn't validated recently)
  const users = getUsers();
  if (users.find(u => u.email.toLowerCase() === email)) {
    setFieldState('rg-email-group', 'error', 'This email is already registered');
    showToast('Email already in use.', 'error');
    return;
  }

  // Create new user
  const newUser = {
    id:        `usr_${Date.now()}`,
    name,
    username,
    email,
    password,             // NOTE: in a real app, never store plaintext passwords
    createdAt: Date.now(),
  };
  users.push(newUser);
  saveUsers(users);

  // Auto-login
  const session = {
    userId:    newUser.id,
    email:     newUser.email,
    name:      newUser.name,
    username:  newUser.username,
    loginTime: Date.now(),
    remember:  false,
  };
  saveSession(session);

  showToast(`Account created! Welcome, ${name.split(' ')[0]}! 🎉`, 'success');
  loadDashboard(session);
}

/**
 * Handle Forgot Password form submission.
 * @param {Event} event
 */
async function handleForgot(event) {
  event.preventDefault();

  const email = document.getElementById('fgEmail')?.value.trim() || '';
  if (!email) {
    setFieldState('fg-email-group', 'error', 'Email is required');
    return;
  }
  if (!isValidEmail(email)) {
    setFieldState('fg-email-group', 'error', 'Enter a valid email address');
    return;
  }
  setFieldState('fg-email-group', 'success', '');

  await withLoader('forgotBtn', 1800);

  // Simulate sending reset email (always succeeds for demo)
  showToast('Reset link sent! Check your inbox.', 'success', 4500);
  setTimeout(() => switchTab('login'), 1200);
}

/**
 * Handle Logout.
 */
function handleLogout() {
  clearSession();
  showToast('You have been signed out.', 'info');
  switchTab('login');
}

/**
 * Social login placeholder.
 * @param {string} provider
 */
function socialLogin(provider) {
  showToast(`${provider} login is not connected in this demo.`, 'info');
}

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════════════════════════ */

/**
 * Load and show the dashboard panel.
 * @param {{ name: string, email: string, loginTime: number }} session
 */
function loadDashboard(session) {
  // Populate user info
  const nameEl  = document.getElementById('dashName');
  const emailEl = document.getElementById('dashEmail');
  const avatar  = document.getElementById('dashAvatar');

  if (nameEl)  nameEl.textContent  = session.name;
  if (emailEl) emailEl.textContent = session.email;

  // Avatar initials
  if (avatar) {
    const initials = session.name
      .split(' ')
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    avatar.textContent = initials;
  }

  // Session time display
  updateSessionTime(session.loginTime);

  switchTab('dashboard');
}

/**
 * Display how long ago the session was created.
 * @param {number} loginTimestamp
 */
function updateSessionTime(loginTimestamp) {
  const el = document.getElementById('sessionTime');
  if (!el) return;

  const diff = Date.now() - loginTimestamp;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (diff < 60000)        el.textContent = 'just now';
  else if (mins < 60)      el.textContent = `${mins}m ago`;
  else if (hours < 24)     el.textContent = `${hours}h ago`;
  else                     el.textContent = 'earlier today';
}

/* ═══════════════════════════════════════════════════════════════
   FORGOT PASSWORD — FIELD VALIDATION
   ═══════════════════════════════════════════════════════════════ */

function validateForgotField() {
  const value = document.getElementById('fgEmail')?.value || '';
  if (!isNotEmpty(value)) {
    setFieldState('fg-email-group', 'error', 'Email is required');
    return;
  }
  if (!isValidEmail(value)) {
    setFieldState('fg-email-group', 'error', 'Enter a valid email address');
    return;
  }
  setFieldState('fg-email-group', 'success', '');
}

/* ═══════════════════════════════════════════════════════════════
   APP INIT
   ═══════════════════════════════════════════════════════════════ */

/**
 * Bootstrap the application on page load.
 * Checks for an existing session and restores state.
 */
function initApp() {
  // Apply saved theme
  initTheme();

  // Check existing session
  const session = getSession();
  if (session) {
    // Session exists — restore dashboard
    loadDashboard(session);
  } else {
    // Default: show login panel
    switchTab('login');
  }
}

// Run on DOM ready
document.addEventListener('DOMContentLoaded', initApp);