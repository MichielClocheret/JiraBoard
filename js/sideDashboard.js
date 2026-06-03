window.appState = window.appState || {
  selectedUser: null,
  usersLoaded: false,
  availableUsers: [],
  projectManagers: [],
};

/* ── Active-state helpers ─────────────────────── */

function setActiveSidebarMember(el) {
  document.querySelectorAll('.user-item[data-tab]').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('#sidebar-members-list .user-item, #sidebar-managers-list .user-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
}

/* ── Panel switching ──────────────────────────── */

window.showMainSidebar = function showMainSidebar() {
  document.getElementById('main-sidebar-panel').removeAttribute('hidden');
  document.getElementById('user-sidebar-panel').hidden = true;
};

window.showUserSidebar = function showUserSidebar(user) {
  document.getElementById('main-sidebar-panel').hidden = true;
  const panel = document.getElementById('user-sidebar-panel');
  panel.removeAttribute('hidden');
  populateUserSidebar(user);
};

/* ── User sidebar builder ─────────────────────── */

function populateUserSidebar(user) {
  const panel = document.getElementById('user-sidebar-panel');
  panel.innerHTML = '';

  // ← Home
  const homeDiv = document.createElement('div');
  homeDiv.className = 'user-sidebar-home';
  const homeLink = document.createElement('a');
  homeLink.className = 'user-item';
  homeLink.href = '#';
  homeLink.textContent = '← Home';
  homeLink.addEventListener('click', (e) => {
    e.preventDefault();
    window.appState.selectedUser = null;
    window.showMainSidebar();
    if (typeof window.renderTabContent === 'function') window.renderTabContent('overview');
    const overviewItem = document.querySelector('[data-tab="overview"]');
    if (overviewItem) {
      document.querySelectorAll('.user-item[data-tab]').forEach(i => i.classList.remove('active'));
      overviewItem.classList.add('active');
    }
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = 'Overview';
  });
  homeDiv.appendChild(homeLink);
  panel.appendChild(homeDiv);

  // "Selected user" label
  const label = document.createElement('span');
  label.className = 'user-sidebar-selected-label';
  label.textContent = 'Selected user';
  panel.appendChild(label);

  // User row (always active)
  const userRowDiv = document.createElement('div');
  userRowDiv.className = 'user-sidebar-user-row';
  const userLink = document.createElement('a');
  userLink.className = 'user-item active';
  userLink.href = '#';

  const url = user.avatarUrls && user.avatarUrls['48x48'] ? user.avatarUrls['48x48'] : (user.avatarUrl || null);
  if (url) {
    const img = document.createElement('img');
    img.className = 'avatar';
    img.src = url;
    img.alt = '';
    userLink.appendChild(img);
  } else {
    const fb = document.createElement('span');
    fb.className = 'avatar-fallback';
    fb.textContent = (user.displayName || '?').charAt(0).toUpperCase();
    userLink.appendChild(fb);
  }

  const nameEl = document.createElement('span');
  nameEl.className = 'user-name';
  nameEl.textContent = user.displayName || 'Unknown';
  userLink.appendChild(nameEl);

  const dot = document.createElement('span');
  dot.className = 'active-dot';
  userLink.appendChild(dot);

  userLink.addEventListener('click', (e) => {
    e.preventDefault();
    setActiveUserNav(userLink);
    if (typeof window.renderUserTab === 'function') window.renderUserTab('todos', user);
  });

  userRowDiv.appendChild(userLink);
  panel.appendChild(userRowDiv);

  // Nav
  const nav = document.createElement('nav');
  nav.className = 'user-list user-sidebar-nav';

  const assignedLink = buildUserNavItem('📁 Assigned Projects', 'assignedProjects', user);
  const ownerLink    = buildUserNavItem('👑 Owner Of Projects',  'ownerProjects',    user);
  const alarmLink    = buildUserNavItem('‼️ Overdue Tasks',      'alarm',            user);
  alarmLink.classList.add('user-item-alarm');

  const badge = document.createElement('span');
  badge.className   = 'nav-badge';
  badge.style.display = 'none';
  badge.textContent = '0';
  alarmLink.appendChild(badge);

  nav.appendChild(assignedLink);
  nav.appendChild(ownerLink);
  nav.appendChild(alarmLink);
  panel.appendChild(nav);

  // Sign out
  const signOutDiv = document.createElement('div');
  signOutDiv.className = 'user-sidebar-signout';
  const signOutBtn = document.createElement('button');
  signOutBtn.type = 'button';
  signOutBtn.className = 'switch-user-btn';
  signOutBtn.style.cssText = 'width:100%; justify-content:center;';
  signOutBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Sign out';
  signOutBtn.addEventListener('click', async function () {
    try {
      await fetch('./features/chat/chat.php', {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        body:    new URLSearchParams({ action: 'logout' }).toString(),
      });
    } catch (_) { /* ignore */ }
    document.getElementById('dashboard').hidden = true;
    document.getElementById('modal').hidden     = false;
    document.body.classList.remove('mobile-sidebar-open');
    window.appState.selectedUser = null;
    if (typeof window.hidePasswordStep === 'function') window.hidePasswordStep();
    window.showMainSidebar();
    if (typeof window.resetDashboard === 'function') window.resetDashboard();
  });
  signOutDiv.appendChild(signOutBtn);
  panel.appendChild(signOutDiv);

  // Auto-open tasks view and load overdue badge
  if (typeof window.renderUserTab === 'function') window.renderUserTab('todos', user);
  setActiveUserNav(userLink);
  fetchOverdueBadge(user, badge);
}

function buildUserNavItem(label, tab, user) {
  const a = document.createElement('a');
  a.className = 'user-item';
  a.href = '#';
  a.textContent = label;
  a.addEventListener('click', (e) => {
    e.preventDefault();
    setActiveUserNav(a);
    if (typeof window.renderUserTab === 'function') window.renderUserTab(tab, user);
  });
  return a;
}

function setActiveUserNav(el) {
  const panel = document.getElementById('user-sidebar-panel');
  if (!panel) return;
  panel.querySelectorAll('.user-item').forEach(i => {
    if (i.classList.contains('user-item-alarm')) return;
    i.classList.remove('active');
  });
  panel.querySelectorAll('.user-item-alarm').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
}

async function fetchOverdueBadge(user, badgeEl) {
  try {
    const res = await fetch('./Api/user/overdue.php?userId=' + encodeURIComponent(user.accountId), { headers: { Accept: 'application/json' } });
    const data = await res.json();
    if (data.ok && Array.isArray(data.issues) && data.issues.length > 0) {
      badgeEl.textContent = String(data.issues.length);
      badgeEl.style.display = 'inline-flex';
    }
  } catch { /* silently ignore */ }
}

/* ── Sidebar member builders ──────────────── */

function createSidebarMember(user) {
  const a       = document.createElement('a');
  const avatarEl = document.createElement('span');
  const nameEl  = document.createElement('span');
  const selectedUser = window.appState.selectedUser;

  a.className = 'user-item';
  a.href      = '#';

  if (user.avatarUrls && user.avatarUrls['48x48']) {
    const img = document.createElement('img');
    img.className = 'avatar';
    img.src       = user.avatarUrls['48x48'];
    img.alt       = '';
    avatarEl.appendChild(img);
  } else {
    avatarEl.className   = 'avatar-fallback';
    avatarEl.textContent = (user.displayName || '?').charAt(0).toUpperCase();
  }

  nameEl.className   = 'user-name';
  nameEl.textContent = user.displayName || 'Unknown';

  a.appendChild(avatarEl);
  a.appendChild(nameEl);

  if (selectedUser && user.accountId === selectedUser.accountId) {
    a.classList.add('active');
    const dot = document.createElement('span');
    dot.className = 'active-dot';
    a.appendChild(dot);
  }

  a.addEventListener('click', (e) => {
    e.preventDefault();
    window.appState.selectedUser = user;
    window.showUserSidebar(user);
  });

  return a;
}

function populateSidebarUser() {
  const membersList = document.getElementById('sidebar-members-list');
  if (!membersList) return;

  const managerIds = new Set(
    window.appState.projectManagers.map(m => m.accountId).filter(Boolean)
  );
  const teamMembers = window.appState.availableUsers.filter(u => !managerIds.has(u.accountId));

  membersList.innerHTML = '';

  if (!teamMembers.length) {
    const empty = document.createElement('div');
    empty.className    = 'muted-text';
    empty.style.padding = '6px 12px';
    empty.textContent  = 'No team members found.';
    membersList.appendChild(empty);
    return;
  }

  teamMembers.forEach(user => membersList.appendChild(createSidebarMember(user)));
}

function createSidebarManager(manager) {
  const a       = document.createElement('a');
  const avatarEl = document.createElement('span');
  const nameEl  = document.createElement('span');

  a.className = 'user-item';
  a.href      = '#';

  if (manager.avatarUrls && manager.avatarUrls['48x48']) {
    const img = document.createElement('img');
    img.className = 'avatar';
    img.src       = manager.avatarUrls['48x48'];
    img.alt       = '';
    avatarEl.appendChild(img);
  } else {
    avatarEl.className   = 'avatar-fallback';
    avatarEl.textContent = (manager.displayName || '?').charAt(0).toUpperCase();
  }

  nameEl.className   = 'user-name';
  nameEl.textContent = manager.displayName || 'Unknown';

  const projectCount = Array.isArray(manager.projects) ? manager.projects.length : 0;
  if (projectCount > 0) {
    nameEl.title = manager.projects.map(p => p.key || p.name || 'Project').join(', ');
  }

  a.appendChild(avatarEl);
  a.appendChild(nameEl);

  if (projectCount > 0) {
    const badge = document.createElement('span');
    badge.className         = 'nav-badge';
    badge.textContent       = String(projectCount);
    badge.style.display     = 'inline-flex';
    a.appendChild(badge);
  }

  a.addEventListener('click', (e) => {
    e.preventDefault();
    window.appState.selectedUser = manager;
    window.showUserSidebar(manager);
  });

  return a;
}

function populateProjectManagers() {
  const managersList = document.getElementById('sidebar-managers-list');
  if (!managersList) return;

  managersList.innerHTML = '';

  if (!window.appState.projectManagers.length) {
    const empty = document.createElement('div');
    empty.className    = 'muted-text';
    empty.style.padding = '6px 12px';
    empty.textContent  = 'No project managers found.';
    managersList.appendChild(empty);
    return;
  }

  window.appState.projectManagers.forEach(manager => managersList.appendChild(createSidebarManager(manager)));
}

async function loadProjectManagers() {
  try {
    const response = await fetch('./Api/projects.php', { headers: { Accept: 'application/json' } });
    const data     = await response.json();

    if (!response.ok || !data.ok) throw new Error(data.error || 'Could not load projects.');

    window.appState.projectManagers = Array.isArray(data.managers) ? data.managers : [];
  } catch {
    window.appState.projectManagers = [];
  }

  populateProjectManagers();
  populateSidebarUser();
}

/* ── Sidebar collapsibles ─────────────────── */

function initSidebarCollapsibles() {
  document.querySelectorAll('[data-sidebar-toggle]').forEach(toggle => {
    const sectionKey = (toggle.getAttribute('data-sidebar-toggle') || '').trim();
    if (!sectionKey) return;

    const section   = toggle.closest('.sidebar-collapsible');
    const content   = document.querySelector('[data-sidebar-content="' + sectionKey + '"]');
    const indicator = toggle.querySelector('.sidebar-section-indicator');
    if (!content) return;

    const storageKey = 'sidebar-section:' + sectionKey;
    const savedState = localStorage.getItem(storageKey);

    const setExpanded = (expanded) => {
      toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      section.classList.toggle('is-collapsed', !expanded);

      if (expanded) {
        content.removeAttribute('hidden');
        localStorage.setItem(storageKey, 'open');
      } else {
        content.setAttribute('hidden', 'hidden');
        localStorage.setItem(storageKey, 'closed');
      }

      if (indicator) indicator.textContent = expanded ? '▾' : '▸';
    };

    setExpanded(savedState !== 'closed');

    if (!toggle.dataset.collapseInit) {
      toggle.dataset.collapseInit = '1';
      toggle.addEventListener('click', () => {
        setExpanded(toggle.getAttribute('aria-expanded') !== 'true');
      });
    }
  });
}

/* ── Mobile sidebar ───────────────────────── */

function initMobileSidebar() {
  const sidebar  = document.getElementById('app-sidebar');
  const backdrop = document.getElementById('mobile-sidebar-backdrop');
  const openBtn  = document.getElementById('mobile-sidebar-open');
  const closeBtn = document.getElementById('mobile-sidebar-close');
  const main     = document.getElementById('app-main');
  const mq       = window.matchMedia('(max-width: 640px)');

  const isMobile = () => mq.matches;

  const setSidebarOpen = (isOpen) => {
    if (!isMobile()) {
      document.body.classList.remove('mobile-sidebar-open');
      if (backdrop) backdrop.setAttribute('hidden', 'hidden');
      if (openBtn)  openBtn.setAttribute('aria-expanded', 'false');
      if (sidebar)  sidebar.setAttribute('aria-hidden', 'false');
      return;
    }

    document.body.classList.toggle('mobile-sidebar-open', isOpen);
    if (backdrop) isOpen ? backdrop.removeAttribute('hidden') : backdrop.setAttribute('hidden', 'hidden');
    if (openBtn)  openBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (sidebar)  sidebar.setAttribute('aria-hidden',   isOpen ? 'false' : 'true');
  };

  if (openBtn  && !openBtn.dataset.mobileInit)  { openBtn.dataset.mobileInit  = '1'; openBtn.addEventListener('click',  () => setSidebarOpen(true)); }
  if (closeBtn && !closeBtn.dataset.mobileInit) { closeBtn.dataset.mobileInit = '1'; closeBtn.addEventListener('click', () => setSidebarOpen(false)); }
  if (backdrop && !backdrop.dataset.mobileInit) { backdrop.dataset.mobileInit = '1'; backdrop.addEventListener('click', () => setSidebarOpen(false)); }

  if (main && !main.dataset.mobileScrollInit) {
    main.dataset.mobileScrollInit = '1';
    main.addEventListener('scroll', () => {
      if (document.body.classList.contains('mobile-sidebar-open')) setSidebarOpen(false);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('mobile-sidebar-open')) setSidebarOpen(false);
  });

  const syncMode = () => setSidebarOpen(false);
  if (typeof mq.addEventListener === 'function') mq.addEventListener('change', syncMode);
  else if (typeof mq.addListener === 'function') mq.addListener(syncMode);

  setSidebarOpen(false);
}

/* ── Tab navigation ───────────────────────── */

function setActiveTab(item) {
  document.querySelectorAll('.user-item[data-tab]').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('#sidebar-members-list .user-item, #sidebar-managers-list .user-item').forEach(el => el.classList.remove('active'));
  item.classList.add('active');

  const tab = item.dataset.tab;
  const titleEl = document.getElementById('page-title');
  const title = (item.dataset.title || tab || '').trim();

  if (titleEl) titleEl.textContent = title || tab;
  if (typeof window.renderTabContent === 'function') window.renderTabContent(tab);
}

/* ── Dashboard entry point ────────────────── */

window.openDashboard = function openDashboard() {
  document.getElementById('modal').hidden     = true;
  document.getElementById('dashboard').hidden = false;

  const user    = window.appState.selectedUser;
  const isGuest = !user;

  /* Hide chat-only items for guests */
  const pinnedSection = document.querySelector('[data-sidebar-section="pinned-projects"]');
  document.querySelectorAll('[data-guest-hidden="1"]').forEach(el => { el.hidden = isGuest; });
  if (pinnedSection) pinnedSection.hidden = isGuest;

  if (!isGuest && typeof window.loadChatPinnedSidebar === 'function') {
    window.loadChatPinnedSidebar();
  }

  if (user) {
    window.showUserSidebar(user);
  } else {
    window.showMainSidebar();
    populateSidebarUser();
    populateProjectManagers();
    initSidebarCollapsibles();
    const overviewItem = document.querySelector('[data-tab="overview"]');
    if (overviewItem) setActiveTab(overviewItem);
    else if (typeof window.renderTabContent === 'function') window.renderTabContent('overview');
  }

  loadProjectManagers();
  initMobileSidebar();
};

document.addEventListener('click', (e) => {
  const item = e.target.closest('[data-tab]');
  if (!item) return;
  e.preventDefault();
  setActiveTab(item);
});
