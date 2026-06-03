window.appState = window.appState || {
  selectedUser: null,
  usersLoaded: false,
  availableUsers: [],
};

/* ── Message ──────────────────────────────────────── */

function showMessage(text) {
  const el = document.getElementById('message');
  el.textContent = text;
  el.hidden = false;
}

function clearMessage() {
  const el = document.getElementById('message');
  el.textContent = '';
  el.hidden = true;
}

/* ── Password step ────────────────────────────────── */

function showPasswordStep() {
  const step = document.getElementById('login-password-step');
  const pw   = document.getElementById('login-chat-password');
  if (step) step.hidden = false;
  if (pw)   { pw.value = ''; pw.focus(); }
}

function hidePasswordStep() {
  const step = document.getElementById('login-password-step');
  const pw   = document.getElementById('login-chat-password');
  if (step) step.hidden = true;
  if (pw)   pw.value = '';
}

/* ── Chat logout helper ───────────────────────────── */

async function chatLogout() {
  try {
    await fetch('./features/chat/chat.php', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body:    new URLSearchParams({ action: 'logout' }).toString(),
    });
  } catch (_) { /* ignore */ }
}

/* ── Picker ───────────────────────────────────────── */

function renderPickerIcon(user) {
  const el = document.getElementById('pickerIcon');
  if (user && user.avatarUrls && user.avatarUrls['48x48']) {
    el.innerHTML = '<img class="picker-icon-image" src="' + user.avatarUrls['48x48'] + '" alt="">';
  } else {
    el.textContent = '?';
  }
}

function closeUserDropdown() {
  document.getElementById('userDropdown').hidden = true;
  document.getElementById('userPickerButton').setAttribute('aria-expanded', 'false');
}

function openUserDropdown() {
  if (!window.appState.usersLoaded) return;
  document.getElementById('userDropdown').hidden = false;
  document.getElementById('userPickerButton').setAttribute('aria-expanded', 'true');
}

function toggleUserDropdown() {
  document.getElementById('userDropdown').hidden
    ? openUserDropdown()
    : closeUserDropdown();
}

function selectUser(user) {
  window.appState.selectedUser = user;
  const label = document.getElementById('selectedUserLabel');
  label.textContent = user.displayName || 'Unknown user';
  label.classList.remove('is-placeholder');
  renderPickerIcon(user);
  clearMessage();
  closeUserDropdown();
  showPasswordStep();
}

function createUserOption(user) {
  const item   = document.createElement('li');
  const button = document.createElement('button');
  const avatar = document.createElement('span');
  const name   = document.createElement('span');

  item.setAttribute('role', 'presentation');
  button.type      = 'button';
  button.className = 'picker-option';
  button.setAttribute('role', 'option');
  button.dataset.accountId = user.accountId || '';

  avatar.className = 'picker-avatar';
  if (user.avatarUrls && user.avatarUrls['48x48']) {
    avatar.innerHTML = '<img class="picker-avatar-image" src="' + user.avatarUrls['48x48'] + '" alt="">';
  } else {
    avatar.textContent = (user.displayName || '?').charAt(0).toUpperCase();
  }

  name.className   = 'picker-option-name';
  name.textContent = user.displayName || 'Unknown user';

  button.appendChild(avatar);
  button.appendChild(name);
  button.addEventListener('click', function () { selectUser(user); });
  item.appendChild(button);

  return item;
}

