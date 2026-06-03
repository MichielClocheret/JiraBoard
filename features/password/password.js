'use strict';

let _pmInit = false;
const pm = {
  selectedEntryType: '', selectedFilterType: 'all',
  projectsCache: [], selectedProjectId: 0,
  modalMode: 'create', pendingDeleteProjectId: 0,
};

const PM_API = './features/password/password_manager.php';

function pmSetFeedback(message, type) {
  const el = vdEl('add-password-project-feedback');
  if (!el) return;
  if (!message) { el.hidden = true; el.className = 'chat-feedback'; el.textContent = ''; return; }
  el.hidden = false;
  el.className = 'chat-feedback' + (type === 'error' ? ' error' : ' success');
  el.textContent = message;
}

function pmSetFilterType(filterType) {
  pm.selectedFilterType = ['all', 'licence', 'login'].includes(String(filterType || '').trim()) ? String(filterType).trim() : 'all';
  vdQA('.password-manager-filter-btn').forEach(btn => {
    const isSel = (btn.dataset.passwordFilter || '') === pm.selectedFilterType;
    btn.classList.toggle('is-selected', isSel);
    btn.setAttribute('aria-pressed', isSel ? 'true' : 'false');
  });
}

function pmSetEntryType(entryType) {
  pm.selectedEntryType = ['login', 'licence'].includes(String(entryType || '').trim()) ? String(entryType).trim() : '';
  vdQA('.password-entry-type-btn').forEach(btn => {
    const isSel = (btn.dataset.entryType || '') === pm.selectedEntryType;
    btn.classList.toggle('is-selected', isSel);
    btn.setAttribute('aria-pressed', isSel ? 'true' : 'false');
  });
  const loginFields = vdEl('password-entry-login-fields');
  const licenceFields = vdEl('password-entry-licence-fields');
  const usernameInput = vdEl('add-password-project-username');
  const passwordInput = vdEl('add-password-project-password');
  const licenceInput = vdEl('add-password-project-licence');
  if (pm.selectedEntryType === 'login') {
    if (loginFields) loginFields.hidden = false;
    if (licenceFields) licenceFields.hidden = true;
    if (licenceInput) licenceInput.value = '';
    return;
  }
  if (pm.selectedEntryType === 'licence') {
    if (licenceFields) licenceFields.hidden = false;
    if (loginFields) loginFields.hidden = true;
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';
    return;
  }
  if (loginFields) loginFields.hidden = true;
  if (licenceFields) licenceFields.hidden = true;
  if (usernameInput) usernameInput.value = '';
  if (passwordInput) passwordInput.value = '';
  if (licenceInput) licenceInput.value = '';
}

function pmSyncModalUi() {
  const isEdit = pm.modalMode === 'edit';
  const titleEl = vdEl('password-manager-modal-title');
  const deleteBtn = vdEl('add-password-project-delete');
  const saveBtn = vdEl('add-password-project-save');
  if (titleEl) titleEl.textContent = isEdit ? 'Edit Password Project' : 'Add Password Project';
  if (deleteBtn) deleteBtn.hidden = !isEdit;
  if (saveBtn) saveBtn.textContent = isEdit ? 'Save changes' : 'Save';
}

