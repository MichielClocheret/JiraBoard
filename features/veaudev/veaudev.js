'use strict';

const esc = str => String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function vdPost(url, data) {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => fd.append(k, v == null ? '' : String(v)));
  const res = await fetch(url, { method: 'POST', body: fd });
  return res.json();
}

async function vdGet(url, params) {
  const q = params ? new URLSearchParams(params).toString() : '';
  const res = await fetch(q ? `${url}?${q}` : url);
  return res.json();
}

let _vdInit = false;
const vd = {
  selectedType: '', modalMode: 'create', editingProjectId: null,
  selectedDeployMode: '', selectedWebhostingMode: 'arno',
  projectsCache: [], pendingFinderSelections: { design: null, archive: null, assets: null },
  activeFinderTarget: 'design', currentProjectId: null, currentProjectTasks: null,
  activeTaskId: null, draggedTaskId: null, taskModalMode: 'edit',
  taskAssigneeFilter: '', taskPriorityFilter: '',
  pendingDeleteProjectId: null, projectSortOrder: 'newest', projectTypeFilter: 'all',
};
let vdUsers = [];

function vdEl(id) { return document.getElementById(id); }
function vdQA(sel) { return Array.from(document.querySelectorAll(sel)); }

const VD_API = './features/veaudev/create_web_project.php';
const VD_TASKS_API = './features/veaudev/manage_tasks.php';

function normalizeBuildType(v) { return String(v || '').trim().toLowerCase(); }

function getAvatarFallback(name) { return (String(name || '').trim().charAt(0) || 'U').toUpperCase(); }

function renderPickerAvatarMarkup(name, avatarUrl, cls) {
  const safeUrl = String(avatarUrl || '').trim();
  if (safeUrl) return `<img class="${cls}" src="${esc(safeUrl)}" alt="${esc(getAvatarFallback(name))}">`;
  return `<span class="${cls} avatar-fallback">${esc(getAvatarFallback(name))}</span>`;
}

function findAvailableUserByAccountId(accountId) {
  const id = String(accountId || '').trim();
  if (!id) return null;
  return vdUsers.find(u => String(u?.accountId || '').trim() === id) || null;
}

function vdMaskPassword(v) { return '•'.repeat(String(v || '').length); }

function vdSetFeedback(message, type) {
  const el = vdEl('add-web-project-feedback');
  if (!el) return;
  if (!message) { el.hidden = true; el.className = 'chat-feedback'; el.textContent = ''; return; }
  el.hidden = false;
  el.className = 'chat-feedback' + (type === 'error' ? ' error' : ' success');
  el.textContent = message;
}

function vdSetTaskFeedback(message, type) {
  const el = vdEl('veaudev-task-feedback');
  if (!el) return;
  if (!message) { el.hidden = true; el.className = 'chat-feedback'; el.textContent = ''; return; }
  el.hidden = false;
  el.className = 'chat-feedback' + (type === 'error' ? ' error' : ' success');
  el.textContent = message;
}

function setCopyButtonState(targetSelector, hasValue) {
  vdQA(`.veaudev-copy-btn[data-copy-target="${targetSelector}"]`).forEach(btn => { btn.disabled = !hasValue; });
}

function toggleLoginRow(selector, hasValue) {
  const el = document.querySelector(selector);
  if (!el) return;
  const row = el.closest('.veaudev-login-row');
  if (row) row.hidden = !hasValue;
}

function vdRenderPasswordValue(password) {
  const el = vdEl('veaudev-project-password');
  if (!el) return;
  const safe = String(password || '').trim();
  el.dataset.password = safe;
  el.classList.toggle('is-hidden-password', !!safe);
  el.textContent = safe ? vdMaskPassword(safe) : '-';
}

