(function () {
  'use strict';

  let calendarInstance = null;
  let overviewChart    = null;
  let renderSeq        = 0;

  /* ── In-memory cache (cleared on page refresh) ──────────── */

  const dataCache = Object.create(null);

  /* Clear server-side file cache on every page load so a refresh always fetches fresh data.
     Tab switches reuse dataCache above without hitting the server again. */
  fetch('./Api/clear-cache.php').catch(function () {});

  async function fetchCached(key, fetchFn) {
    if (key in dataCache) return dataCache[key];
    const result    = await fetchFn();
    dataCache[key]  = result;
    return result;
  }
  
  function isOverdue(dateStr) {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(dateStr + 'T00:00:00') < today;
  }

  function avatarUrl(user) {
    return user.avatarUrl || (user.avatarUrls && user.avatarUrls['48x48']) || null;
  }

  function setPageHeader(user) {
    const avatarWrap = document.getElementById('page-avatar');
    const subtitle   = document.getElementById('page-subtitle');

    if (!user) {
      if (avatarWrap) avatarWrap.innerHTML = '';
      if (subtitle) { subtitle.textContent = ''; subtitle.hidden = true; }
      return;
    }

    if (avatarWrap) {
      const url = avatarUrl(user);
      if (url) {
        const img = document.createElement('img');
        img.className = 'avatar avatar-lg';
        img.src       = url;
        img.alt       = '';
        avatarWrap.innerHTML = '';
        avatarWrap.appendChild(img);
      } else {
        const fb = document.createElement('div');
        fb.className   = 'avatar-fallback avatar-lg';
        fb.textContent = (user.displayName || '?').charAt(0).toUpperCase();
        avatarWrap.innerHTML = '';
        avatarWrap.appendChild(fb);
      }
    }

    if (subtitle) {
      subtitle.textContent = '';
      subtitle.hidden      = true;
    }
  }

  function clearPageHeader() {
    setPageHeader(null);
  }

  function resetStatCards() {
    document.querySelectorAll('.stat-row').forEach(function (row) {
      row.remove();
    });
  }

  function getMainContent() {
    return document.getElementById('main-content');
  }

  function showLoading(message) {
    const el = getMainContent();
    if (!el) return;
    el.innerHTML = '';
    const msg = document.createElement('p');
    msg.className     = 'issue-empty';
    msg.style.padding = '48px 0';
    msg.textContent   = message || 'Loading…';
    el.appendChild(msg);
  }

  function showError(message) {
    const el = getMainContent();
    if (!el) return;
    el.innerHTML = '';
    const msg = document.createElement('p');
    msg.className     = 'issue-empty';
    msg.style.padding = '48px 0';
    msg.style.color   = '#dc2626';
    msg.textContent   = message || 'An error occurred.';
    el.appendChild(msg);
  }

  /*Task Modal*/
  async function openIssueByKey(issueKey, fallback) {
    fallback = fallback || {};
    openTaskModal({
      projectTitle: (fallback.projectName || 'Project') + (fallback.projectKey ? ' (' + fallback.projectKey + ')' : ''),
      todoTitle:    fallback.summary || issueKey,
      meta:         issueKey,
      feedbackText: 'Loading feedback…',
    });

    try {
      const res = await fetchCached('issue:' + issueKey, () =>
        fetch('./Api/issue.php?key=' + encodeURIComponent(issueKey), { headers: { Accept: 'application/json' } }).then(r => r.json())
      );
      if (!res.ok) throw new Error(res.error || 'Failed');
      openTaskModal({
        projectTitle: (res.project?.name || fallback.projectName || 'Project') + ' (' + (res.project?.key || fallback.projectKey || '') + ')',
        todoTitle:    res.summary || fallback.summary || issueKey,
        meta:         issueKey,
        feedbackItems: res.feedback || [],
      });
    } catch (e) {
      openTaskModal({
        projectTitle: (fallback.projectName || 'Project') + (fallback.projectKey ? ' (' + fallback.projectKey + ')' : ''),
        todoTitle:    fallback.summary || issueKey,
        meta:         issueKey,
        feedbackText: 'Failed to load feedback: ' + e.message,
      });
    }
  }

  /*Task Modal Rendering*/
  const modalFeedbackState = { items: [], index: -1 };

  function setModalFeedbackText(text, meta, position) {
    const el = document.getElementById('tm-feedback-text');
    const em = document.getElementById('tm-feedback-meta');
    const ep = document.getElementById('tm-feedback-pos');
    const prev = document.getElementById('tm-feedback-prev');
    const next = document.getElementById('tm-feedback-next');
    if (el) el.textContent = text || 'No feedback yet.';
    if (em) em.textContent = meta || '';
    if (ep) ep.textContent = position || '0 / 0';
    if (prev) prev.disabled = true;
    if (next) next.disabled = true;
  }

  function renderModalFeedbackAt(index) {
    const items = modalFeedbackState.items;
    if (!items.length) {
      modalFeedbackState.index = -1;
      setModalFeedbackText('No feedback yet.', '', '0 / 0');
      return;
    }
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    modalFeedbackState.index = clamped;
    const cur = items[clamped] || {};
    const el  = document.getElementById('tm-feedback-text');
    const em  = document.getElementById('tm-feedback-meta');
    const ep  = document.getElementById('tm-feedback-pos');
    const prev = document.getElementById('tm-feedback-prev');
    const next = document.getElementById('tm-feedback-next');
    if (el) el.textContent = cur.text || '(empty comment)';
    if (em) em.textContent = `${items.length} comment${items.length === 1 ? '' : 's'} • ${cur.author || 'Unknown'} • ${String(cur.created || '').slice(0, 10) || 'Unknown date'}`;
    if (ep) ep.textContent = `${clamped + 1} / ${items.length}`;
    if (prev) prev.disabled = clamped === 0;
    if (next) next.disabled = clamped === items.length - 1;
  }

  function openTaskModal({ projectTitle, todoTitle, meta, feedbackItems, feedbackText }) {
    const backdrop = document.getElementById('tm-backdrop');
    const dialog   = document.getElementById('tm-dialog');
    if (!backdrop || !dialog) return;

    const titleEl = document.getElementById('tm-project-title');
    const metaEl  = document.getElementById('tm-meta');
    const taskEl  = document.getElementById('tm-task-title');
    if (titleEl) titleEl.textContent = projectTitle || '';
    if (metaEl)  metaEl.textContent  = meta || '';
    if (taskEl)  taskEl.textContent  = todoTitle || '';

    if (Array.isArray(feedbackItems)) {
      modalFeedbackState.items = feedbackItems;
      renderModalFeedbackAt(feedbackItems.length - 1);
    } else {
      modalFeedbackState.items = [];
      modalFeedbackState.index = -1;
      setModalFeedbackText(feedbackText || 'No feedback yet.', '', '0 / 0');
    }

    backdrop.classList.add('is-open');
    dialog.classList.add('is-open');
    backdrop.setAttribute('aria-hidden', 'false');
    dialog.setAttribute('aria-hidden', 'false');
  }

  function closeTaskModal() {
    const backdrop = document.getElementById('tm-backdrop');
    const dialog   = document.getElementById('tm-dialog');
    if (backdrop) { backdrop.classList.remove('is-open'); backdrop.setAttribute('aria-hidden', 'true'); }
    if (dialog)   { dialog.classList.remove('is-open');   dialog.setAttribute('aria-hidden', 'true'); }
  }

  // Wire up modal close handlers once the DOM is ready
  document.addEventListener('DOMContentLoaded', function () {
    const backdrop = document.getElementById('tm-backdrop');
    const closeBtn = document.getElementById('tm-close');
    const prev     = document.getElementById('tm-feedback-prev');
    const next     = document.getElementById('tm-feedback-next');
    if (backdrop) backdrop.addEventListener('click', closeTaskModal);
    if (closeBtn) closeBtn.addEventListener('click', closeTaskModal);
    if (prev) prev.addEventListener('click', () => renderModalFeedbackAt(modalFeedbackState.index - 1));
    if (next) next.addEventListener('click', () => renderModalFeedbackAt(modalFeedbackState.index + 1));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeTaskModal(); });
  });

  /* ── DOM builders ───────────────────────── */
  function createSectionHeader(title, backLabel, onBack) {
    const wrap = document.createElement('div');
    wrap.className = 'section-header-row';
    const h2 = document.createElement('h2');
    h2.className   = 'section-title';
    h2.textContent = title;
    wrap.appendChild(h2);

    if (backLabel && onBack) {
      const back = document.createElement('a');
      back.className = 'refresh-btn';
      back.href = '#';
      back.textContent = backLabel;
      back.addEventListener('click', (e) => { e.preventDefault(); onBack(); });
      wrap.appendChild(back);
    }

    return wrap;
  }

  function createBackRow(backLabel, onBack) {
    const wrap = document.createElement('div');
    wrap.className = 'section-header-row';

    const back = document.createElement('a');
    back.className = 'refresh-btn';
    back.href = '#';
    back.textContent = backLabel;
    back.addEventListener('click', (e) => { e.preventDefault(); onBack(); });
    wrap.appendChild(back);

    return wrap;
  }

  function createIssueItem(issue, opts = {}) {
    const overdue = isOverdue(issue.duedate);

    const li = document.createElement('li');
    li.className = 'issue-item';
    if (overdue) li.dataset.overdue = '1';

    li.addEventListener('click', () => {
      openIssueByKey(issue.key, {
        projectKey:  issue.projectKey  || '',
        projectName: issue.projectName || '',
        summary:     issue.summary     || issue.key,
      });
    });

    const body = document.createElement('div');
    body.className = 'issue-body';

    const sum = document.createElement('span');
    sum.className   = 'issue-sum';
    sum.textContent = issue.summary;
    body.appendChild(sum);

    const meta = document.createElement('div');
    meta.className = 'issue-meta';

    if (issue.projectName || issue.projectKey) {
      const proj = document.createElement('span');
      proj.className   = 'issue-key';
      proj.textContent = issue.projectName || issue.projectKey;
      meta.appendChild(proj);
    }

    if (opts.showStatus && issue.statusCategory) {
      const cat = issue.statusCategory;
      const cls = cat === 'In Progress' ? 'badge-status-progress' : 'badge-status-todo';
      const statusBadge = document.createElement('span');
      statusBadge.className   = 'issue-badge ' + cls;
      statusBadge.textContent = cat;
      meta.appendChild(statusBadge);
    }

    if (issue.duedate) {
      const badge = document.createElement('span');
      badge.className   = 'issue-badge badge-due';
      badge.textContent = 'Due: ' + issue.duedate;
      meta.appendChild(badge);
    }

    if ((issue.commentCount ?? 0) > 0) {
      const fb = document.createElement('span');
      fb.className   = 'issue-badge badge-feedback';
      fb.textContent = 'Feedback';
      meta.appendChild(fb);
    }

    body.appendChild(meta);

    if (opts.showAssignee && issue.assigneeName) {
      const assigneeRow = document.createElement('div');
      assigneeRow.className = 'issue-assignee-row';
      const assigneeBadge = document.createElement('span');
      assigneeBadge.className   = 'issue-badge badge-assignee';
      assigneeBadge.textContent = issue.assigneeName;
      assigneeRow.appendChild(assigneeBadge);
      body.appendChild(assigneeRow);
    }

    li.appendChild(body);

    if (overdue) {
      const overdueBadge = document.createElement('span');
      overdueBadge.className   = 'issue-badge badge-overdue badge-overdue-corner';
      overdueBadge.textContent = 'Overdue';
      li.appendChild(overdueBadge);
    }

    return li;
  }

  function sortIssues(issues) {
    const byDate = (a, b) => {
      if (!a.duedate && !b.duedate) return 0;
      if (!a.duedate) return 1;
      if (!b.duedate) return -1;
      return a.duedate < b.duedate ? -1 : a.duedate > b.duedate ? 1 : 0;
    };
    const overdue = issues.filter(i => isOverdue(i.duedate)).sort(byDate);
    const other   = issues.filter(i => !isOverdue(i.duedate)).sort(byDate);
    return [...overdue, ...other];
  }

  function createIssueColumn(title, dotClass, headerClass, issues, opts = {}) {
    const sorted = sortIssues(issues);

    const startOpen = opts.defaultOpen === true;

    const col = document.createElement('div');
    col.className = 'issues-col' + (startOpen ? '' : ' is-collapsed') + (opts.extraClass ? ' ' + opts.extraClass : '');

    const header = document.createElement('div');
    header.className = 'issues-col-header ' + headerClass + ' column-toggle-header';

    const dot = document.createElement('span');
    dot.className = 'col-dot ' + dotClass;
    header.appendChild(dot);

    const titleEl = document.createElement('span');
    titleEl.textContent = title;
    header.appendChild(titleEl);

    const indicator = document.createElement('span');
    indicator.className   = 'column-toggle-indicator';
    indicator.textContent = startOpen ? '▾' : '▸';
    header.appendChild(indicator);

    const count = document.createElement('span');
    count.className   = 'col-count';
    count.textContent = String(sorted.length);
    header.appendChild(count);

    const list = document.createElement('ul');
    list.className = 'issue-list';

    if (sorted.length === 0) {
      const empty = document.createElement('li');
      empty.className   = 'issue-empty';
      empty.textContent = 'No issues';
      list.appendChild(empty);
    } else {
      sorted.forEach(issue => list.appendChild(createIssueItem(issue, opts)));
    }

    header.addEventListener('click', () => {
      col.classList.toggle('is-collapsed');
      indicator.textContent = col.classList.contains('is-collapsed') ? '▸' : '▾';
    });

    col.appendChild(header);
    col.appendChild(list);

    return col;
  }

  function createOverviewUserCard(user, onClickFn) {
    const card = document.createElement('button');
    card.type      = 'button';
    card.className = 'overview-user-card';

    const url = avatarUrl(user);
    if (url) {
      const img = document.createElement('img');
      img.className = 'overview-avatar';
      img.src       = url;
      img.alt       = '';
      card.appendChild(img);
    } else {
      const fb = document.createElement('span');
      fb.className   = 'overview-avatar overview-avatar-fallback';
      fb.textContent = (user.displayName || '?').charAt(0).toUpperCase();
      card.appendChild(fb);
    }

    const meta = document.createElement('div');
    meta.className = 'overview-user-meta';

    const name = document.createElement('div');
    name.className   = 'overview-user-name';
    name.textContent = user.displayName || 'Unknown';
    meta.appendChild(name);

    const counts = document.createElement('div');
    counts.className = 'overview-counts';

    const todoBadge = document.createElement('span');
    todoBadge.className   = 'overview-count-badge overview-count-todo';
    todoBadge.textContent = (user.todo ?? 0) + ' To Do';
    counts.appendChild(todoBadge);

    const progBadge = document.createElement('span');
    progBadge.className   = 'overview-count-badge overview-count-progress';
    progBadge.textContent = (user.progress ?? 0) + ' In Progress';
    counts.appendChild(progBadge);

    meta.appendChild(counts);
    card.appendChild(meta);

    card.addEventListener('click', () => {
      if (typeof onClickFn === 'function') onClickFn(user, card);
    });

    return card;
  }

  function createProjectCard(pKey, p, opts = {}) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'project-card' + (opts.inactive ? ' project-card--inactive' : '');
    card.dataset.key  = pKey;
    card.dataset.name = (p.name || pKey).toLowerCase();

    const name = document.createElement('div');
    name.className   = 'project-card-name';
    name.textContent = p.name || pKey;
    card.appendChild(name);

    const todo     = p['To Do']       ?? 0;
    const progress = p['In Progress'] ?? 0;
    const feedback = p['Feedback']    ?? 0;
    const hasActive = (todo + progress) > 0;

    const counts = document.createElement('div');
    counts.className = 'project-card-counts';

    if (todo > 0) {
      const b = document.createElement('span');
      b.className   = 'proj-count-badge proj-count-todo';
      b.textContent = todo + ' To Do';
      counts.appendChild(b);
    }
    if (progress > 0) {
      const b = document.createElement('span');
      b.className   = 'proj-count-badge proj-count-progress';
      b.textContent = progress + ' In Progress';
      counts.appendChild(b);
    }
    if (feedback > 0) {
      const b = document.createElement('span');
      b.className   = 'proj-count-badge proj-count-feedback';
      b.textContent = feedback + ' Feedback';
      counts.appendChild(b);
    }
    if (!hasActive && feedback === 0) {
      const b = document.createElement('span');
      b.className   = 'proj-count-badge proj-count-empty';
      b.textContent = 'No open tasks';
      counts.appendChild(b);
    }

    card.appendChild(counts);
    return card;
  }

  function buildProjectsPage(el, titleText, projects, onCardClick, opts = {}) {
    el.innerHTML = '';

    const keys      = Object.keys(projects);
    const isActive  = k => ((projects[k]['To Do'] ?? 0) + (projects[k]['In Progress'] ?? 0)) > 0;
    const activeK   = keys.filter(isActive);
    const inactiveK = keys.filter(k => !isActive(k));

    const headerRow = document.createElement('div');
    headerRow.className = 'section-header-row';

    if (opts.showSectionTitle !== false) {
      const h2 = document.createElement('h2');
      h2.className   = 'section-title';
      h2.textContent = titleText;
      headerRow.appendChild(h2);
    }

    const searchWrap = document.createElement('div');
    searchWrap.className = 'project-search-wrap';
    searchWrap.innerHTML = '<svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    const searchInput = document.createElement('input');
    searchInput.type        = 'text';
    searchInput.className   = 'project-search-input';
    searchInput.placeholder = 'Search projects…';
    const clearBtn = document.createElement('button');
    clearBtn.type      = 'button';
    clearBtn.className = 'search-clear';
    clearBtn.textContent = '×';
    searchWrap.appendChild(searchInput);
    searchWrap.appendChild(clearBtn);
    headerRow.appendChild(searchWrap);
    el.appendChild(headerRow);

    const noResults = document.createElement('p');
    noResults.className = 'search-no-results';
    noResults.textContent = 'No projects match your search.';
    noResults.style.display = 'none';
    el.appendChild(noResults);

    function buildSection(sectionKeys, sectionTitle, inactive) {
      if (!sectionKeys.length) return null;

      const section = document.createElement('div');
      section.className = 'section';

      const secHeader = document.createElement('div');
      secHeader.className = 'section-header-row';
      const secH3 = document.createElement('h3');
      secH3.style.cssText = 'font-size:.82rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin:0';
      secH3.textContent   = sectionTitle + ' (' + sectionKeys.length + ')';
      secHeader.appendChild(secH3);
      section.appendChild(secHeader);

      const LIMIT = inactive ? 6 : 12;
      const grid  = document.createElement('div');
      grid.className = 'project-grid';

      sectionKeys.forEach((k, i) => {
        const card = createProjectCard(k, projects[k], { inactive });
        if (i >= LIMIT) card.dataset.extra = '1';
        card.addEventListener('click', () => onCardClick(k, projects[k].name || k));
        grid.appendChild(card);
      });

      section.appendChild(grid);

      if (sectionKeys.length > LIMIT) {
        const showWrap = document.createElement('div');
        showWrap.className = 'show-all-wrap';
        const chevron = `<svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        const showBtn = document.createElement('button');
        showBtn.type = 'button';
        showBtn.className = 'show-all-btn';
        showBtn.innerHTML = `Show all ${sectionKeys.length} ${chevron}`;
        showBtn.addEventListener('click', () => {
          const expanded = grid.classList.toggle('expanded');
          showBtn.classList.toggle('open', expanded);
          showBtn.innerHTML = expanded ? `Show less ${chevron}` : `Show all ${sectionKeys.length} ${chevron}`;
        });
        showWrap.appendChild(showBtn);
        section.appendChild(showWrap);
      }

      return section;
    }

    const activeSection   = buildSection(activeK,   'Active',   false);
    const inactiveSection = buildSection(inactiveK,  'Inactive', true);

    if (activeSection)   el.appendChild(activeSection);
    if (inactiveSection) el.appendChild(inactiveSection);

    if (!keys.length) {
      const empty = document.createElement('p');
      empty.className     = 'issue-empty';
      empty.style.padding = '24px 0';
      empty.textContent   = 'No projects found.';
      el.appendChild(empty);
    }

    const allCards = () => el.querySelectorAll('.project-card');

    function applySearch(q) {
      q = q.trim().toLowerCase();
      clearBtn.style.display = q ? 'block' : 'none';
      noResults.style.display = 'none';

      if (!q) {
        allCards().forEach(c => { c.style.display = ''; });
        el.querySelectorAll('.project-grid').forEach(g => g.classList.remove('searching'));
        return;
      }

      el.querySelectorAll('.project-grid').forEach(g => g.classList.add('searching'));
      let visible = 0;
      allCards().forEach(c => {
        const match = (c.dataset.key || '').includes(q) || (c.dataset.name || '').includes(q);
        c.style.display = match ? '' : 'none';
        if (match) visible++;
      });

      noResults.style.display = visible === 0 ? 'block' : 'none';
    }

    searchInput.addEventListener('input', () => applySearch(searchInput.value));
    clearBtn.addEventListener('click', () => { searchInput.value = ''; applySearch(''); searchInput.focus(); });
  }

  /*Overdue tasks*/

  function groupByProject(items) {
    const map = new Map();
    for (const it of (items || [])) {
      const pKey = it.projectKey || 'UNKNOWN';
      if (!map.has(pKey)) {
        map.set(pKey, { projectKey: pKey, projectName: it.projectName || pKey, items: [] });
      }
      map.get(pKey).items.push(it);
    }
    return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length);
  }

  function renderAlarmProjectList(section, groups) {
    section.innerHTML = '';

    const col = document.createElement('div');
    col.className = 'issues-col';
    col.style.maxWidth = '820px';

    const colHeader = document.createElement('div');
    colHeader.className = 'issues-col-header alarm-header';
    const dot = document.createElement('span');
    dot.className = 'col-dot dot-alarm';
    colHeader.appendChild(dot);
    colHeader.append('Overdue projects');

    const list = document.createElement('ul');
    list.className = 'issue-list';

    if (!groups.length) {
      const empty = document.createElement('li');
      empty.className   = 'alarm-empty';
      empty.textContent = '✅ No overdue tasks — all clear!';
      list.appendChild(empty);
    } else {
      groups.forEach(g => {
        const li = document.createElement('li');
        li.className = 'issue-item alarm-project-card';

        const body = document.createElement('div');
        body.className = 'issue-body';
        const sum = document.createElement('span');
        sum.className   = 'issue-sum';
        sum.textContent = g.projectName;
        body.appendChild(sum);

        const taskCount = document.createElement('span');
        taskCount.className   = 'alarm-task-count';
        taskCount.textContent = String(g.items.length);

        li.appendChild(body);
        li.appendChild(taskCount);
        li.addEventListener('click', () => renderAlarmDetails(section, groups, g));
        list.appendChild(li);
      });
    }

    col.appendChild(colHeader);
    col.appendChild(list);
    section.appendChild(col);
  }

  function renderAlarmDetails(section, groups, group) {
    section.innerHTML = '';

    section.appendChild(createBackRow('← Back', () => renderAlarmProjectList(section, groups)));

    const col = document.createElement('div');
    col.className = 'issues-col';
    col.style.maxWidth = '820px';

    const colHeader = document.createElement('div');
    colHeader.className = 'issues-col-header alarm-header';
    const dot = document.createElement('span');
    dot.className = 'col-dot dot-alarm';
    colHeader.appendChild(dot);
    colHeader.append('Overdue tasks');

    const countEl = document.createElement('span');
    countEl.className   = 'col-count';
    countEl.textContent = String(group.items.length);
    colHeader.appendChild(countEl);

    const list = document.createElement('ul');
    list.className = 'issue-list';

    group.items.forEach(it => list.appendChild(createIssueItem(it)));

    col.appendChild(colHeader);
    col.appendChild(list);
    section.appendChild(col);
  }

  /*Calendar*/

  function destroyCalendar() {
    if (calendarInstance) {
      calendarInstance.destroy();
      calendarInstance = null;
    }
  }

  function destroyChart() {
    if (overviewChart) {
      overviewChart.destroy();
      overviewChart = null;
    }
  }

  function initCalendar(allEvents, filterBtns) {
    destroyCalendar();
    const el = document.getElementById('user-calendar');
    if (!el || typeof FullCalendar === 'undefined') return;

    let activeFilter = 'tasks';

    const normalizeStatus = (s) => {
      s = String(s || '').toLowerCase();
      if (s === 'progress') return 'progress';
      if (s === 'done')     return 'done';
      if (s === 'todo')     return 'todo';
      return '';
    };

    const todayKey = new Date().toLocaleDateString('en-CA');

    const eventIncludesToday = (event) => {
      const start = String(event.start || '').slice(0, 10);
      const end   = String(event.end || '').slice(0, 10);
      if (!start) return false;
      if (!end) return start === todayKey;
      return start <= todayKey && todayKey < end;
    };

    const matchesFilter = (event, filter) => {
      const status = normalizeStatus(event.extendedProps?.status || '');
      if (filter === 'all') return true;
      if (filter === 'tasks') {
        return status === 'todo' || status === 'progress' || (status === 'done' && eventIncludesToday(event));
      }
      return status === filter;
    };

    const statusOrder = { done: 0, todo: 1, progress: 2 };
    const sortEvents = (evts) => evts.slice().sort((a, b) => {
      const sa = statusOrder[normalizeStatus(a.extendedProps?.status || '')] ?? 1;
      const sb = statusOrder[normalizeStatus(b.extendedProps?.status || '')] ?? 1;
      return sa - sb;
    });

    const renderLegend = () => {
      const toolbar = el.querySelector('.fc-header-toolbar');
      if (!toolbar) return;

      const existing = el.querySelector('.calendar-legend');
      if (existing) existing.remove();

      const legend = document.createElement('div');
      legend.className = 'calendar-legend';
      legend.innerHTML = ''
        + '<span class="calendar-legend-item"><span class="calendar-legend-dot calendar-legend-dot--todo"></span>Todo</span>'
        + '<span class="calendar-legend-item"><span class="calendar-legend-dot calendar-legend-dot--progress"></span>In Progress</span>'
        + '<span class="calendar-legend-item"><span class="calendar-legend-dot calendar-legend-dot--feedback"></span>In Feedback</span>'
        + '<span class="calendar-legend-item"><span class="calendar-legend-dot calendar-legend-dot--done"></span>Done</span>';

      toolbar.insertAdjacentElement('afterend', legend);
    };

    //Aanmaken calender
    calendarInstance = new FullCalendar.Calendar(el, {
      initialView:   'dayGridMonth',
      height:        'auto',
      firstDay:      1,
      nowIndicator:  true,
      headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek' },
      buttonText:    { dayGridMonth: 'Maand', dayGridWeek: 'Week', today: 'today' },
      events: (info, resolve) => {
        const filtered = allEvents.filter(e => matchesFilter(e, activeFilter));
        resolve(sortEvents(filtered));
      },
      eventClick: (info) => {
        const props    = info.event.extendedProps || {};
        const issueKey = props.issueKey || info.event.id || '';
        if (!issueKey) return;
        openIssueByKey(issueKey, {
          projectKey:  props.projectKey  || '',
          projectName: props.projectName || '',
          summary:     props.summary     || info.event.title || issueKey,
        });
      },
    });

    calendarInstance.render();
    renderLegend();

    if (filterBtns) {
      const setActive = (status) => {
        activeFilter = status;
        Object.values(filterBtns).forEach(b => b.classList.remove('is-active'));
        if (filterBtns[status]) filterBtns[status].classList.add('is-active');
        calendarInstance.refetchEvents();
      };

      Object.entries(filterBtns).forEach(([status, btn]) => {
        btn.addEventListener('click', () => setActive(status));
      });

      // Set initial visual state without triggering a refetch
      if (filterBtns.tasks) filterBtns.tasks.classList.add('is-active');
    }
  }

  function initOverviewChart(canvas, chartData) {
    destroyChart();
    if (!canvas || typeof Chart === 'undefined' || !chartData.length) return;

    const labels    = chartData.map(u => u.displayName || 'Unknown');
    const totals    = chartData.map(u => u.totalOpen ?? 0);
    const monthName = new Date().toLocaleString(undefined, { month: 'long' });

    const wrap    = canvas.closest('.overview-chart-wrap');
    const titleEl = document.getElementById('overview-chart-title-text');
    if (titleEl) titleEl.textContent = 'Counted Tasks From ' + monthName;
    if (wrap) wrap.style.height = '420px';

    overviewChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '',
          data: totals,
          borderWidth: 1,
          borderRadius: 6,
          backgroundColor: 'rgba(99, 102, 241, 0.34)',
          borderColor:     'rgba(67, 56, 202, 0.95)',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            titleFont: { size: 12, weight: '600' },
            bodyFont:  { size: 13, weight: '600' },
            padding: 14,
            callbacks: {
              title: (items) => String(items[0]?.label || 'Unknown'),
              label: (ctx)   => String(ctx.parsed.y),
            },
          },
        },
        scales: {
          x: {
            ticks: {
              display: false,
              autoSkip: false,
              maxRotation: 0,
              minRotation: 0,
              font: { size: 10 },
            },
          },
          y: {
            beginAtZero: true,
            ticks: { precision: 0 },
          },
        },
      },
    });
  }

  /*Page renders*/

  async function renderOverviewPage() {
    const seq = ++renderSeq;
    showLoading('Loading team overview…');
    clearPageHeader();
    destroyChart();

    try {
      const res = await fetchCached('overview', () =>
        fetch('./Api/overview.php', { headers: { Accept: 'application/json' } }).then(r => r.json())
      );
      if (renderSeq !== seq) return;
      if (!res.ok) throw new Error(res.error || 'Could not load overview.');

      const users     = res.users     || [];
      const totals    = res.totals    || {};
      const allTasks  = res.allTasks  || { todo: [], progress: [] };
      const chartData = res.chartData || [];
      const everyone  = res.everyone  || { todo: [], progress: [], feedback: [] };
      const overdue   = res.overdue   || [];

      const userMap = {};
      (window.appState ? window.appState.availableUsers : []).forEach(u => {
        userMap[u.accountId] = u;
      });

      const el = getMainContent();
      el.innerHTML = '';

      /* ── Section 1: chart + All Tasks For Today ── */
      const overviewSection = document.createElement('div');
      overviewSection.className = 'section';

      const topHeaderRow = document.createElement('div');
      topHeaderRow.className = 'section-header-row';
      const h2Chart = document.createElement('h2');
      h2Chart.className   = 'section-title';
      h2Chart.id          = 'overview-chart-title-text';
      h2Chart.textContent = 'Counted Tasks';
      topHeaderRow.appendChild(h2Chart);
      const h2Today = document.createElement('h2');
      h2Today.className   = 'section-title';
      h2Today.textContent = 'All Tasks For Today';
      topHeaderRow.appendChild(h2Today);
      overviewSection.appendChild(topHeaderRow);

      const topRow = document.createElement('div');
      topRow.className = 'overview-top-row';

      // Chart wrap — canvas only, no title inside (title is in the header above)
      const chartWrap = document.createElement('div');
      chartWrap.className = 'overview-chart-wrap';
      const canvas = document.createElement('canvas');
      canvas.id = 'overview-user-status-chart';
      chartWrap.appendChild(canvas);
      topRow.appendChild(chartWrap);

      // Today columns
      const todaySide = document.createElement('div');
      todaySide.className = 'overview-today-side';
      const todayCols = document.createElement('div');
      todayCols.className = 'issues-columns';
      todayCols.style.gridTemplateColumns = 'repeat(2, 1fr)';
      todayCols.appendChild(createIssueColumn('To Do',       'dot-todo',     'todo-header',     allTasks.todo,     { showAssignee: true, defaultOpen: true }));
      todayCols.appendChild(createIssueColumn('In Progress', 'dot-progress', 'progress-header', allTasks.progress, { showAssignee: true, defaultOpen: true }));
      todaySide.appendChild(todayCols);
      topRow.appendChild(todaySide);

      overviewSection.appendChild(topRow);

      /* ── Section 2: Today's Tasks user grid ── */
      const gridHeader = document.createElement('div');
      gridHeader.className = 'section-header-row';
      const h2Grid = document.createElement('h2');
      h2Grid.className   = 'section-title';
      h2Grid.textContent = "Today's Tasks";
      gridHeader.appendChild(h2Grid);
      overviewSection.appendChild(gridHeader);

      /* ── Details section (hidden until user card clicked) ── */
      const detailsSection = document.createElement('div');
      detailsSection.className = 'section overview-details-section';
      detailsSection.style.display = 'none';

      let activeCardEl  = null;
      let activeUserId  = '';

      const detailsHeader = document.createElement('div');
      detailsHeader.className = 'section-header-row';
      const detailsTitle = document.createElement('h2');
      detailsTitle.className   = 'section-title';
      detailsTitle.id          = 'overview-user-title';
      detailsTitle.textContent = 'User';
      detailsHeader.appendChild(detailsTitle);
      const backBtn = document.createElement('a');
      backBtn.className = 'refresh-btn';
      backBtn.href      = '#';
      backBtn.textContent = '← Back';
      backBtn.addEventListener('click', e => {
        e.preventDefault();
        detailsSection.style.display = 'none';
        if (activeCardEl) { activeCardEl.classList.remove('is-active'); activeCardEl = null; }
        activeUserId = '';
      });
      detailsHeader.appendChild(backBtn);
      detailsSection.appendChild(detailsHeader);

      const detailsCols = document.createElement('div');
      detailsCols.className = 'issues-columns';
      detailsCols.style.gridTemplateColumns = 'repeat(2, 1fr)';
      detailsSection.appendChild(detailsCols);

      const loadUserDetails = async (user, cardEl) => {
        if (activeUserId === user.accountId && detailsSection.style.display !== 'none') {
          detailsSection.style.display = 'none';
          cardEl.classList.remove('is-active');
          activeCardEl  = null;
          activeUserId  = '';
          return;
        }

        if (activeCardEl) activeCardEl.classList.remove('is-active');
        activeCardEl = cardEl;
        cardEl.classList.add('is-active');
        activeUserId = user.accountId;

        detailsTitle.textContent = user.displayName || 'User';
        detailsCols.innerHTML = '<p class="issue-empty" style="padding:24px 0">Loading…</p>';
        detailsSection.style.display = '';
        detailsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        try {
          const r = await fetchCached('userToday:' + user.accountId, () =>
            fetch('./Api/user/today.php?userId=' + encodeURIComponent(user.accountId), { headers: { Accept: 'application/json' } }).then(x => x.json())
          );
          if (!r.ok) throw new Error(r.error || 'Failed');

          const uTodo     = r.todo     || [];
          const uProgress = r.progress || [];

          detailsCols.innerHTML = '';
          detailsCols.appendChild(createIssueColumn('To Do',       'dot-todo',     'todo-header',     uTodo,     { defaultOpen: true }));
          detailsCols.appendChild(createIssueColumn('In Progress', 'dot-progress', 'progress-header', uProgress, { defaultOpen: true }));
        } catch (e) {
          detailsCols.innerHTML = '<p class="issue-empty" style="color:#dc2626;padding:24px 0">Failed to load.</p>';
        }
      };

      if (!users.length) {
        const empty = document.createElement('div');
        empty.className   = 'overview-empty';
        empty.textContent = 'No active tasks found.';
        overviewSection.appendChild(empty);
      } else {
        const grid = document.createElement('div');
        grid.className = 'overview-grid';

        users.forEach(u => {
          const full = userMap[u.accountId] ? Object.assign({}, u, userMap[u.accountId]) : u;
          const card = createOverviewUserCard(full, (user, cardEl) => loadUserDetails(user, cardEl));
          grid.appendChild(card);
        });

        overviewSection.appendChild(grid);
      }

      overviewSection.appendChild(detailsSection);
      el.appendChild(overviewSection);

      // Render chart after DOM is ready
      requestAnimationFrame(() => initOverviewChart(canvas, chartData));

      /* ── Section 3: All Project's Tasks (Everyone) ── */
      const everyoneSection = document.createElement('div');
      everyoneSection.className = 'section overview-all-today';

      const everyoneHeader = document.createElement('div');
      everyoneHeader.className = 'section-header-row';
      const h2Everyone = document.createElement('h2');
      h2Everyone.className   = 'section-title';
      h2Everyone.textContent = "All Project's Tasks (Everyone)";
      everyoneHeader.appendChild(h2Everyone);
      everyoneSection.appendChild(everyoneHeader);

      const everyoneCols = document.createElement('div');
      everyoneCols.className = 'issues-columns';
      everyoneCols.appendChild(createIssueColumn('To Do',       'dot-todo',      'todo-header',      everyone.todo,      { showAssignee: true }));
      everyoneCols.appendChild(createIssueColumn('In Progress', 'dot-progress',  'progress-header',  everyone.progress,  { showAssignee: true }));
      everyoneCols.appendChild(createIssueColumn('Feedback',    'dot-feedback',  'feedback-header',  everyone.feedback,  { showAssignee: true }));
      everyoneSection.appendChild(everyoneCols);
      el.appendChild(everyoneSection);

      /* ── Section 4: Overdue ── */
      const overdueSection = document.createElement('div');
      overdueSection.className = 'section overview-all-today';

      const overdueCols = document.createElement('div');
      overdueCols.className = 'issues-columns';
      overdueCols.id = 'column-full-width';
      overdueCols.appendChild(createIssueColumn('Overdue', 'dot-alarm', 'alarm-header', overdue, { showAssignee: true }));
      overdueSection.appendChild(overdueCols);
      el.appendChild(overdueSection);

    } catch (err) {
      if (renderSeq !== seq) return;
      showError(err.message || 'Error loading overview.');
    }
  }

  async function renderUserTasks(user) {
    const seq = ++renderSeq;
    showLoading('Loading tasks…');

    try {
      const [issuesRes, calRes] = await Promise.all([
        fetchCached('userTasks:' + user.accountId, () =>
          fetch('./Api/user/issues.php?userId=' + encodeURIComponent(user.accountId), { headers: { Accept: 'application/json' } }).then(r => r.json())
        ),
        fetchCached('userCalendar:' + user.accountId, () =>
          fetch('./Api/user/calendar.php?userId=' + encodeURIComponent(user.accountId), { headers: { Accept: 'application/json' } }).then(r => r.json())
        ),
      ]);

      if (renderSeq !== seq) return;
      if (!issuesRes.ok) throw new Error(issuesRes.error || 'Could not load tasks.');

      const noDueDateTodo  = issuesRes.noDueDateTodo  || [];
      const withDueDateTodo = issuesRes.withDueDateTodo || [];
      const progress        = issuesRes.progress        || [];
      const feedback        = issuesRes.feedback        || [];
      const done            = issuesRes.done            || [];

      const el = getMainContent();
      el.innerHTML = '';

      /* ── Section 1: Calendar (FIRST) ── */
      const calSection = document.createElement('div');
      calSection.className = 'section';

      const calHeaderRow = document.createElement('div');
      calHeaderRow.className = 'section-header-row';

      const calTitle = document.createElement('h2');
      calTitle.className   = 'section-title';
      calTitle.textContent = 'Calendar';
      calHeaderRow.appendChild(calTitle);

      const filterWrap = document.createElement('div');
      filterWrap.className = 'calendar-filter-buttons';
      const filterConfig = [
        { id: 'all',   label: 'All' },
        { id: 'tasks', label: 'Tasks' },
        { id: 'done',  label: 'Done' },
      ];
      const filterBtns = {};
      filterConfig.forEach(({ id, label }) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'filter-calender-btn';
        btn.textContent = label;
        filterBtns[id] = btn;
        filterWrap.appendChild(btn);
      });
      calHeaderRow.appendChild(filterWrap);

      calSection.appendChild(calHeaderRow);

      const calWrap = document.createElement('div');
      calWrap.className = 'calendar-wrap';
      const calEl = document.createElement('div');
      calEl.id = 'user-calendar';
      calWrap.appendChild(calEl);
      calSection.appendChild(calWrap);
      el.appendChild(calSection);

      const calEvents = (calRes && calRes.ok) ? (calRes.events || []) : [];
      initCalendar(calEvents, filterBtns);

      /* ── Section 2: Open Tasks ── */
      const openSection = document.createElement('div');
      openSection.className = 'section';
      openSection.appendChild(createSectionHeader('Open Tasks'));

      const openCols = document.createElement('div');
      openCols.className = 'issues-columns';
      openCols.appendChild(createIssueColumn('No Due Date', 'dot-todo',     'todo-header',     noDueDateTodo,  { showStatus: true }));
      openCols.appendChild(createIssueColumn('To Do',       'dot-todo',     'todo-header',     withDueDateTodo));
      openCols.appendChild(createIssueColumn('In Progress', 'dot-progress', 'progress-header', progress));
      openSection.appendChild(openCols);
      el.appendChild(openSection);

      /* ── Section 3: Feedback + Done ── */
      const fbSection = document.createElement('div');
      fbSection.className = 'section';

      const fbCols = document.createElement('div');
      fbCols.className = 'issues-columns feedback-done-columns';

      const fbCol = createIssueColumn('Feedback',  'dot-feedback', 'feedback-header', feedback, { extraClass: 'issues-col--span-2' });
      fbCols.appendChild(fbCol);
      fbCols.appendChild(createIssueColumn('Done (30d)', 'dot-done', 'done-header', done));

      fbSection.appendChild(fbCols);
      el.appendChild(fbSection);

    } catch (err) {
      if (renderSeq !== seq) return;
      showError(err.message || 'Error loading tasks.');
    }
  }

  async function renderAssignedProjects(user, backFn) {
    const seq = ++renderSeq;
    showLoading('Loading projects…');

    try {
      const res = await fetchCached('userProjects:' + user.accountId, () =>
        fetch('./Api/user/projects.php?userId=' + encodeURIComponent(user.accountId), { headers: { Accept: 'application/json' } }).then(r => r.json())
      );
      if (renderSeq !== seq) return;
      if (!res.ok) throw new Error(res.error || 'Could not load projects.');

      const projects = res.projects || {};
      const el       = getMainContent();
      el.innerHTML   = '';

      buildProjectsPage(el, 'Assigned Projects', projects, (pKey, pName) => {
        renderProjectTasks(pKey, pName, () => {
          if (backFn) backFn();
          else renderAssignedProjects(user);
        }, { userId: user.accountId });
      }, { showSectionTitle: false });

    } catch (err) {
      if (renderSeq !== seq) return;
      showError(err.message || 'Error loading projects.');
    }
  }

  async function renderOwnerProjects(user, backFn) {
    const seq = ++renderSeq;
    showLoading('Loading owned projects…');

    try {
      const res = await fetchCached('userOwnerProjects:' + user.accountId, () =>
        fetch('./Api/user/owner-projects.php?userId=' + encodeURIComponent(user.accountId), { headers: { Accept: 'application/json' } }).then(r => r.json())
      );
      if (renderSeq !== seq) return;
      if (!res.ok) throw new Error(res.error || 'Could not load owned projects.');

      const projects = res.projects || {};
      const el       = getMainContent();
      el.innerHTML   = '';

      buildProjectsPage(el, 'Owner Of Projects', projects, (pKey, pName) => {
        renderProjectTasks(pKey, pName, () => {
          if (backFn) backFn();
          else renderOwnerProjects(user);
        });
      }, { showSectionTitle: false });

    } catch (err) {
      if (renderSeq !== seq) return;
      showError(err.message || 'Error loading owned projects.');
    }
  }

  async function renderAllProjects(backFn) {
    const seq = ++renderSeq;
    showLoading('Loading all projects…');

    try {
      const res = await fetchCached('allProjects', () =>
        fetch('./Api/all-projects.php', { headers: { Accept: 'application/json' } }).then(r => r.json())
      );
      if (renderSeq !== seq) return;
      if (!res.ok) throw new Error(res.error || 'Could not load projects.');

      const projects = res.projects || {};
      const el       = getMainContent();
      el.innerHTML   = '';

      buildProjectsPage(el, 'All Projects', projects, (pKey, pName) => {
        renderProjectTasks(pKey, pName, () => {
          if (backFn) backFn();
          else renderAllProjects();
        });
      });

    } catch (err) {
      if (renderSeq !== seq) return;
      showError(err.message || 'Error loading all projects.');
    }
  }

  async function renderProjectTasks(projectKey, projectName, backFn, opts = {}) {
    const seq = ++renderSeq;
    showLoading('Loading project tasks…');

    try {
      const userId = opts.userId || '';
      const cacheKey = 'projectTasks:' + projectKey + ':' + (userId || 'all');
      const url = './Api/project/issues.php?projectKey=' + encodeURIComponent(projectKey)
        + (userId ? '&userId=' + encodeURIComponent(userId) : '');
      const res = await fetchCached(cacheKey, () =>
        fetch(url, { headers: { Accept: 'application/json' } }).then(r => r.json())
      );
      if (renderSeq !== seq) return;
      if (!res.ok) throw new Error(res.error || 'Could not load project tasks.');

      const todo     = res.todo     || [];
      const progress = res.progress || [];
      const feedback = res.feedback || [];
      const done     = res.done     || [];
      const today    = new Date();
      today.setHours(0, 0, 0, 0);
      const overdue  = [...todo, ...progress, ...feedback].filter(it => {
        if (!it.duedate) return false;
        return new Date(it.duedate + 'T00:00:00') < today;
      });

      const el = getMainContent();
      el.innerHTML = '';

      const titleEl = document.getElementById('page-title');
      if (titleEl) titleEl.textContent = projectName;

      if (backFn) {
        const backRow = document.createElement('div');
        backRow.style.marginBottom = '14px';
        const backLink = document.createElement('a');
        backLink.href = '#';
        backLink.className = 'refresh-btn';
        backLink.textContent = '← Back to projects';
        backLink.addEventListener('click', e => { e.preventDefault(); backFn(); });
        backRow.appendChild(backLink);
        el.appendChild(backRow);
      }

      const section = document.createElement('div');
      section.className = 'section';
      section.appendChild(createSectionHeader(projectName));

      const columns = document.createElement('div');
      columns.className = 'issues-columns';
      columns.appendChild(createIssueColumn('To Do',       'dot-todo',      'todo-header',      todo,     { showAssignee: true }));
      columns.appendChild(createIssueColumn('In Progress', 'dot-progress',  'progress-header',  progress, { showAssignee: true }));
      columns.appendChild(createIssueColumn('Feedback',    'dot-feedback',  'feedback-header',  feedback, { showAssignee: true }));
      section.appendChild(columns);

      const columns2 = document.createElement('div');
      columns2.className = 'issues-columns';
      columns2.style.marginTop = '14px';
      columns2.appendChild(createIssueColumn('Done (30d)', 'dot-done',  'done-header',  done,   { showAssignee: true }));
      columns2.appendChild(createIssueColumn('Overdue',    'dot-alarm', 'alarm-header', overdue, { showAssignee: true }));
      section.appendChild(columns2);

      el.appendChild(section);

    } catch (err) {
      if (renderSeq !== seq) return;
      showError(err.message || 'Error loading project tasks.');
    }
  }

  async function renderAlarm(user) {
    const seq = ++renderSeq;
    showLoading('Loading overdue tasks…');

    try {
      const res = await fetchCached('userOverdue:' + user.accountId, () =>
        fetch('./Api/user/overdue.php?userId=' + encodeURIComponent(user.accountId), { headers: { Accept: 'application/json' } }).then(r => r.json())
      );
      if (renderSeq !== seq) return;
      if (!res.ok) throw new Error(res.error || 'Could not load overdue tasks.');

      const issues = res.issues || [];
      const groups = groupByProject(issues);

      const el = getMainContent();
      el.innerHTML = '';

      const section = document.createElement('div');
      section.className = 'section';

      renderAlarmProjectList(section, groups);
      el.appendChild(section);

    } catch (err) {
      if (renderSeq !== seq) return;
      showError(err.message || 'Error loading overdue tasks.');
    }
  }

  /* ── VeauFinder tab ─────────────────────── */

  function renderVeauFinderPage() {
    const el = getMainContent();
    if (!el) return;

    el.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.className = 'veaufinder-page';

    // Download card
    const card = document.createElement('div');
    card.className = 'veaufinder-download-card';
    card.innerHTML = ''
      + '<p class="veaufinder-download-intro">To open files directly in Finder, install the <strong>VeauFinder</strong> app on your Mac.</p>'
      + '<ol class="veaufinder-download-steps">'
      + '  <li>Download &amp; complete the installation.<br>'
      + '    <a href="../inc/VeauFinder.dmg" download class="online-finder-btn online-finder-btn--primary veaufinder-download-btn">Download VeauFinder</a>'
      + '  </li>'
      + '  <li>'
      + '    Go to Applications and open the app. If you get the same error as in the image below, go to step 3.'
      + '    <img src="./assets/images/notOpened.png" alt="App not opened warning on macOS.">'
      + '  </li>'
      + '  <li>'
      + '    Go to Settings &gt; Privacy &amp; Security. Scroll down and click "Open Anyway".'
      + '    <img src="./assets/images/open-anyway-settings.png" alt="Privacy &amp; Security settings showing Open Anyway.">'
      + '  </li>'
      + '</ol>'
      + '<button type="button" class="online-finder-btn online-finder-btn--ghost" id="veaufinder-open-btn">Open Online Finder</button>';

    wrap.appendChild(card);
    el.appendChild(wrap);

    const openBtn = document.getElementById('veaufinder-open-btn');
    if (openBtn) {
      openBtn.addEventListener('click', function () {
        if (typeof window.openOnlineFinder === 'function') window.openOnlineFinder();
      });
    }
  }

  const mainTabRenderers = {
    overview() {
      clearPageHeader();
      renderOverviewPage();
    },
    allProjects() {
      clearPageHeader();
      const titleEl = document.getElementById('page-title');
      if (titleEl) titleEl.textContent = 'All Projects';
      renderAllProjects();
    },
    allChats() {
      clearPageHeader();
      const titleEl = document.getElementById('page-title');
      if (titleEl) titleEl.textContent = 'All Chats';
      const mentionUsers = (window.appState.availableUsers || []).map(function (u) { return u.displayName || ''; }).filter(Boolean);
      const selAccountId = window.appState.selectedUser ? (window.appState.selectedUser.accountId || '') : '';
      if (typeof window.initAllChatsPage === 'function') {
        window.initAllChatsPage({
          tab: 'allChats',
          selectedAccountId: selAccountId,
          mentionUsers,
          onPinnedRefresh: function () {
            if (typeof window.refreshChatPinnedSidebar === 'function') window.refreshChatPinnedSidebar();
          },
        });
      }
    },
    veauFinder() {
      clearPageHeader();
      renderVeauFinderPage();
    },
    veauDevManager() {
      const titleEl = document.getElementById('page-title');
      if (titleEl) titleEl.textContent = 'VeauDev Manager';
      const subtitleEl = document.getElementById('page-subtitle');
      if (subtitleEl) { subtitleEl.textContent = ''; subtitleEl.hidden = true; }
      if (typeof window.initVeauDevManagerPage === 'function') window.initVeauDevManagerPage();
    },
    passwordManager() {
      resetStatCards();
      const titleEl = document.getElementById('page-title');
      if (titleEl) titleEl.textContent = 'Password Manager';
      const subtitleEl = document.getElementById('page-subtitle');
      if (subtitleEl) { subtitleEl.textContent = ''; subtitleEl.hidden = true; }
      if (typeof window.initPasswordManagerPage === 'function') window.initPasswordManagerPage();
    },
  };

  /* ── Public API ─────────────────────────── */
  window.renderTabContent = function (tab) {
    destroyCalendar();
    destroyChart();

    const chatSection    = document.getElementById('chat-section');
    const mainContent    = document.getElementById('main-content');
    const veaudevSection = document.getElementById('veau-dev-manager-section');
    const pmSection      = document.getElementById('password-manager-section');
    const isChat         = tab === 'allChats';
    const isVeauDev      = tab === 'veauDevManager';
    const isPm           = tab === 'passwordManager';

    if (!isChat && typeof window.destroyChatPage === 'function') window.destroyChatPage();
    if (chatSection)    chatSection.hidden    = !isChat;
    if (mainContent)    mainContent.hidden    = isChat || isVeauDev || isPm;
    if (veaudevSection) veaudevSection.hidden = !isVeauDev;
    if (pmSection)      pmSection.hidden      = !isPm;

    // Hide veaudev/password header buttons when leaving those tabs
    const vdBackBtn = document.getElementById('veaudev-content-back-btn');
    const vdEditBtn = document.getElementById('veaudev-content-edit-btn');
    const pmBackBtn = document.getElementById('password-manager-back-btn');
    const pmEditBtn = document.getElementById('password-manager-edit-btn');
    const pmEmoji   = document.getElementById('password-manager-page-emoji');
    if (!isVeauDev) {
      if (vdBackBtn) vdBackBtn.hidden = true;
      if (vdEditBtn) vdEditBtn.hidden = true;
    }
    if (!isPm) {
      if (pmBackBtn) pmBackBtn.hidden = true;
      if (pmEditBtn) pmEditBtn.hidden = true;
      if (pmEmoji)   pmEmoji.hidden   = true;
    }

    const render = mainTabRenderers[tab];
    if (typeof render === 'function') {
      render();
      return;
    }

    clearPageHeader();
    resetStatCards();
    const el = getMainContent();
    if (el) el.innerHTML = '';
  };

  window.renderUserTab = function (tab, user) {
    if (!user) return;
    destroyCalendar();
    destroyChart();

    const chatSection    = document.getElementById('chat-section');
    const mainContent    = document.getElementById('main-content');
    const veaudevSection = document.getElementById('veau-dev-manager-section');
    const pmSection      = document.getElementById('password-manager-section');
    if (chatSection)    chatSection.hidden    = true;
    if (mainContent)    mainContent.hidden    = false;
    if (veaudevSection) veaudevSection.hidden = true;
    if (pmSection)      pmSection.hidden      = true;

    if (typeof window.destroyChatPage === 'function') window.destroyChatPage();

    const vdBackBtn = document.getElementById('veaudev-content-back-btn');
    const vdEditBtn = document.getElementById('veaudev-content-edit-btn');
    const pmBackBtn = document.getElementById('password-manager-back-btn');
    const pmEditBtn = document.getElementById('password-manager-edit-btn');
    const pmEmoji   = document.getElementById('password-manager-page-emoji');
    if (vdBackBtn) vdBackBtn.hidden = true;
    if (vdEditBtn) vdEditBtn.hidden = true;
    if (pmBackBtn) pmBackBtn.hidden = true;
    if (pmEditBtn) pmEditBtn.hidden = true;
    if (pmEmoji)   pmEmoji.hidden   = true;

    const titleEl = document.getElementById('page-title');
    setPageHeader(user);

    switch (tab) {
      case 'todos':
        if (titleEl) titleEl.textContent = user.displayName || 'User';
        renderUserTasks(user);
        break;
      case 'assignedProjects':
        if (titleEl) titleEl.textContent = 'Assigned Projects';
        renderAssignedProjects(user);
        break;
      case 'ownerProjects':
        if (titleEl) titleEl.textContent = 'Owner Of Projects';
        renderOwnerProjects(user);
        break;
      case 'alarm':
        if (titleEl) titleEl.textContent = 'Overdue Tasks';
        renderAlarm(user);
        break;
      default:
        renderUserTasks(user);
    }
  };

  window.loadUserView = function (user) {
    if (!user) return;
    window.appState.selectedUser = user;
    if (typeof window.showUserSidebar === 'function') window.showUserSidebar(user);
  };

  window.resetDashboard = function () {
    destroyCalendar();
    destroyChart();
    resetStatCards();
    clearPageHeader();
    const el = getMainContent();
    if (el) el.innerHTML = '';
  };

})();