function pmCloseModal() {
  const backdrop = vdEl('add-password-project-backdrop');
  const modal = vdEl('add-password-project-modal');
  const form = vdEl('add-password-project-form');
  if (backdrop) { backdrop.classList.remove('is-open'); backdrop.setAttribute('aria-hidden', 'true'); }
  if (modal) { modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true'); }
  if (form) form.reset();
  pm.modalMode = 'create';
  pmSetEntryType('');
  pmSetFeedback('');
  pmSyncModalUi();
}

function pmCloseDeleteModal() {
  pm.pendingDeleteProjectId = 0;
  const confirmBtn = vdEl('password-delete-project-confirm');
  const text = vdEl('password-delete-project-text');
  const backdrop = vdEl('password-delete-project-backdrop');
  const modal = vdEl('password-delete-project-modal');
  if (confirmBtn) confirmBtn.textContent = 'Delete project';
  if (text) text.textContent = 'Are you sure you want to delete this project?';
  if (backdrop) { backdrop.classList.remove('is-open'); backdrop.setAttribute('aria-hidden', 'true'); }
  if (modal) { modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true'); }
}

function pmOpenDeleteModal(project) {
  const id = Number(project?.id || 0);
  if (!id) return;
  const name = String(project?.projectName || 'this password project').trim() || 'this password project';
  pm.pendingDeleteProjectId = id;
  const text = vdEl('password-delete-project-text');
  const confirmBtn = vdEl('password-delete-project-confirm');
  const backdrop = vdEl('password-delete-project-backdrop');
  const modal = vdEl('password-delete-project-modal');
  if (text) text.textContent = `Are you sure you want to delete "${name}"?`;
  if (confirmBtn) confirmBtn.textContent = 'Delete password';
  if (backdrop) { backdrop.classList.add('is-open'); backdrop.setAttribute('aria-hidden', 'false'); }
  if (modal) { modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false'); }
}

function pmOpenModal(project) {
  const item = project && typeof project === 'object' ? project : null;
  pm.modalMode = item ? 'edit' : 'create';
  const form = vdEl('add-password-project-form');
  const nameInput = vdEl('add-password-project-name');
  const usernameInput = vdEl('add-password-project-username');
  const passwordInput = vdEl('add-password-project-password');
  const licenceInput = vdEl('add-password-project-licence');
  if (form) form.reset();
  pmSetFeedback('');
  if (item) {
    if (nameInput) nameInput.value = String(item.projectName || '').trim();
    pmSetEntryType(String(item.entryType || '').trim());
    if (usernameInput) usernameInput.value = String(item.loginUsername || '').trim();
    if (passwordInput) passwordInput.value = String(item.loginPassword || '').trim();
    if (licenceInput) licenceInput.value = String(item.licenceKey || '').trim();
  } else {
    pmSetEntryType('');
  }
  pmSyncModalUi();
  const backdrop = vdEl('add-password-project-backdrop');
  const modal = vdEl('add-password-project-modal');
  if (backdrop) { backdrop.classList.add('is-open'); backdrop.setAttribute('aria-hidden', 'false'); }
  if (modal) { modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false'); }
  if (nameInput) nameInput.focus();
}

function pmGetEntryTypeName(entryType) {
  return String(entryType || '').trim().toLowerCase() === 'licence' ? 'Licence' : 'Login';
}

function pmGetEntryTypeEmoji(entryType) {
  return String(entryType || '').trim().toLowerCase() === 'licence' ? '🔑' : '👤';
}

function pmRenderPasswordValue(value) {
  const el = vdEl('password-project-password');
  const safe = String(value || '').trim();
  if (el) { el.dataset.password = safe; el.textContent = safe || '-'; }
}

function pmFindProjectById(id) {
  return pm.projectsCache.find(p => Number(p?.id || 0) === Number(id)) || null;
}

function pmResetPageHeader() {
  const titleEl = vdEl('page-title');
  const subtitleEl = vdEl('page-subtitle');
  const emojiEl = vdEl('password-manager-page-emoji');
  if (titleEl) titleEl.textContent = 'Password Manager';
  if (subtitleEl) { subtitleEl.textContent = ''; subtitleEl.hidden = true; }
  if (emojiEl) { emojiEl.textContent = ''; emojiEl.hidden = true; }
}

function pmSetPageHeader(projectName, entryType) {
  const titleEl = vdEl('page-title');
  const subtitleEl = vdEl('page-subtitle');
  const emojiEl = vdEl('password-manager-page-emoji');
  if (titleEl) titleEl.textContent = String(projectName || '').trim() || 'Password Manager';
  if (subtitleEl) { subtitleEl.textContent = pmGetEntryTypeName(entryType); subtitleEl.hidden = false; }
  if (emojiEl) { emojiEl.textContent = pmGetEntryTypeEmoji(entryType); emojiEl.hidden = false; }
}

function pmShowListView() {
  pm.selectedProjectId = 0;
  const listView = vdEl('password-manager-projects-view');
  const detailView = vdEl('password-manager-detail-view');
  const backBtn = vdEl('password-manager-back-btn');
  const editBtn = vdEl('password-manager-edit-btn');
  if (listView) listView.hidden = false;
  if (detailView) detailView.hidden = true;
  if (backBtn) backBtn.hidden = true;
  if (editBtn) editBtn.hidden = true;
  pmResetPageHeader();
  const entryType = vdEl('password-project-entry-type');
  const username = vdEl('password-project-username');
  const licence = vdEl('password-project-licence');
  if (entryType) entryType.textContent = '';
  if (username) username.textContent = '-';
  if (licence) licence.textContent = '-';
  pmRenderPasswordValue('');
  vdQA('.veaudev-copy-btn[data-copy-target="#password-project-username"]').forEach(b => { b.disabled = true; });
  vdQA('.veaudev-copy-btn[data-copy-target="#password-project-password"]').forEach(b => { b.disabled = true; });
  vdQA('.veaudev-copy-btn[data-copy-target="#password-project-licence"]').forEach(b => { b.disabled = true; });
  ['#password-project-username', '#password-project-password', '#password-project-licence'].forEach(sel => {
    const el = document.querySelector(sel);
    if (el) { const row = el.closest('.veaudev-login-row'); if (row) row.hidden = true; }
  });
}

function pmShowDetailView(project) {
  if (!project) return;
  pm.selectedProjectId = Number(project.id || 0);
  const entryType = String(project.entryType || '').trim().toLowerCase();
  const username = String(project.loginUsername || '').trim();
  const password = String(project.loginPassword || '').trim();
  const licence = String(project.licenceKey || '').trim();

  pmSetPageHeader(String(project.projectName || '').trim(), entryType);
  const entryTypeEl = vdEl('password-project-entry-type');
  const usernameEl = vdEl('password-project-username');
  const licenceEl = vdEl('password-project-licence');
  if (entryTypeEl) entryTypeEl.textContent = `${pmGetEntryTypeEmoji(entryType)} ${pmGetEntryTypeName(entryType)}`;
  if (usernameEl) usernameEl.textContent = username;
  if (licenceEl) licenceEl.textContent = licence;
  pmRenderPasswordValue(password);

  ['#password-project-username', '#password-project-password', '#password-project-licence'].forEach(sel => {
    const el = document.querySelector(sel); if (!el) return;
    const row = el.closest('.veaudev-login-row'); if (!row) return;
    const hasVal = sel === '#password-project-username' ? !!username : sel === '#password-project-password' ? !!password : !!licence;
    row.hidden = !hasVal;
  });
  vdQA('.veaudev-copy-btn[data-copy-target="#password-project-username"]').forEach(b => { b.disabled = !username; });
  vdQA('.veaudev-copy-btn[data-copy-target="#password-project-password"]').forEach(b => { b.disabled = !password; });
  vdQA('.veaudev-copy-btn[data-copy-target="#password-project-licence"]').forEach(b => { b.disabled = !licence; });

  const listView = vdEl('password-manager-projects-view');
  const detailView = vdEl('password-manager-detail-view');
  const backBtn = vdEl('password-manager-back-btn');
  const editBtn = vdEl('password-manager-edit-btn');
  if (listView) listView.hidden = true;
  if (detailView) detailView.hidden = false;
  if (backBtn) backBtn.hidden = false;
  if (editBtn) editBtn.hidden = false;
}

function pmRenderProjects(projects) {
  const list = vdEl('password-project-list');
  if (!list) return;
  const items = Array.isArray(projects) ? projects : [];
  if (!items.length) { list.innerHTML = '<li class="issue-empty">No password projects yet.</li>'; return; }
  list.innerHTML = items.map(p => {
    const id = Number(p?.id || 0);
    const name = String(p?.projectName || '').trim();
    const et = String(p?.entryType || '').trim();
    return `<li class="veaudev-project-card password-project-card" data-project-id="${id}" data-project-name="${esc(name)}">`
      + '<div class="veaudev-project-card-main">'
      + `<div class="veaudev-project-card-top"><span class="veaudev-project-card-name">${esc(name)}</span><span class="password-project-type-badge" aria-label="${esc(pmGetEntryTypeName(et))}">${esc(pmGetEntryTypeEmoji(et))}</span></div>`
      + '</div></li>';
  }).join('');
}

function pmFilterProjects() {
  const search = vdEl('password-project-search');
  const query = String(search?.value || '').trim().toLowerCase();
  const filtered = pm.projectsCache.filter(p => {
    const name = String(p?.projectName || '').trim().toLowerCase();
    const type = String(p?.entryType || '').trim().toLowerCase();
    return (!query || name.includes(query) || type.includes(query)) &&
      (pm.selectedFilterType === 'all' || type === pm.selectedFilterType);
  });
  pmRenderProjects(filtered);
}

function pmLoadProjects() {
  vdGet(PM_API, { action: 'list' }).then(payload => {
    if (!payload?.success) {
      const list = vdEl('password-project-list');
      if (list) list.innerHTML = `<li class="issue-empty">${esc(payload?.message || 'Unable to load password projects.')}</li>`;
      return;
    }
    pm.projectsCache = Array.isArray(payload?.projects) ? payload.projects : [];
    pmFilterProjects();
    if (pm.selectedProjectId > 0) {
      const p = pmFindProjectById(pm.selectedProjectId);
      if (p) pmShowDetailView(p); else pmShowListView();
    }
  }).catch(err => {
    const list = vdEl('password-project-list');
    if (list) list.innerHTML = `<li class="issue-empty">${esc(err?.message || 'Unable to load password projects.')}</li>`;
  });
}

function pmCopyValue(btn, value) {
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

window.initPasswordManagerPage = function initPasswordManagerPage() {
  if (!vdEl('add-password-project-btn') || !vdEl('password-project-list')) return;

  if (!_pmInit) {
    _pmInit = true;

    vdEl('add-password-project-btn')?.addEventListener('click', () => pmOpenModal());
    vdEl('add-password-project-close')?.addEventListener('click', pmCloseModal);
    vdEl('add-password-project-cancel')?.addEventListener('click', pmCloseModal);
    vdEl('add-password-project-backdrop')?.addEventListener('click', pmCloseModal);

    vdEl('password-manager-back-btn')?.addEventListener('click', pmShowListView);
    vdEl('password-manager-edit-btn')?.addEventListener('click', () => {
      const p = pmFindProjectById(pm.selectedProjectId);
      if (p) pmOpenModal(p);
    });

    vdEl('add-password-project-delete')?.addEventListener('click', () => {
      if (pm.modalMode !== 'edit' || pm.selectedProjectId <= 0) return;
      const p = pmFindProjectById(pm.selectedProjectId);
      if (!p) return;
      pmCloseModal();
      pmOpenDeleteModal(p);
    });

    vdEl('password-delete-project-close')?.addEventListener('click', pmCloseDeleteModal);
    vdEl('password-delete-project-cancel')?.addEventListener('click', pmCloseDeleteModal);
    vdEl('password-delete-project-backdrop')?.addEventListener('click', pmCloseDeleteModal);
    vdEl('password-delete-project-confirm')?.addEventListener('click', () => {
      if (pm.pendingDeleteProjectId <= 0) return;
      vdPost(PM_API, { action: 'delete', id: pm.pendingDeleteProjectId }).then(payload => {
        if (!payload?.success) { pmCloseDeleteModal(); pmSetFeedback(payload?.message || 'Unable to delete.', 'error'); return; }
        pmCloseDeleteModal(); pmShowListView(); pmLoadProjects();
      }).catch(err => { pmCloseDeleteModal(); pmSetFeedback(err?.message || 'Unable to delete.', 'error'); });
    });

    vdEl('password-project-search')?.addEventListener('input', pmFilterProjects);

    vdQA('.password-manager-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        pmSetFilterType(String(btn.dataset.passwordFilter || '').trim());
        pmFilterProjects();
      });
    });

    vdEl('password-project-list')?.addEventListener('click', e => {
      const card = e.target.closest('.password-project-card');
      if (!card) return;
      const p = pmFindProjectById(Number(card.dataset.projectId || 0));
      if (p) pmShowDetailView(p);
    });

    document.addEventListener('click', e => {
      const btn = e.target.closest('#password-manager-detail-view .veaudev-copy-btn');
      if (!btn || btn.disabled) return;
      const targetSel = String(btn.dataset.copyTarget || '').trim();
      if (!targetSel) return;
      const target = document.querySelector(targetSel);
      if (!target) return;
      const copyPassword = btn.dataset.copyPassword === 'true';
      pmCopyValue(btn, copyPassword ? String(target.dataset.password || '') : String(target.textContent || ''));
    });

    document.addEventListener('click', e => {
      const btn = e.target.closest('.password-entry-type-btn');
      if (!btn) return;
      pmSetEntryType(String(btn.dataset.entryType || '').trim());
    });

    vdEl('add-password-project-form')?.addEventListener('submit', e => {
      e.preventDefault();
      const nameInput = vdEl('add-password-project-name');
      const usernameInput = vdEl('add-password-project-username');
      const passwordInput = vdEl('add-password-project-password');
      const licenceInput = vdEl('add-password-project-licence');
      const projectName = String(nameInput?.value || '').trim();
      if (!projectName) { pmSetFeedback('Please enter a project name.', 'error'); return; }
      if (!pm.selectedEntryType) { pmSetFeedback('Please choose login or licence.', 'error'); return; }
      if (pm.selectedEntryType === 'login' && !String(usernameInput?.value || '').trim() && !String(passwordInput?.value || '').trim()) {
        pmSetFeedback('Please fill in a username or password.', 'error'); return;
      }
      if (pm.selectedEntryType === 'licence' && !String(licenceInput?.value || '').trim()) {
        pmSetFeedback('Please fill in the licence key.', 'error'); return;
      }
      pmSetFeedback('Saving…', 'success');
      const data = {
        action: pm.modalMode === 'edit' ? 'update' : 'create',
        projectName, entryType: pm.selectedEntryType,
        loginUsername: String(usernameInput?.value || '').trim(),
        loginPassword: String(passwordInput?.value || '').trim(),
        licenceKey: String(licenceInput?.value || '').trim(),
      };
      if (pm.modalMode === 'edit') data.id = pm.selectedProjectId;
      vdPost(PM_API, data).then(payload => {
        if (!payload?.success) { pmSetFeedback(payload?.message || 'Unable to save.', 'error'); return; }
        if (pm.modalMode !== 'edit') pm.selectedProjectId = Number(payload?.id || 0);
        pmCloseModal(); pmLoadProjects();
      }).catch(err => pmSetFeedback(err?.message || 'Unable to save.', 'error'));
    });

    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      const modal = vdEl('add-password-project-modal');
      const deleteModal = vdEl('password-delete-project-modal');
      if (modal?.classList.contains('is-open')) { pmCloseModal(); return; }
      if (deleteModal?.classList.contains('is-open')) pmCloseDeleteModal();
    });
  }

  pmShowListView();
  pmSetFilterType('all');
  pmSyncModalUi();
  pmLoadProjects();
};