function vdCloseDateFilterMenu() {
  const menu = vdEl('veaudev-date-filter-menu');
  const btn = vdEl('filter-button-date');
  if (menu) { menu.hidden = true; menu.classList.remove('is-open'); }
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function vdOpenDateFilterMenu() {
  const menu = vdEl('veaudev-date-filter-menu');
  const btn = vdEl('filter-button-date');
  if (menu) { menu.hidden = false; menu.classList.add('is-open'); }
  if (btn) btn.setAttribute('aria-expanded', 'true');
}

function closeTaskAssigneeFilterMenu() {
  const menu = vdEl('veaudev-task-filter-assignee-menu');
  const btn = vdEl('veaudev-task-filter-assignee-btn');
  if (menu) { menu.hidden = true; menu.classList.remove('is-open'); }
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function openTaskAssigneeFilterMenu() {
  const menu = vdEl('veaudev-task-filter-assignee-menu');
  const btn = vdEl('veaudev-task-filter-assignee-btn');
  if (menu) { menu.hidden = false; menu.classList.add('is-open'); }
  if (btn) btn.setAttribute('aria-expanded', 'true');
}

function closeTaskPriorityFilterMenu() {
  const menu = vdEl('veaudev-task-filter-priority-menu');
  const btn = vdEl('veaudev-task-filter-priority-btn');
  if (menu) { menu.hidden = true; menu.classList.remove('is-open'); }
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function openTaskPriorityFilterMenu() {
  const menu = vdEl('veaudev-task-filter-priority-menu');
  const btn = vdEl('veaudev-task-filter-priority-btn');
  if (menu) { menu.hidden = false; menu.classList.add('is-open'); }
  if (btn) btn.setAttribute('aria-expanded', 'true');
}

function closeTaskAssigneeMenu() {
  const picker = vdEl('veaudev-task-assignee-picker');
  const btn = vdEl('veaudev-task-assignee-btn');
  if (picker) picker.classList.remove('is-open');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function vdSetTaskPriority(priority) {
  const safe = ['low', 'medium', 'high'].includes(String(priority || '').trim().toLowerCase())
    ? String(priority).trim().toLowerCase() : 'medium';
  const hidden = vdEl('veaudev-task-priority');
  if (hidden) hidden.value = safe;
  vdQA('.veaudev-task-priority-btn').forEach(btn => {
    const isSelected = (btn.dataset.taskPriority || '') === safe;
    btn.classList.toggle('is-selected', isSelected);
    btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
  });
}

function vdSetTaskAssigneeSelection({ accountId = '', displayName = '', avatarUrl = '' } = {}) {
  const safeId = String(accountId || '').trim();
  const safeName = String(displayName || '').trim() || 'Unassigned';
  const safeUrl = String(avatarUrl || '').trim();
  const hidden = vdEl('veaudev-task-assignee');
  if (hidden) { hidden.value = safeId; hidden.dataset.assigneeName = safeId ? safeName : ''; }
  const current = vdEl('veaudev-task-assignee-current');
  if (current) {
    current.innerHTML = renderPickerAvatarMarkup(safeName, safeUrl, 'veaudev-user-picker-avatar')
      + `<span class="veaudev-user-picker-text">${esc(safeName)}</span>`;
  }
}

function buildTaskAssigneeFilterMenu() {
  const menu = vdEl('veaudev-task-filter-assignee-menu');
  if (!menu) return;
  const seen = new Set(['']);
  const users = [{ accountId: '', displayName: 'All' }];
  vdUsers.slice().sort((a, b) => String(a?.displayName || '').localeCompare(String(b?.displayName || '')))
    .forEach(u => {
      const id = String(u?.accountId || '').trim();
      const name = String(u?.displayName || '').trim();
      if (!id || !name || seen.has(id)) return;
      seen.add(id); users.push({ accountId: id, displayName: name });
    });
  menu.innerHTML = users.map(u =>
    `<button type="button" class="veaudev-date-filter-option" data-task-assignee-filter="${esc(u.accountId)}">${esc(u.displayName || 'All')}</button>`
  ).join('');
}

function updateTaskAssigneeFilterButtonLabel() {
  const btn = vdEl('veaudev-task-filter-assignee-btn');
  if (!btn) return;
  if (!vd.taskAssigneeFilter) { btn.textContent = 'Assigned to: All'; return; }
  const u = findAvailableUserByAccountId(vd.taskAssigneeFilter);
  btn.textContent = `Assigned to: ${u?.displayName || 'All'}`;
}

function updateTaskPriorityFilterButtonLabel() {
  const btn = vdEl('veaudev-task-filter-priority-btn');
  if (!btn) return;
  const map = { low: 'Low', medium: 'Medium', high: 'High' };
  btn.textContent = vd.taskPriorityFilter ? `Priority: ${map[vd.taskPriorityFilter] || 'All'}` : 'Priority: All';
}

function updateDateFilterButtonLabel() {
  const btn = vdEl('filter-button-date');
  if (btn) btn.textContent = `Date: ${vd.projectSortOrder === 'oldest' ? 'Oldest' : 'Newest'}`;
}

function matchesTaskAssigneeFilter(task) {
  if (!vd.taskAssigneeFilter) return true;
  return String(task?.assigneeAccountId || '').trim().toLowerCase() === String(vd.taskAssigneeFilter || '').trim().toLowerCase();
}

function matchesTaskPriorityFilter(task) {
  if (!vd.taskPriorityFilter) return true;
  return String(task?.priority || 'medium').trim().toLowerCase() === vd.taskPriorityFilter;
}

function matchesProjectTypeFilter(project) {
  const buildType = normalizeBuildType(project?.buildType);
  if (vd.projectTypeFilter === 'all') return true;
  if (vd.projectTypeFilter === 'webflow') return buildType === 'webflow';
  if (vd.projectTypeFilter === 'custom') return buildType === 'custom';
  if (vd.projectTypeFilter === 'other') return buildType !== '' && buildType !== 'webflow' && buildType !== 'custom';
  return true;
}

function updateTypeFilterButtons() {
  vdQA('.filter-button-webprojects-type').forEach(btn => {
    const id = String(btn.id || '').trim().toLowerCase();
    const isActive = id === `filter-button-type-${vd.projectTypeFilter}`;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function getProjectBuildTypeIconMarkup(buildType) {
  const t = normalizeBuildType(buildType);
  if (t === 'webflow') return '<img src="./assets/images/WebflowIcon.png" alt="Webflow" class="veaudev-project-type-icon">';
  if (t === 'custom') return '<img src="./assets/images/VscodeIcon.png" alt="Custom" class="veaudev-project-type-icon">';
  if (t) return '<img src="./assets/images/OtherIcon.png" alt="Other" class="veaudev-project-type-icon">';
  return '';
}

function renderProjectBuildTypeIcon(buildType) {
  const icon = vdEl('veaudev-project-build-type-icon');
  const label = vdEl('veaudev-project-build-type-label');
  const row = vdEl('veaudev-project-build-type-row');
  const copyBtn = vdEl('veaudev-project-build-type-copy');
  const t = normalizeBuildType(buildType);
  const raw = String(buildType || '').trim();

  if (t === 'webflow') {
    if (icon) { icon.innerHTML = '<span class="veaudev-build-type-badge"><img src="./assets/images/WebflowIcon.png" alt="Webflow" class="veaudev-build-type-icon"></span>'; icon.hidden = false; }
    if (label) label.textContent = 'Webflow';
    if (row) row.hidden = false;
    if (copyBtn) { copyBtn.hidden = true; copyBtn.disabled = true; }
    return;
  }
  if (t === 'custom') {
    if (icon) { icon.innerHTML = '<span class="veaudev-build-type-badge"><img src="./assets/images/VscodeIcon.png" alt="Custom" class="veaudev-build-type-icon"></span>'; icon.hidden = false; }
    if (label) label.textContent = 'Custom';
    if (row) row.hidden = false;
    if (copyBtn) { copyBtn.hidden = true; copyBtn.disabled = true; }
    return;
  }
  if (t) {
    if (icon) { icon.innerHTML = '<span class="veaudev-build-type-badge"><img src="./assets/images/OtherIcon.png" alt="Other" class="veaudev-build-type-icon"></span>'; icon.hidden = false; }
    if (label) label.textContent = raw;
    if (row) row.hidden = false;
    if (copyBtn) { copyBtn.hidden = false; copyBtn.disabled = false; }
    return;
  }
  if (icon) { icon.innerHTML = ''; icon.hidden = true; }
  if (label) label.textContent = '';
  if (row) row.hidden = true;
  if (copyBtn) { copyBtn.hidden = true; copyBtn.disabled = true; }
}

function getProjectTimestamp(project) {
  const raw = String(project?.createdAt || '').trim();
  const ts = raw ? Date.parse(raw.replace(' ', 'T')) : NaN;
  return Number.isNaN(ts) ? Number(project?.id || 0) : ts;
}

function sortProjectsByDate(projects) {
  const items = Array.isArray(projects) ? [...projects] : [];
  const dir = vd.projectSortOrder === 'oldest' ? 1 : -1;
  return items.sort((a, b) => {
    const diff = getProjectTimestamp(a) - getProjectTimestamp(b);
    if (diff !== 0) return diff * dir;
    return (Number(a?.id || 0) - Number(b?.id || 0)) * dir;
  });
}

function renderProjects(projects) {
  const list = vdEl('veau-dev-project-list');
  if (!list) return;
  const items = Array.isArray(projects) ? projects : [];
  if (!items.length) {
    list.innerHTML = `<li class="issue-empty">${vd.projectsCache.length ? 'No projects found.' : 'No projects yet.'}</li>`;
    return;
  }
  list.innerHTML = items.map(p => {
    const id = Number(p?.id || 0);
    const name = String(p?.projectName || '').trim();
    const type = String(p?.buildType || '').trim();
    const total = Math.max(Number(p?.totalTasks || 0), 0);
    const done = Math.min(Math.max(Number(p?.doneTasks || 0), 0), total || 0);
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return `<li class="veaudev-project-card" data-project-id="${id}" data-project-name="${esc(name)}">`
      + '<div class="veaudev-project-card-main">'
      + `<div class="veaudev-project-card-top"><span class="veaudev-project-card-name">${esc(name)}</span>${getProjectBuildTypeIconMarkup(type)}</div>`
      + '<div class="veaudev-project-progress">'
      + `<div class="veaudev-project-progress-bar" aria-hidden="true"><span class="veaudev-project-progress-fill" style="width:${pct}%"></span></div>`
      + `<span class="veaudev-project-progress-text">${done}/${total} tasks done</span>`
      + '</div></div></li>';
  }).join('');
}

function filterProjects() {
  const search = vdEl('veaudev-project-search');
  const query = String(search?.value || '').trim().toLowerCase();
  const filtered = vd.projectsCache.filter(p => {
    const name = String(p?.projectName || '').trim().toLowerCase();
    const type = String(p?.buildType || '').trim().toLowerCase();
    return (!query || name.includes(query) || type.includes(query)) && matchesProjectTypeFilter(p);
  });
  renderProjects(sortProjectsByDate(filtered));
}

function findProjectByName(name) {
  const t = String(name || '').trim().toLowerCase();
  if (!t) return null;
  return vd.projectsCache.find(p => String(p?.projectName || '').trim().toLowerCase() === t) || null;
}

function findProjectById(id) {
  return vd.projectsCache.find(p => Number(p?.id || 0) === Number(id)) || null;
}

function findTaskById(taskId) {
  const num = Number(taskId || 0);
  if (!num || !vd.currentProjectTasks) return null;
  return []
    .concat(Array.isArray(vd.currentProjectTasks.defaultTasks) ? vd.currentProjectTasks.defaultTasks : [])
    .concat(Array.isArray(vd.currentProjectTasks.customTasks) ? vd.currentProjectTasks.customTasks : [])
    .find(t => Number(t?.id || 0) === num) || null;
}

function getRouteProjectName() {
  const hash = String(window.location.hash || '');
  const match = hash.match(/^#project\/(.+)$/);
  if (!match?.[1]) return '';
  try { return decodeURIComponent(match[1]); } catch { return ''; }
}

function setRouteProjectName(name) {
  const encoded = encodeURIComponent(String(name || '').trim());
  if (!encoded) return;
  const next = `#project/${encoded}`;
  if (window.location.hash !== next) window.location.hash = next;
}

function clearRouteProjectName() {
  if (window.location.hash) window.history.pushState(null, '', window.location.pathname + window.location.search);
}

function vdShowListView() {
  const detailView = vdEl('veaudev-project-detail-view');
  const listView = vdEl('veaudev-projects-view');
  const backBtn = vdEl('veaudev-content-back-btn');
  const editBtn = vdEl('veaudev-content-edit-btn');
  const pageTitle = vdEl('page-title');

  if (detailView) detailView.hidden = true;
  if (listView) listView.hidden = false;
  if (backBtn) backBtn.hidden = true;
  if (editBtn) editBtn.hidden = true;

  renderProjectBuildTypeIcon('');

  const tasksWrap = vdEl('veaudev-build-tasks-wrap');
  const tasksList = vdEl('veaudev-build-tasks-list');
  const customList = vdEl('veaudev-custom-tasks-list');
  const archiveSection = vdEl('veaudev-project-archive-section');
  const assetsSection = vdEl('veaudev-project-assets-section');
  const archiveBtn = vdEl('veaudev-project-open-archive-btn');
  const assetsBtn = vdEl('veaudev-project-open-assets-btn');

  if (tasksWrap) tasksWrap.hidden = true;
  if (tasksList) tasksList.innerHTML = '';
  if (customList) customList.innerHTML = '';
  if (archiveSection) archiveSection.hidden = true;
  if (assetsSection) assetsSection.hidden = true;
  if (archiveBtn) { archiveBtn.hidden = true; delete archiveBtn.dataset.filePath; }
  if (assetsBtn) { assetsBtn.hidden = true; delete assetsBtn.dataset.filePath; }

  const notesEl = document.querySelector('.veaudev-project-notes');
  const loginChoice = vdEl('veaudev-project-login-choice');
  const host = vdEl('veaudev-project-host');
  const username = vdEl('veaudev-project-username');
  const port = vdEl('veaudev-project-port');
  const personalNotes = vdEl('veaudev-project-personal-notes');
  const loginLink = vdEl('veaudev-project-link');
  const openLoginLink = vdEl('veaudev-project-open-login-link');

  if (notesEl) notesEl.textContent = '';
  if (loginChoice) loginChoice.textContent = '-';
  if (host) host.textContent = '-';
  if (username) username.textContent = '-';
  if (loginLink) loginLink.textContent = '-';
  if (port) port.textContent = '-';
  if (personalNotes) personalNotes.textContent = '-';
  if (openLoginLink) { openLoginLink.hidden = true; delete openLoginLink.dataset.linkUrl; }

  vdRenderPasswordValue('');
  toggleLoginRow('#veaudev-project-login-choice', false);
  toggleLoginRow('#veaudev-project-host', false);
  toggleLoginRow('#veaudev-project-username', false);
  toggleLoginRow('#veaudev-project-password', false);
  toggleLoginRow('#veaudev-project-link', false);
  toggleLoginRow('#veaudev-project-port', false);
  toggleLoginRow('#veaudev-project-personal-notes', false);
  setCopyButtonState('#veaudev-project-host', false);
  setCopyButtonState('#veaudev-project-username', false);
  setCopyButtonState('#veaudev-project-password', false);
  setCopyButtonState('#veaudev-project-port', false);

  vd.currentProjectId = null;
  if (pageTitle) pageTitle.textContent = 'VeauDev Manager';
  clearRouteProjectName();
}

function vdRenderProjectDetailMeta(project) {
  const filePath = String(project?.designFilePath || '').trim();
  const fileName = String(project?.designFileName || '').trim() || filePath.split('/').pop() || '';
  const designLink = String(project?.designLink || '').trim();
  const hasDesign = !!filePath || !!designLink;
  const archivePath = String(project?.archiveFolderPath || '').trim();
  const assetsPath = String(project?.assetsFolderPath || '').trim();

  const designEmpty = vdEl('veaudev-project-design-empty');
  const detailMeta = vdEl('veaudev-project-detail-meta');
  const detailFile = vdEl('veaudev-project-detail-file');
  const finderBtn = vdEl('veaudev-project-open-finder-btn');
  const linkBtn = vdEl('veaudev-project-open-link-btn');
  const archiveSection = vdEl('veaudev-project-archive-section');
  const archiveBtn = vdEl('veaudev-project-open-archive-btn');
  const assetsSection = vdEl('veaudev-project-assets-section');
  const assetsBtn = vdEl('veaudev-project-open-assets-btn');

  if (designEmpty) designEmpty.hidden = hasDesign;

  if (!filePath) {
    if (detailMeta) detailMeta.hidden = true;
    if (finderBtn) finderBtn.hidden = true;
    if (detailFile) detailFile.textContent = '';
  } else {
    if (detailFile) detailFile.textContent = fileName;
    if (detailMeta) detailMeta.hidden = false;
    if (finderBtn) { finderBtn.hidden = false; finderBtn.dataset.filePath = filePath; }
  }

  if (!designLink) {
    if (linkBtn) { linkBtn.hidden = true; delete linkBtn.dataset.linkUrl; }
  } else {
    if (linkBtn) { linkBtn.hidden = false; linkBtn.dataset.linkUrl = designLink; }
  }

  if (archivePath) {
    if (archiveSection) archiveSection.hidden = false;
    if (archiveBtn) { archiveBtn.hidden = false; archiveBtn.dataset.filePath = archivePath; }
  } else {
    if (archiveSection) archiveSection.hidden = true;
    if (archiveBtn) { archiveBtn.hidden = true; delete archiveBtn.dataset.filePath; }
  }

  if (assetsPath) {
    if (assetsSection) assetsSection.hidden = false;
    if (assetsBtn) { assetsBtn.hidden = false; assetsBtn.dataset.filePath = assetsPath; }
  } else {
    if (assetsSection) assetsSection.hidden = true;
    if (assetsBtn) { assetsBtn.hidden = true; delete assetsBtn.dataset.filePath; }
  }
}

function vdShowProjectDetail(project) {
  if (!project) return;
  const buildTypeTitle = String(project.buildType || '').trim() || 'Build Type';
  const deployMode = String(project.deployMode || '').trim();
  const webhostingMode = String(project.webhostingMode || '').trim();
  const loginChoice = deployMode === 'webhosting'
    ? (['customLogin', 'otherLogin', 'other'].includes(webhostingMode) ? 'Custom login' : (webhostingMode === 'personal' ? 'Personal' : 'Arno login'))
    : '';

  renderProjectBuildTypeIcon(buildTypeTitle);

  const notesEl = document.querySelector('.veaudev-project-notes');
  const loginChoiceEl = vdEl('veaudev-project-login-choice');
  const hostEl = vdEl('veaudev-project-host');
  const usernameEl = vdEl('veaudev-project-username');
  const linkEl = vdEl('veaudev-project-link');
  const portEl = vdEl('veaudev-project-port');
  const personalNotesEl = vdEl('veaudev-project-personal-notes');
  const openLoginLink = vdEl('veaudev-project-open-login-link');
  const backBtn = vdEl('veaudev-content-back-btn');
  const editBtn = vdEl('veaudev-content-edit-btn');
  const pageTitle = vdEl('page-title');
  const listView = vdEl('veaudev-projects-view');
  const detailView = vdEl('veaudev-project-detail-view');

  const deployHost = String(project.deployHost || '').trim();
  const deployUsername = String(project.deployUsername || '').trim();
  const deployPassword = String(project.deployPassword || '').trim();
  const webhostingLink = String(project.webhostingLink || '').trim();
  const deployPort = String(project.deployPort || '').trim();
  const webhostingPersonalNotes = String(project.webhostingPersonalNotes || '').trim();

  if (notesEl) notesEl.textContent = String(project.projectNotes || '').trim() || 'No notes yet.';
  if (loginChoiceEl) loginChoiceEl.textContent = loginChoice;
  if (hostEl) hostEl.textContent = deployHost;
  if (usernameEl) usernameEl.textContent = deployUsername;
  if (linkEl) linkEl.textContent = webhostingLink;
  if (portEl) portEl.textContent = deployPort;
  if (personalNotesEl) personalNotesEl.textContent = webhostingPersonalNotes;
  vdRenderPasswordValue(deployPassword);
  if (openLoginLink) {
    openLoginLink.hidden = !webhostingLink;
    if (webhostingLink) openLoginLink.dataset.linkUrl = webhostingLink;
    else delete openLoginLink.dataset.linkUrl;
  }

  toggleLoginRow('#veaudev-project-login-choice', !!loginChoice);
  toggleLoginRow('#veaudev-project-host', !!deployHost);
  toggleLoginRow('#veaudev-project-username', !!deployUsername);
  toggleLoginRow('#veaudev-project-password', !!deployPassword);
  toggleLoginRow('#veaudev-project-link', !!webhostingLink);
  toggleLoginRow('#veaudev-project-port', !!deployPort);
  toggleLoginRow('#veaudev-project-personal-notes', !!webhostingPersonalNotes);
  setCopyButtonState('#veaudev-project-host', !!deployHost);
  setCopyButtonState('#veaudev-project-username', !!deployUsername);
  setCopyButtonState('#veaudev-project-password', !!deployPassword);
  setCopyButtonState('#veaudev-project-port', !!deployPort);

  if (backBtn) backBtn.hidden = false;
  if (editBtn) editBtn.hidden = false;
  if (pageTitle) pageTitle.textContent = String(project.projectName || 'Project');

  vdRenderProjectDetailMeta(project);
  vdRenderBuildTasks(buildTypeTitle, project.id);
  if (listView) listView.hidden = true;
  if (detailView) detailView.hidden = false;
  setRouteProjectName(project.projectName);
}

function populateTaskAssigneeOptions(selectedAccountId, selectedName) {
  const menu = vdEl('veaudev-task-assignee-menu');
  if (!menu) return;
  const fallbackId = String(selectedAccountId || '').trim();
  const fallbackName = String(selectedName || '').trim();
  const seen = new Set(['']);
  const items = [{ accountId: '', displayName: 'Unassigned', avatarUrl: '' }];
  vdUsers.slice().sort((a, b) => String(a?.displayName || '').localeCompare(String(b?.displayName || '')))
    .forEach(u => {
      const id = String(u?.accountId || '').trim();
      const name = String(u?.displayName || '').trim();
      if (!id || !name || seen.has(id)) return;
      seen.add(id); items.push({ accountId: id, displayName: name, avatarUrl: String(u?.avatarUrl || '').trim() });
    });
  if (fallbackId && fallbackName && !seen.has(fallbackId)) {
    items.push({ accountId: fallbackId, displayName: fallbackName, avatarUrl: '' });
  }
  menu.innerHTML = items.map(u => {
    const id = String(u.accountId || '');
    const name = String(u.displayName || '').trim() || 'Unassigned';
    const url = String(u.avatarUrl || '');
    const isSel = id === fallbackId;
    return `<button type="button" class="veaudev-user-picker-item${isSel ? ' is-selected' : ''}" data-assignee-account-id="${esc(id)}" data-assignee-name="${esc(name)}" data-assignee-avatar-url="${esc(url)}" role="option" aria-selected="${isSel ? 'true' : 'false'}">`
      + renderPickerAvatarMarkup(name, url, 'veaudev-user-picker-item-avatar')
      + `<span class="veaudev-user-picker-item-name">${esc(name)}</span></button>`;
  }).join('');
  const selUser = findAvailableUserByAccountId(fallbackId);
  vdSetTaskAssigneeSelection({
    accountId: fallbackId,
    displayName: fallbackId ? (selUser?.displayName || fallbackName) : '',
    avatarUrl: fallbackId ? (selUser?.avatarUrl || '') : '',
  });
}

function renderTaskCard(task, kind, isDone) {
  const hasNotes = String(task?.notes || '').trim() !== '';
  const assigneeName = String(task?.assigneeName || '').trim();
  return `<li><div class="veaudev-task-card${isDone ? ' is-done' : ''}" draggable="true" data-task-id="${Number(task?.id || 0)}" data-task-kind="${esc(kind)}" data-task-done="${isDone ? '1' : '0'}"><div class="veaudev-task-card-content"><div class="veaudev-task-card-header"><span class="veaudev-task-card-title">${esc(String(task?.text || 'Task'))}</span>${hasNotes ? '<span class="veaudev-task-card-note-indicator" aria-label="Task has notes" title="Task has notes"></span>' : ''}</div>${assigneeName ? `<div class="veaudev-task-card-meta"><span class="veaudev-task-card-assignee">${esc(assigneeName)}</span></div>` : ''}</div></div></li>`;
}

function renderTaskList(listEl, tasks, kind, isDone) {
  if (!listEl) return;
  if (!tasks.length) { listEl.innerHTML = '<li class="veaudev-build-task-empty">No tasks here yet.</li>'; return; }
  listEl.innerHTML = tasks.map(t => renderTaskCard(t, kind, isDone)).join('');
}

function vdRenderBuildTasks(buildType, projectId) {
  const wrap = vdEl('veaudev-build-tasks-wrap');
  const defaultList = vdEl('veaudev-build-tasks-list');
  const customList = vdEl('veaudev-custom-tasks-list');
  const doneList = vdEl('veaudev-done-tasks-list');
  if (!wrap || !defaultList) return;

  vd.currentProjectId = projectId;
  wrap.hidden = true;
  defaultList.innerHTML = '';
  if (customList) customList.innerHTML = '';
  if (doneList) doneList.innerHTML = '';

  vdGet(VD_TASKS_API, { action: 'get_tasks', projectId }).then(payload => {
    if (!payload?.success) { console.warn('Failed to load tasks:', payload?.message); return; }
    vd.currentProjectTasks = payload;
    const defTasks = (payload?.defaultTasks || []).filter(t => matchesTaskAssigneeFilter(t) && matchesTaskPriorityFilter(t));
    const custTasks = (payload?.customTasks || []).filter(t => matchesTaskAssigneeFilter(t) && matchesTaskPriorityFilter(t));
    const pendingDef = defTasks.filter(t => !t?.isDone);
    const pendingCust = custTasks.filter(t => !t?.isDone);
    const done = defTasks.filter(t => t?.isDone).concat(custTasks.filter(t => t?.isDone));

    const colDefault = vdEl('veaudev-task-column-default');
    const colCustom = vdEl('veaudev-task-column-custom');
    const colDone = vdEl('veaudev-task-column-done');
    if (colDefault) { colDefault.dataset.dropKind = 'default'; colDefault.dataset.dropState = 'pending'; }
    if (colCustom) { colCustom.dataset.dropKind = 'custom'; colCustom.dataset.dropState = 'pending'; }
    if (colDone) { colDone.dataset.dropKind = 'done'; colDone.dataset.dropState = 'done'; }

    renderTaskList(defaultList, pendingDef, 'default', false);
    renderTaskList(customList, pendingCust, 'custom', false);
    renderTaskList(doneList, done, 'done', true);
    wrap.hidden = false;
  }).catch(err => console.error('Failed to load tasks:', err));
}

function vdReloadCurrentProjectTasks() {
  const project = findProjectById(vd.currentProjectId);
  if (!project) return;
  vdRenderBuildTasks(String(project.buildType || '').trim() || 'Build Type', vd.currentProjectId);
}

function vdCloseTaskModal() {
  vd.activeTaskId = null;
  vd.taskModalMode = 'edit';
  closeTaskAssigneeMenu();
  vdSetTaskFeedback('');
  const nameEl = vdEl('veaudev-task-name');
  const notesEl = vdEl('veaudev-task-notes');
  const assigneeEl = vdEl('veaudev-task-assignee');
  const titleEl = vdEl('veaudev-task-modal-title');
  const saveBtn = vdEl('veaudev-task-save');
  const deleteBtn = vdEl('veaudev-task-delete');
  const backdrop = vdEl('veaudev-task-backdrop');
  const modal = vdEl('veaudev-task-modal');
  if (nameEl) nameEl.value = '';
  if (notesEl) notesEl.value = '';
  if (assigneeEl) { assigneeEl.value = ''; delete assigneeEl.dataset.assigneeName; }
  vdSetTaskAssigneeSelection();
  vdSetTaskPriority('medium');
  if (titleEl) titleEl.textContent = 'Task';
  if (saveBtn) saveBtn.textContent = 'Save task';
  if (deleteBtn) { deleteBtn.hidden = true; delete deleteBtn.dataset.taskId; }
  if (backdrop) { backdrop.classList.remove('is-open'); backdrop.setAttribute('aria-hidden', 'true'); }
  if (modal) { modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true'); }
}

function vdOpenTaskModal(taskId) {
  const task = findTaskById(taskId);
  if (!task) return;
  vd.taskModalMode = 'edit';
  vd.activeTaskId = Number(task.id || 0);
  const titleEl = vdEl('veaudev-task-modal-title');
  const nameEl = vdEl('veaudev-task-name');
  const notesEl = vdEl('veaudev-task-notes');
  const saveBtn = vdEl('veaudev-task-save');
  const deleteBtn = vdEl('veaudev-task-delete');
  const backdrop = vdEl('veaudev-task-backdrop');
  const modal = vdEl('veaudev-task-modal');
  if (titleEl) titleEl.textContent = String(task.text || 'Task');
  if (nameEl) nameEl.value = String(task.text || '');
  if (notesEl) notesEl.value = String(task.notes || '');
  populateTaskAssigneeOptions(String(task.assigneeAccountId || '').trim(), String(task.assigneeName || '').trim());
  vdSetTaskPriority(String(task.priority || 'medium'));
  if (saveBtn) saveBtn.textContent = 'Save task';
  vdSetTaskFeedback('');
  if (task.isCustom) { if (deleteBtn) { deleteBtn.hidden = false; deleteBtn.dataset.taskId = String(task.id); } }
  else { if (deleteBtn) { deleteBtn.hidden = true; delete deleteBtn.dataset.taskId; } }
  if (backdrop) { backdrop.classList.add('is-open'); backdrop.setAttribute('aria-hidden', 'false'); }
  if (modal) { modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false'); }
  if (nameEl) nameEl.focus();
}

function vdOpenCreateTaskModal() {
  if (!vd.currentProjectId) return;
  vd.taskModalMode = 'create';
  vd.activeTaskId = null;
  const titleEl = vdEl('veaudev-task-modal-title');
  const nameEl = vdEl('veaudev-task-name');
  const notesEl = vdEl('veaudev-task-notes');
  const saveBtn = vdEl('veaudev-task-save');
  const deleteBtn = vdEl('veaudev-task-delete');
  const backdrop = vdEl('veaudev-task-backdrop');
  const modal = vdEl('veaudev-task-modal');
  if (titleEl) titleEl.textContent = 'New Task';
  if (nameEl) nameEl.value = '';
  if (notesEl) notesEl.value = '';
  populateTaskAssigneeOptions('', '');
  vdSetTaskPriority('medium');
  if (saveBtn) saveBtn.textContent = 'Create task';
  if (deleteBtn) { deleteBtn.hidden = true; delete deleteBtn.dataset.taskId; }
  vdSetTaskFeedback('');
  if (backdrop) { backdrop.classList.add('is-open'); backdrop.setAttribute('aria-hidden', 'false'); }
  if (modal) { modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false'); }
  if (nameEl) nameEl.focus();
}

function vdCloseDeleteProjectModal() {
  vd.pendingDeleteProjectId = null;
  const backdrop = vdEl('veaudev-delete-project-backdrop');
  const modal = vdEl('veaudev-delete-project-modal');
  if (backdrop) { backdrop.classList.remove('is-open'); backdrop.setAttribute('aria-hidden', 'true'); }
  if (modal) { modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true'); }
}

function vdOpenDeleteProjectModal(project) {
  const projectId = Number(project?.id || 0);
  if (!projectId) return;
  const projectName = String(project?.projectName || 'this project').trim() || 'this project';
  vd.pendingDeleteProjectId = projectId;
  const text = vdEl('veaudev-delete-project-text');
  const backdrop = vdEl('veaudev-delete-project-backdrop');
  const modal = vdEl('veaudev-delete-project-modal');
  if (text) text.textContent = `Are you sure you want to delete "${projectName}"? This will also delete all tasks for this project.`;
  if (backdrop) { backdrop.classList.add('is-open'); backdrop.setAttribute('aria-hidden', 'false'); }
  if (modal) { modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false'); }
}

function vdCloseModal() {
  const backdrop = vdEl('add-web-project-backdrop');
  const modal = vdEl('add-web-project-modal');
  if (backdrop) { backdrop.classList.remove('is-open'); backdrop.setAttribute('aria-hidden', 'true'); }
  if (modal) { modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true'); }
  document.body.classList.remove('veaudev-finder-open');
  vdResetModal();
}

function vdUpdateDeploySectionVisibility() {
  const deploySection = vdEl('veaudev-deploy-section');
  const deployModeChoices = vdEl('veaudev-deploy-mode-choices');
  const deploySectionTitle = vdEl('veaudev-deploy-section-title');
  const shouldShow = vd.selectedType === 'Webflow' || vd.selectedType === 'Custom' || vd.selectedType === 'Andere';

  if (!shouldShow) {
    if (deploySection) deploySection.hidden = true;
    if (deployModeChoices) deployModeChoices.hidden = true;
    if (deploySectionTitle) deploySectionTitle.textContent = '5) Login information';
    vdSetDeployMode('');
    vdClearDeployFields();
    return;
  }
  if (deploySection) deploySection.hidden = false;
  if (vd.selectedType === 'Webflow') {
    if (deploySectionTitle) deploySectionTitle.textContent = '5) Webflow login';
    if (deployModeChoices) deployModeChoices.hidden = true;
    vdSetDeployMode('webhosting');
    return;
  }
  if (deploySectionTitle) deploySectionTitle.textContent = '5) Login information';
  if (deployModeChoices) deployModeChoices.hidden = false;
  vdSetDeployMode(vd.selectedDeployMode);
}

function vdSetWebhostingMode(mode) {
  let safe = ['customLogin', 'otherLogin', 'other', 'personal'].includes(mode) ? mode : 'arno';
  if (['other', 'otherLogin'].includes(safe)) safe = 'customLogin';
  vd.selectedWebhostingMode = safe;

  const customFields = vdEl('veaudev-webhosting-custom-fields');
  const personalFields = vdEl('veaudev-webhosting-personal-fields');
  const whUsernameInput = vdEl('add-web-project-webhosting-username');
  const whPasswordInput = vdEl('add-web-project-webhosting-password');
  const whLinkInput = vdEl('add-web-project-webhosting-link');
  const whPersonalNotes = vdEl('add-web-project-webhosting-personal-notes');

  vdQA('.veaudev-webhosting-mode-btn').forEach(btn => {
    const isSel = (btn.dataset.webhostingMode || '') === safe;
    btn.classList.toggle('is-selected', isSel);
    btn.setAttribute('aria-pressed', isSel ? 'true' : 'false');
  });

  if (safe === 'customLogin') {
    if (customFields) customFields.hidden = false;
    if (personalFields) personalFields.hidden = true;
    if (whPersonalNotes) whPersonalNotes.value = '';
    return;
  }
  if (safe === 'personal') {
    if (personalFields) personalFields.hidden = false;
    if (customFields) customFields.hidden = true;
    if (whUsernameInput) whUsernameInput.value = '';
    if (whPasswordInput) whPasswordInput.value = '';
    if (whLinkInput) whLinkInput.value = '';
    return;
  }
  if (customFields) customFields.hidden = true;
  if (personalFields) personalFields.hidden = true;
  if (whUsernameInput) whUsernameInput.value = '';
  if (whPasswordInput) whPasswordInput.value = '';
  if (whLinkInput) whLinkInput.value = '';
  if (whPersonalNotes) whPersonalNotes.value = '';
}

function vdSetDeployMode(mode) {
  vd.selectedDeployMode = (mode === 'webhosting' || mode === 'filezilla') ? mode : '';
  const webhostingFields = vdEl('veaudev-webhosting-fields');
  const filezillaFields = vdEl('veaudev-filezilla-fields');
  const customFields = vdEl('veaudev-webhosting-custom-fields');
  const personalFields = vdEl('veaudev-webhosting-personal-fields');

  vdQA('.veaudev-deploy-mode-btn').forEach(btn => {
    const isSel = (btn.dataset.deployMode || '') === vd.selectedDeployMode;
    btn.classList.toggle('is-selected', isSel);
    btn.setAttribute('aria-pressed', isSel ? 'true' : 'false');
  });

  if (vd.selectedDeployMode === 'webhosting') {
    if (webhostingFields) webhostingFields.hidden = false;
    if (filezillaFields) filezillaFields.hidden = true;
    vdSetWebhostingMode(vd.selectedWebhostingMode);
    return;
  }
  if (vd.selectedDeployMode === 'filezilla') {
    if (filezillaFields) filezillaFields.hidden = false;
    if (webhostingFields) webhostingFields.hidden = true;
    if (customFields) customFields.hidden = true;
    if (personalFields) personalFields.hidden = true;
    return;
  }
  if (webhostingFields) webhostingFields.hidden = true;
  if (filezillaFields) filezillaFields.hidden = true;
  if (customFields) customFields.hidden = true;
  if (personalFields) personalFields.hidden = true;
}

function vdClearDeployFields() {
  ['add-web-project-webhosting-username', 'add-web-project-webhosting-password',
   'add-web-project-webhosting-link', 'add-web-project-webhosting-personal-notes',
   'add-web-project-deploy-host', 'add-web-project-deploy-username',
   'add-web-project-deploy-password', 'add-web-project-deploy-port'].forEach(id => {
    const el = vdEl(id); if (el) el.value = '';
  });
}

function vdResetModal() {
  const form = vdEl('add-web-project-form');
  const modalTitle = document.querySelector('#add-web-project-modal .modal-title');
  const andereInput = vdEl('awp-andere-input');
  if (form) form.reset();
  vd.selectedType = '';
  vd.selectedDeployMode = '';
  vd.selectedWebhostingMode = 'arno';
  vd.modalMode = 'create';
  vd.editingProjectId = null;
  if (modalTitle) modalTitle.textContent = 'Add Web Project';
  vdQA('#add-web-project-form .awp-build-type-btn').forEach(b => b.classList.remove('is-selected'));
  if (andereInput) { andereInput.style.display = 'none'; andereInput.value = ''; }
  vdUpdateDeploySectionVisibility();
  vdClearSelectedFiles();
  vdSetFeedback('');
}

function vdOpenModal() {
  vdResetModal();
  const backdrop = vdEl('add-web-project-backdrop');
  const modal = vdEl('add-web-project-modal');
  const nameInput = vdEl('add-web-project-name');
  if (backdrop) { backdrop.classList.add('is-open'); backdrop.setAttribute('aria-hidden', 'false'); }
  if (modal) { modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false'); }
  if (nameInput) nameInput.focus();
}

function vdGetSelectedFilesContainer(target) {
  return vdEl(target === 'archive' ? 'add-web-project-archive-files' : target === 'assets' ? 'add-web-project-assets-files' : 'add-web-project-design-files');
}

function vdRenderSelectedFiles(target) {
  const safe = ['design', 'archive', 'assets'].includes(String(target || '')) ? target : 'design';
  const container = vdGetSelectedFilesContainer(safe);
  if (!container) return;
  const file = vd.pendingFinderSelections[safe];
  if (!file?.path) { container.hidden = true; container.innerHTML = ''; return; }
  const fileName = String(file?.name || file?.path || 'Folder').trim() || 'Folder';
  const filePath = String(file?.path || '').trim();
  container.hidden = false;
  container.innerHTML = `<span class="veaudev-selected-file"><span class="veaudev-selected-file-name" title="${esc(fileName)}">${esc(fileName)}</span><button type="button" class="veaudev-selected-file-remove" data-remove-file-target="${esc(safe)}" data-remove-file="${esc(filePath)}" aria-label="Remove folder">×</button></span>`;
}

function vdRenderAllSelectedFiles() {
  vdRenderSelectedFiles('design'); vdRenderSelectedFiles('archive'); vdRenderSelectedFiles('assets');
}

function vdClearSelectedFiles() {
  vd.pendingFinderSelections = { design: null, archive: null, assets: null };
  vdRenderAllSelectedFiles();
}

function vdLoadProjects() {
  const list = vdEl('veau-dev-project-list');
  vdGet(VD_API, { action: 'list' }).then(payload => {
    if (!payload?.success) {
      if (list) list.innerHTML = `<li class="issue-empty">${esc(payload?.message || 'Unable to load projects.')}</li>`;
      return;
    }
    vd.projectsCache = Array.isArray(payload?.projects) ? payload.projects : [];
    filterProjects();
    vdSyncViewWithRoute();
  }).catch(err => {
    if (list) list.innerHTML = `<li class="issue-empty">${esc(err?.message || 'Unable to load projects.')}</li>`;
  });
}

function vdSyncViewWithRoute() {
  const routeName = getRouteProjectName();
  if (!routeName) { vdShowListView(); return; }
  const project = findProjectByName(routeName);
  if (!project) { vdShowListView(); return; }
  vdShowProjectDetail(project);
}

function vdUpdateTaskDoneState(taskId, isDone) {
  vdPost(VD_TASKS_API, { action: 'save_task_state', taskId: Number(taskId || 0), isDone: isDone ? 1 : 0 })
    .then(payload => {
      if (!payload?.success) { console.warn('Failed to update task state:', payload?.message); return; }
      vdReloadCurrentProjectTasks();
    }).catch(err => console.error('Failed to update task state:', err));
}

function vdCopyValue(btn, value) {
  const safe = String(value || '').trim();
  if (!safe || safe === '-') return;
  const reset = () => setTimeout(() => { btn.textContent = '📄'; }, 1500);
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(safe).then(() => { btn.textContent = 'Copied'; reset(); }).catch(() => {});
    return;
  }
  const input = document.createElement('input');
  input.type = 'text'; input.readOnly = true; input.value = safe;
  document.body.appendChild(input); input.select();
  try { document.execCommand('copy'); btn.textContent = 'Copied'; reset(); } catch {}
  finally { input.remove(); }
}

window.initVeauDevManagerPage = function initVeauDevManagerPage() {
  if (!vdEl('add-web-project-btn') || !vdEl('veau-dev-project-list')) return;

  if (!_vdInit) {
    _vdInit = true;
    vdUsers = Array.isArray(window.appState?.availableUsers) ? window.appState.availableUsers : [];

    // Project modal open/close
    vdEl('add-web-project-btn')?.addEventListener('click', vdOpenModal);
    vdEl('add-web-project-close')?.addEventListener('click', vdCloseModal);
    vdEl('add-web-project-backdrop')?.addEventListener('click', vdCloseModal);
    vdEl('add-web-project-cancel')?.addEventListener('click', vdCloseModal);

    // Build type buttons
    document.addEventListener('click', e => {
      const btn = e.target.closest('#add-web-project-form .awp-build-type-btn');
      if (!btn) return;
      const andereInput = vdEl('awp-andere-input');
      vdQA('#add-web-project-form .awp-build-type-btn').forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      vd.selectedType = String(btn.dataset.value || '');
      if (vd.selectedType === 'Andere') { if (andereInput) { andereInput.style.display = ''; andereInput.focus(); } }
      else { if (andereInput) { andereInput.style.display = 'none'; andereInput.value = ''; } }
      vdUpdateDeploySectionVisibility();
      vdSetFeedback('');
    });

    // Deploy mode buttons
    document.addEventListener('click', e => {
      const btn = e.target.closest('.veaudev-deploy-mode-btn');
      if (!btn) return;
      const mode = String(btn.dataset.deployMode || '').trim();
      if (mode) vdSetDeployMode(mode);
    });

    // Webhosting mode buttons
    document.addEventListener('click', e => {
      const btn = e.target.closest('.veaudev-webhosting-mode-btn');
      if (!btn) return;
      const mode = String(btn.dataset.webhostingMode || '').trim();
      if (mode) vdSetWebhostingMode(mode);
    });

    // Remove file buttons
    document.addEventListener('click', e => {
      const btn = e.target.closest('#add-web-project-form [data-remove-file-target]');
      if (!btn) return;
      const target = String(btn.dataset.removeFileTarget || '').trim();
      if (!['design', 'archive', 'assets'].includes(target)) return;
      vd.pendingFinderSelections[target] = null;
      vdRenderSelectedFiles(target);
    });

    // Finder open
    document.addEventListener('click', e => {
      const btn = e.target.closest('#add-web-project-form [data-folder-upload]');
      if (!btn) return;
      vd.activeFinderTarget = String(btn.dataset.folderTarget || '').trim() || 'design';
      const modal = vdEl('add-web-project-modal');
      if (modal?.classList.contains('is-open')) document.body.classList.add('veaudev-finder-open');
    });

    // Finder uploaded event
    document.addEventListener('onlineFinder:filesUploaded', e => {
      const files = Array.isArray(e?.detail?.files) ? e.detail.files : [];
      const folders = Array.isArray(e?.detail?.folders) ? e.detail.folders : [];
      const selMode = String(e?.detail?.selectionMode || '').trim().toLowerCase();
      document.body.classList.remove('veaudev-finder-open');
      const sel = selMode === 'folder'
        ? folders.find(f => String(f?.path || '').trim())
        : files.find(f => String(f?.path || '').trim());
      if (!sel) return;
      vd.pendingFinderSelections[vd.activeFinderTarget] = {
        path: String(sel.path || '').trim(),
        name: String(sel.name || '').trim(),
      };
      vdRenderSelectedFiles(vd.activeFinderTarget);
    });

    // Finder close
    document.addEventListener('click', e => {
      if (e.target.closest('#online-finder-close, #online-finder-backdrop')) {
        document.body.classList.remove('veaudev-finder-open');
      }
    });

    // Project form submit
    vdEl('add-web-project-form')?.addEventListener('submit', e => {
      e.preventDefault();
      const nameInput = vdEl('add-web-project-name');
      const andereInput = vdEl('awp-andere-input');
      const projectName = String(nameInput?.value || '').trim();
      if (!projectName) { vdSetFeedback('Please enter a project name.', 'error'); nameInput?.focus(); return; }
      if (!vd.selectedType) { vdSetFeedback("Please choose how you'd like to build this site.", 'error'); return; }
      let buildType = vd.selectedType;
      if (vd.selectedType === 'Andere') {
        const v = String(andereInput?.value || '').trim();
        if (!v) { vdSetFeedback('Please specify the build method.', 'error'); andereInput?.focus(); return; }
        buildType = v;
      }
      vdSetFeedback(vd.modalMode === 'edit' ? 'Saving changes…' : 'Saving…', 'success');
      const selDesign = vd.pendingFinderSelections.design;
      const selArchive = vd.pendingFinderSelections.archive;
      const selAssets = vd.pendingFinderSelections.assets;
      const whUsernameInput = vdEl('add-web-project-webhosting-username');
      const whPasswordInput = vdEl('add-web-project-webhosting-password');
      const whLinkInput = vdEl('add-web-project-webhosting-link');
      const whPersonalNotes = vdEl('add-web-project-webhosting-personal-notes');
      const deployHostInput = vdEl('add-web-project-deploy-host');
      const deployUsernameInput = vdEl('add-web-project-deploy-username');
      const deployPasswordInput = vdEl('add-web-project-deploy-password');
      const deployPortInput = vdEl('add-web-project-deploy-port');
      const designLinkInput = vdEl('design-link');
      const notesInput = vdEl('add-web-project-notes');
      const postData = {
        action: vd.modalMode === 'edit' ? 'update' : 'create',
        projectName, buildType,
        designFilePath: String(selDesign?.path || ''),
        designFileName: String(selDesign?.name || ''),
        archiveFolderPath: String(selArchive?.path || ''),
        archiveFolderName: String(selArchive?.name || ''),
        assetsFolderPath: String(selAssets?.path || ''),
        assetsFolderName: String(selAssets?.name || ''),
        designLink: String(designLinkInput?.value || '').trim(),
        projectNotes: String(notesInput?.value || '').trim(),
      };
      if (vd.selectedDeployMode === 'webhosting') {
        postData.deployHost = '';
        postData.deployUsername = vd.selectedWebhostingMode === 'customLogin' ? String(whUsernameInput?.value || '').trim() : '';
        postData.deployPassword = vd.selectedWebhostingMode === 'customLogin' ? String(whPasswordInput?.value || '').trim() : '';
        postData.webhostingLink = vd.selectedWebhostingMode === 'customLogin' ? String(whLinkInput?.value || '').trim() : '';
        postData.deployMode = 'webhosting';
        postData.webhostingMode = vd.selectedWebhostingMode;
        postData.webhostingPersonalNotes = vd.selectedWebhostingMode === 'personal' ? String(whPersonalNotes?.value || '').trim() : '';
        postData.deployPort = '';
      } else if (vd.selectedDeployMode === 'filezilla') {
        postData.deployHost = String(deployHostInput?.value || '').trim();
        postData.deployUsername = String(deployUsernameInput?.value || '').trim();
        postData.deployPassword = String(deployPasswordInput?.value || '').trim();
        postData.webhostingLink = '';
        postData.deployMode = 'filezilla';
        postData.webhostingMode = '';
        postData.webhostingPersonalNotes = '';
        postData.deployPort = String(deployPortInput?.value || '').trim();
      } else {
        postData.deployHost = ''; postData.deployUsername = ''; postData.deployPassword = '';
        postData.webhostingLink = ''; postData.deployMode = ''; postData.webhostingMode = '';
        postData.webhostingPersonalNotes = ''; postData.deployPort = '';
      }
      if (vd.modalMode === 'edit') postData.id = String(vd.editingProjectId || '');
      vdPost(VD_API, postData).then(payload => {
        if (!payload?.success) { vdSetFeedback(payload?.message || 'Unable to save project.', 'error'); return; }
        vdCloseModal(); vdLoadProjects();
      }).catch(err => vdSetFeedback(err?.message || 'Unable to save project.', 'error'));
    });

    // Project list click
    vdEl('veau-dev-project-list')?.addEventListener('click', e => {
      const card = e.target.closest('.veaudev-project-card');
      if (!card) return;
      const project = findProjectById(Number(card.dataset.projectId || 0));
      if (project) vdShowProjectDetail(project);
    });

    // Header back/edit buttons
    vdEl('veaudev-content-back-btn')?.addEventListener('click', vdShowListView);
    vdEl('veaudev-content-edit-btn')?.addEventListener('click', () => {
      const project = findProjectByName(getRouteProjectName());
      if (!project) return;
      vd.modalMode = 'edit';
      vd.editingProjectId = Number(project.id || 0);
      const modalTitle = document.querySelector('#add-web-project-modal .modal-title');
      const nameInput = vdEl('add-web-project-name');
      const andereInput = vdEl('awp-andere-input');
      const designLinkInput = vdEl('design-link');
      const deployHostInput = vdEl('add-web-project-deploy-host');
      const deployUsernameInput = vdEl('add-web-project-deploy-username');
      const deployPasswordInput = vdEl('add-web-project-deploy-password');
      const deployPortInput = vdEl('add-web-project-deploy-port');
      const whUsernameInput = vdEl('add-web-project-webhosting-username');
      const whPasswordInput = vdEl('add-web-project-webhosting-password');
      const whLinkInput = vdEl('add-web-project-webhosting-link');
      const whPersonalNotes = vdEl('add-web-project-webhosting-personal-notes');
      const notesInput = vdEl('add-web-project-notes');
      if (modalTitle) modalTitle.textContent = 'Edit Web Project';
      if (nameInput) nameInput.value = String(project.projectName || '');
      vdQA('#add-web-project-form .awp-build-type-btn').forEach(b => b.classList.remove('is-selected'));
      const buildType = String(project.buildType || '').trim();
      const presetBtn = document.querySelector(`#add-web-project-form .awp-build-type-btn[data-value="${buildType}"]`);
      if (presetBtn) {
        vd.selectedType = buildType;
        presetBtn.classList.add('is-selected');
        if (andereInput) { andereInput.style.display = 'none'; andereInput.value = ''; }
      } else if (buildType) {
        vd.selectedType = 'Andere';
        const andereBtn = document.querySelector('#add-web-project-form .awp-build-type-btn[data-value="Andere"]');
        if (andereBtn) andereBtn.classList.add('is-selected');
        if (andereInput) { andereInput.style.display = ''; andereInput.value = buildType; }
      } else {
        vd.selectedType = '';
        if (andereInput) { andereInput.style.display = 'none'; andereInput.value = ''; }
      }
      const pFilePath = String(project.designFilePath || '').trim();
      const pFileName = String(project.designFileName || '').trim();
      const archivePath = String(project.archiveFolderPath || '').trim();
      const archiveName = String(project.archiveFolderName || '').trim();
      const assetsPath = String(project.assetsFolderPath || '').trim();
      const assetsName = String(project.assetsFolderName || '').trim();
      vd.pendingFinderSelections = {
        design: pFilePath ? { path: pFilePath, name: pFileName || pFilePath.split('/').pop() || 'Folder' } : null,
        archive: archivePath ? { path: archivePath, name: archiveName || archivePath.split('/').pop() || 'Folder' } : null,
        assets: assetsPath ? { path: assetsPath, name: assetsName || assetsPath.split('/').pop() || 'Folder' } : null,
      };
      if (designLinkInput) designLinkInput.value = String(project.designLink || '').trim();
      if (deployHostInput) deployHostInput.value = String(project.deployHost || '').trim();
      if (deployUsernameInput) deployUsernameInput.value = String(project.deployUsername || '').trim();
      if (deployPasswordInput) deployPasswordInput.value = String(project.deployPassword || '').trim();
      if (deployPortInput) deployPortInput.value = String(project.deployPort || '').trim();
      if (whUsernameInput) whUsernameInput.value = String(project.deployUsername || '').trim();
      if (whPasswordInput) whPasswordInput.value = String(project.deployPassword || '').trim();
      if (whLinkInput) whLinkInput.value = String(project.webhostingLink || '').trim();
      if (whPersonalNotes) whPersonalNotes.value = String(project.webhostingPersonalNotes || '').trim();
      vd.selectedDeployMode = String(project.deployMode || '').trim() ||
        (String(project.deployHost || '').trim() ? 'filezilla' :
         ((String(project.deployUsername || '').trim() || String(project.deployPassword || '').trim()) ? 'webhosting' : ''));
      vd.selectedWebhostingMode = String(project.webhostingMode || '').trim() ||
        ((vd.selectedDeployMode === 'webhosting' && String(project.webhostingPersonalNotes || '').trim()) ? 'personal' :
         ((vd.selectedDeployMode === 'webhosting' && (String(project.deployUsername || '').trim() || String(project.deployPassword || '').trim())) ? 'customLogin' : 'arno'));
      vdUpdateDeploySectionVisibility();
      if (notesInput) notesInput.value = String(project.projectNotes || '').trim();
      vdRenderAllSelectedFiles();
      const backdrop = vdEl('add-web-project-backdrop');
      const modal = vdEl('add-web-project-modal');
      if (backdrop) { backdrop.classList.add('is-open'); backdrop.setAttribute('aria-hidden', 'false'); }
      if (modal) { modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false'); }
      vdSetFeedback('');
    });

    // Delete project
    vdEl('veaudev-delete-project-btn')?.addEventListener('click', () => {
      const project = findProjectById(vd.currentProjectId);
      if (project) vdOpenDeleteProjectModal(project);
    });
    vdEl('veaudev-delete-project-close')?.addEventListener('click', vdCloseDeleteProjectModal);
    vdEl('veaudev-delete-project-cancel')?.addEventListener('click', vdCloseDeleteProjectModal);
    vdEl('veaudev-delete-project-backdrop')?.addEventListener('click', vdCloseDeleteProjectModal);
    vdEl('veaudev-delete-project-confirm')?.addEventListener('click', () => {
      const id = Number(vd.pendingDeleteProjectId || 0);
      if (!id) return;
      vdPost(VD_API, { action: 'delete', id }).then(payload => {
        if (!payload?.success) { window.alert(payload?.message || 'Unable to delete project.'); return; }
        vdCloseDeleteProjectModal(); vdShowListView(); vdLoadProjects();
      }).catch(err => window.alert(err?.message || 'Unable to delete project.'));
    });

    // Finder buttons in detail view
    document.addEventListener('click', e => {
      const btn = e.target.closest('#veaudev-project-open-finder-btn, #veaudev-project-open-archive-btn, #veaudev-project-open-assets-btn');
      if (!btn) return;
      const filePath = String(btn.dataset.filePath || '').trim();
      if (!filePath || typeof window.openVeauFinderPath !== 'function') return;
      window.openVeauFinderPath(filePath);
    });

    document.addEventListener('click', e => {
      const btn = e.target.closest('#veaudev-project-open-link-btn, #veaudev-project-open-login-link');
      if (!btn) return;
      const rawLink = String(btn.dataset.linkUrl || '').trim();
      if (!rawLink) return;
      const url = /^https?:\/\//i.test(rawLink) ? rawLink : `https://${rawLink}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    });

    // Search + filters
    vdEl('veaudev-project-search')?.addEventListener('input', filterProjects);

    vdEl('filter-button-date')?.addEventListener('click', e => {
      e.stopPropagation();
      const menu = vdEl('veaudev-date-filter-menu');
      if (menu?.classList.contains('is-open')) { vdCloseDateFilterMenu(); return; }
      vdOpenDateFilterMenu();
    });

    vdEl('veaudev-date-filter-menu')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-sort-order]');
      if (!btn) return;
      const next = String(btn.dataset.sortOrder || '').trim();
      if (!next || next === vd.projectSortOrder) { vdCloseDateFilterMenu(); return; }
      vd.projectSortOrder = next === 'oldest' ? 'oldest' : 'newest';
      vdCloseDateFilterMenu(); updateDateFilterButtonLabel(); filterProjects();
    });

    document.addEventListener('click', e => {
      const dateFilterWrap = document.querySelector('.veaudev-date-filter:not(.veaudev-task-filter)');
      if (!vdEl('veaudev-date-filter-menu')?.classList.contains('is-open')) return;
      if (dateFilterWrap && dateFilterWrap.contains(e.target)) return;
      vdCloseDateFilterMenu();
    });

    document.addEventListener('click', e => {
      if (!vdEl('veaudev-task-filter-assignee-menu')?.classList.contains('is-open')) return;
      if (e.target.closest('.veaudev-task-filter')) return;
      closeTaskAssigneeFilterMenu();
    });

    document.addEventListener('click', e => {
      if (!vdEl('veaudev-task-filter-priority-menu')?.classList.contains('is-open')) return;
      if (e.target.closest('.veaudev-task-filter')) return;
      closeTaskPriorityFilterMenu();
    });

    document.addEventListener('click', e => {
      if (!vdEl('veaudev-task-assignee-picker')?.classList.contains('is-open')) return;
      if (e.target.closest('#veaudev-task-assignee-picker')) return;
      closeTaskAssigneeMenu();
    });

    vdQA('.filter-button-webprojects-type').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = String(btn.id || '').trim().toLowerCase();
        const next = id.replace('filter-button-type-', '') || 'all';
        vd.projectTypeFilter = ['all', 'webflow', 'custom', 'other'].includes(next) ? next : 'all';
        updateTypeFilterButtons(); filterProjects();
      });
    });

    vdEl('veaudev-task-filter-assignee-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      const menu = vdEl('veaudev-task-filter-assignee-menu');
      if (menu?.classList.contains('is-open')) { closeTaskAssigneeFilterMenu(); return; }
      openTaskAssigneeFilterMenu();
    });

    vdEl('veaudev-task-filter-assignee-menu')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-task-assignee-filter]');
      if (!btn) return;
      vd.taskAssigneeFilter = String(btn.dataset.taskAssigneeFilter || '').trim();
      closeTaskAssigneeFilterMenu(); updateTaskAssigneeFilterButtonLabel(); vdReloadCurrentProjectTasks();
    });

    vdEl('veaudev-task-filter-priority-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      const menu = vdEl('veaudev-task-filter-priority-menu');
      if (menu?.classList.contains('is-open')) { closeTaskPriorityFilterMenu(); return; }
      openTaskPriorityFilterMenu();
    });

    vdEl('veaudev-task-filter-priority-menu')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-task-priority-filter]');
      if (!btn) return;
      vd.taskPriorityFilter = String(btn.dataset.taskPriorityFilter || '').trim().toLowerCase();
      closeTaskPriorityFilterMenu(); updateTaskPriorityFilterButtonLabel(); vdReloadCurrentProjectTasks();
    });

    // Task modal
    vdEl('veaudev-task-close')?.addEventListener('click', vdCloseTaskModal);
    vdEl('veaudev-task-cancel')?.addEventListener('click', vdCloseTaskModal);
    vdEl('veaudev-task-backdrop')?.addEventListener('click', vdCloseTaskModal);
    vdEl('veaudev-add-custom-task-btn')?.addEventListener('click', vdOpenCreateTaskModal);

    vdEl('veaudev-task-assignee-btn')?.addEventListener('click', () => {
      const picker = vdEl('veaudev-task-assignee-picker');
      const btn = vdEl('veaudev-task-assignee-btn');
      const willOpen = !picker?.classList.contains('is-open');
      if (picker) picker.classList.toggle('is-open', willOpen);
      if (btn) btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    });

    vdEl('veaudev-task-assignee-menu')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-assignee-account-id]');
      if (!btn) return;
      const accountId = String(btn.dataset.assigneeAccountId || '').trim();
      const displayName = String(btn.dataset.assigneeName || '').trim();
      const avatarUrl = String(btn.dataset.assigneeAvatarUrl || '').trim();
      vdSetTaskAssigneeSelection({ accountId, displayName, avatarUrl });
      vdEl('veaudev-task-assignee-menu')?.querySelectorAll('[data-assignee-account-id]').forEach(b => {
        b.classList.remove('is-selected'); b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('is-selected'); btn.setAttribute('aria-selected', 'true');
      closeTaskAssigneeMenu();
    });

    document.addEventListener('click', e => {
      const btn = e.target.closest('.veaudev-task-priority-btn');
      if (!btn) return;
      const next = String(btn.dataset.taskPriority || '').trim();
      if (next) vdSetTaskPriority(next);
    });

    vdEl('veaudev-task-form')?.addEventListener('submit', e => {
      e.preventDefault();
      const nameEl = vdEl('veaudev-task-name');
      const notesEl = vdEl('veaudev-task-notes');
      const assigneeEl = vdEl('veaudev-task-assignee');
      const priorityEl = vdEl('veaudev-task-priority');
      const taskName = String(nameEl?.value || '').trim();
      const assigneeAccountId = String(assigneeEl?.value || '').trim();
      const assigneeName = assigneeAccountId ? String(assigneeEl?.dataset.assigneeName || '').trim() : '';
      const priority = String(priorityEl?.value || 'medium').trim().toLowerCase();
      if (!taskName) { vdSetTaskFeedback('Task name is required.', 'error'); nameEl?.focus(); return; }
      vdSetTaskFeedback('Saving task…', 'success');
      const data = vd.taskModalMode === 'create'
        ? { action: 'create_task', projectId: vd.currentProjectId, taskName, taskNotes: String(notesEl?.value || '').trim(), assigneeAccountId, assigneeName, priority }
        : { action: 'update_task', taskId: vd.activeTaskId, taskName, taskNotes: String(notesEl?.value || '').trim(), assigneeAccountId, assigneeName, priority };
      if (vd.taskModalMode === 'edit' && !vd.activeTaskId) return;
      vdPost(VD_TASKS_API, data).then(payload => {
        if (!payload?.success) { vdSetTaskFeedback(payload?.message || 'Unable to save task.', 'error'); return; }
        vdCloseTaskModal(); vdReloadCurrentProjectTasks();
      }).catch(err => vdSetTaskFeedback(err?.message || 'Unable to save task.', 'error'));
    });

    vdEl('veaudev-task-delete')?.addEventListener('click', function () {
      const taskId = Number(this.dataset.taskId || 0);
      if (!taskId) return;
      vdPost(VD_TASKS_API, { action: 'delete_task', taskId }).then(payload => {
        if (!payload?.success) { vdSetTaskFeedback(payload?.message || 'Unable to delete task.', 'error'); return; }
        vdCloseTaskModal(); vdReloadCurrentProjectTasks();
      }).catch(err => vdSetTaskFeedback(err?.message || 'Unable to delete task.', 'error'));
    });

    // Task card click
    document.addEventListener('click', e => {
      const card = e.target.closest('.veaudev-task-card');
      if (!card) return;
      const taskId = Number(card.dataset.taskId || 0);
      if (taskId) vdOpenTaskModal(taskId);
    });

    // Drag-and-drop tasks
    document.addEventListener('dragstart', e => {
      const card = e.target.closest('.veaudev-task-card');
      if (!card) return;
      const taskId = Number(card.dataset.taskId || 0);
      if (!taskId) return;
      vd.draggedTaskId = taskId;
      card.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(taskId));
    });

    document.addEventListener('dragend', e => {
      const card = e.target.closest('.veaudev-task-card');
      vd.draggedTaskId = null;
      vdQA('.veaudev-task-card').forEach(c => c.classList.remove('is-dragging'));
      vdQA('.veaudev-build-task-list').forEach(l => l.classList.remove('is-drop-target'));
    });

    document.addEventListener('dragover', e => {
      const col = e.target.closest('.veaudev-task-column');
      if (!col) return;
      e.preventDefault();
      col.classList.add('is-drop-target');
      e.dataTransfer.dropEffect = 'move';
    });

    document.addEventListener('dragleave', e => {
      const col = e.target.closest('.veaudev-task-column');
      if (!col) return;
      if (col.contains(e.relatedTarget)) return;
      col.classList.remove('is-drop-target');
    });

    document.addEventListener('drop', e => {
      const col = e.target.closest('.veaudev-task-column');
      if (!col) return;
      e.preventDefault();
      col.classList.remove('is-drop-target');
      const taskId = Number(vd.draggedTaskId || e.dataTransfer.getData('text/plain') || 0);
      const targetState = String(col.dataset.dropState || 'pending');
      const targetKind = String(col.dataset.dropKind || '');
      const task = findTaskById(taskId);
      if (!task) return;
      const taskKind = task.isCustom ? 'custom' : 'default';
      if (targetState === 'pending' && targetKind !== taskKind) return;
      const nextIsDone = targetState === 'done';
      if (Boolean(task.isDone) === nextIsDone) return;
      vdUpdateTaskDoneState(taskId, nextIsDone);
    });

    // Copy buttons (veaudev detail view)
    document.addEventListener('click', e => {
      const btn = e.target.closest('#veaudev-project-detail-view .veaudev-copy-btn, #veau-dev-manager-section .veaudev-copy-btn');
      if (!btn || btn.disabled) return;
      const targetSel = String(btn.dataset.copyTarget || '').trim();
      if (!targetSel) return;
      const target = document.querySelector(targetSel);
      if (!target) return;
      const copyPassword = btn.dataset.copyPassword === 'true';
      const value = copyPassword ? String(target.dataset.password || '').trim() : String(target.textContent || '').trim();
      if (!value || value === '-') return;
      vdCopyValue(btn, value);
    });

    // Keyboard
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      const modal = vdEl('add-web-project-modal');
      const taskModal = vdEl('veaudev-task-modal');
      const deleteModal = vdEl('veaudev-delete-project-modal');
      const dateMenu = vdEl('veaudev-date-filter-menu');
      const priorityMenu = vdEl('veaudev-task-filter-priority-menu');
      const assigneeMenu = vdEl('veaudev-task-filter-assignee-menu');
      const assigneePicker = vdEl('veaudev-task-assignee-picker');
      if (modal?.classList.contains('is-open')) { vdCloseModal(); return; }
      if (taskModal?.classList.contains('is-open')) {
        if (assigneePicker?.classList.contains('is-open')) { closeTaskAssigneeMenu(); return; }
        vdCloseTaskModal(); return;
      }
      if (deleteModal?.classList.contains('is-open')) { vdCloseDeleteProjectModal(); return; }
      if (dateMenu?.classList.contains('is-open')) { vdCloseDateFilterMenu(); return; }
      if (priorityMenu?.classList.contains('is-open')) { closeTaskPriorityFilterMenu(); return; }
      if (assigneeMenu?.classList.contains('is-open')) { closeTaskAssigneeFilterMenu(); }
    });

    window.addEventListener('hashchange', vdSyncViewWithRoute);
  }

  // Always on init: reset filters, load
  vdCloseDateFilterMenu();
  updateDateFilterButtonLabel();
  closeTaskAssigneeFilterMenu();
  closeTaskPriorityFilterMenu();
  buildTaskAssigneeFilterMenu();
  updateTaskAssigneeFilterButtonLabel();
  updateTaskPriorityFilterButtonLabel();
  updateTypeFilterButtons();
  vdLoadProjects();
};