async function loadUsers() {
  const userOptions = document.getElementById('userOptions');
  const continueBtn = document.getElementById('continueButton');
  const label       = document.getElementById('selectedUserLabel');

  clearMessage();
  window.appState.usersLoaded  = false;
  window.appState.selectedUser = null;
  window.appState.availableUsers = [];
  userOptions.innerHTML = '';
  label.textContent = 'Loading users...';
  label.classList.add('is-placeholder');
  renderPickerIcon(null);
  continueBtn.disabled = true;
  closeUserDropdown();

  try {
    const response = await fetch('./Api/user.php', { headers: { Accept: 'application/json' } });
    const data     = await response.json();

    if (!response.ok || !data.ok) throw new Error(data.error || 'Could not load users.');

    if (!Array.isArray(data.users) || data.users.length === 0) {
      label.textContent = 'No users found';
      showMessage('No users returned by Jira.');
      return;
    }

    window.appState.availableUsers = data.users;
    data.users.forEach(function (user) { userOptions.appendChild(createUserOption(user)); });
    window.appState.usersLoaded = true;
    label.textContent = 'Select your username...';
  } catch (error) {
    label.textContent = 'Could not load users';
    showMessage(error.message || 'Unexpected error while loading users.');
  } finally {
    continueBtn.disabled = false;
  }
}

/* ── Sign out ─────────────────────────────────────── */

document.getElementById('sign-out-btn').addEventListener('click', async function () {
  await chatLogout();
  document.getElementById('dashboard').hidden = true;
  document.getElementById('modal').hidden     = false;
  document.body.classList.remove('mobile-sidebar-open');
  window.appState.selectedUser = null;
  hidePasswordStep();
  clearMessage();
  if (typeof window.showMainSidebar === 'function') window.showMainSidebar();
  if (typeof window.resetDashboard  === 'function') window.resetDashboard();
});

/* ── Login form wiring ────────────────────────────── */

document.getElementById('userPickerButton').addEventListener('click', function () {
  clearMessage();
  toggleUserDropdown();
});

document.getElementById('continueButton').addEventListener('click', async function () {
  if (!window.appState.selectedUser) {
    showMessage('Select a user or continue as guest.');
    return;
  }

  const pwEl     = document.getElementById('login-chat-password');
  const password = String(pwEl ? pwEl.value : '').trim();

  if (!password) {
    showMessage('Enter your chat password to continue.');
    if (pwEl) pwEl.focus();
    return;
  }

  if (password.length < 6) {
    showMessage('Password must be at least 6 characters.');
    if (pwEl) pwEl.focus();
    return;
  }

  const continueBtn = document.getElementById('continueButton');
  continueBtn.disabled = true;
  clearMessage();

  try {
    const response = await fetch('./features/chat/chat.php', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body:    new URLSearchParams({
        action:      'login',
        password,
        accountId:   window.appState.selectedUser.accountId   || '',
        displayName: window.appState.selectedUser.displayName || '',
      }).toString(),
    });
    const data = await response.json();
    if (!data?.success) throw new Error(data?.message || 'Unable to sign in.');
    window.openDashboard();
  } catch (err) {
    showMessage(err.message || 'Unable to sign in.');
    if (pwEl) pwEl.focus();
  } finally {
    continueBtn.disabled = false;
  }
});

document.getElementById('guestButton').addEventListener('click', function () {
  hidePasswordStep();
  window.openDashboard();
});

/* ── Password field: submit on Enter ─────────────── */

const loginChatPassword = document.getElementById('login-chat-password');
if (loginChatPassword) {
  loginChatPassword.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('continueButton').click();
    }
  });
}

/* ── Close dropdown on outside click / Escape ────── */

document.addEventListener('click', function (e) {
  const picker = document.querySelector('.picker');
  if (picker && !picker.contains(e.target)) closeUserDropdown();
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeUserDropdown();
});

(async function init() {
  const [_, whoamiData] = await Promise.all([
    loadUsers(),
    fetch('./features/chat/chat.php?action=whoami', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .catch(function () { return null; }),
  ]);

  if (!whoamiData?.success || !whoamiData.user) return;

  const jiraAccountId = whoamiData.user.jiraAccountId;
  const users = window.appState.availableUsers;

  let matchedUser = jiraAccountId
    ? users.find(function (u) { return u.accountId === jiraAccountId; })
    : null;

  if (!matchedUser) {
    matchedUser = {
      accountId:   jiraAccountId || '',
      displayName: whoamiData.user.displayName || 'Unknown',
      avatarUrls:  {},
    };
  }

  window.appState.selectedUser = matchedUser;
  window.openDashboard();
})();
