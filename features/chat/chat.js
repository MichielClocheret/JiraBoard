/* js/chat.js — All Chats */

/* ── Module state ─────────────────────────────────────────── */

let chatPendingOpenKey    = '';
let chatPollTimer         = null;
let chatCurrentProjectKey = '';
let chatCurrentUserId     = null;
let chatIsAuthenticated   = false;
let chatAllProjects       = [];
let chatPinnedKeys        = new Set();
let chatLastMessageId     = 0;
let chatActiveReply       = null;
let chatPendingFiles      = [];
let chatOpenMessageMenu   = null;
let chatMentionMatch      = null;
let chatMentionItems      = [];
let chatMentionIndex      = -1;
let chatMentionUsers      = [];
let chatMentionUsersByLen = [];
let chatSelectedAccountId = '';
let chatOnPinnedRefresh   = null;
let chatRequestedKey      = '';
let chatHasOpenedRequested = false;
let chatListenersInit     = false;

/* ── Helpers ──────────────────────────────────────────────── */

function chatResolveDisplayName(nameOrId) {
  if (!nameOrId) return 'Anonymous';
  const users = (window.appState && Array.isArray(window.appState.availableUsers))
    ? window.appState.availableUsers : [];
  if (users.length) {
    const found = users.find(function (u) { return u.accountId === nameOrId; });
    if (found && found.displayName) return found.displayName;
  }
  return nameOrId;
}

function chatEsc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function chatFormatTimestamp(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    + ' ' + date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function chatSetFeedback(el, message, type) {
  if (!el) return;
  if (!message) {
    el.setAttribute('hidden', 'hidden');
    el.classList.remove('error', 'success');
    el.textContent = '';
    return;
  }
  el.removeAttribute('hidden');
  el.classList.toggle('error', type === 'error');
  el.classList.toggle('success', type === 'success');
  el.textContent = message;
}

function chatSummarize(rawMessage) {
  if (String(rawMessage || '').startsWith('__OFM1__')) {
    const p = chatParsePayload(rawMessage);
    if (p.text.trim()) return p.text;
    if (p.files.length) return 'Attached ' + p.files.length + ' file' + (p.files.length === 1 ? '' : 's');
    return '';
  }
  return String(rawMessage || '');
}

function chatIsAtBottom() {
  const el = document.getElementById('all-chats-chat-messages');
  if (!el) return true;
  return el.scrollHeight - (el.scrollTop + el.clientHeight) <= 50;
}

/* ── Auth modal ───────────────────────────────────────────── */

function chatOpenAuthModal() {
  const backdrop = document.getElementById('chat-auth-backdrop');
  const modal    = document.getElementById('chat-auth-modal');
  const pwEl     = document.getElementById('chat-auth-password');
  if (backdrop) { backdrop.classList.add('is-open'); backdrop.setAttribute('aria-hidden', 'false'); }
  if (modal)    { modal.classList.add('is-open');    modal.setAttribute('aria-hidden', 'false'); }
  chatSetFeedback(document.getElementById('chat-auth-feedback'), '');
  if (pwEl) pwEl.focus();
}

function chatCloseAuthModal() {
  const backdrop = document.getElementById('chat-auth-backdrop');
  const modal    = document.getElementById('chat-auth-modal');
  if (backdrop) { backdrop.classList.remove('is-open'); backdrop.setAttribute('aria-hidden', 'true'); }
  if (modal)    { modal.classList.remove('is-open');    modal.setAttribute('aria-hidden', 'true'); }
}

/* ── View switching ───────────────────────────────────────── */

function chatShowProjectList() {
  const layout       = document.getElementById('all-chats-layout');
  const projectsPane = layout ? layout.querySelector('.all-chats-projects-pane') : null;
  const chatPane     = layout ? layout.querySelector('.all-chats-chat-pane') : null;
  const roomWrap     = document.getElementById('all-chats-chat-room');
  const searchEl     = document.getElementById('all-chats-project-search');

  if (layout) { layout.classList.remove('chat-only'); layout.classList.add('projects-only'); }
  if (projectsPane) projectsPane.classList.remove('is-hidden');
  if (chatPane)     chatPane.classList.add('is-hidden');
  if (roomWrap)     roomWrap.setAttribute('hidden', 'hidden');

  chatClearReply();
  chatSetFeedback(document.getElementById('all-chats-chat-feedback'), '');

  if (chatPollTimer) { clearInterval(chatPollTimer); chatPollTimer = null; }

  if (chatAllProjects.length) chatRenderProjectList(searchEl ? searchEl.value : '');
  if (searchEl) searchEl.focus();
}

function chatShowChatRoom() {
  const layout       = document.getElementById('all-chats-layout');
  const projectsPane = layout ? layout.querySelector('.all-chats-projects-pane') : null;
  const chatPane     = layout ? layout.querySelector('.all-chats-chat-pane') : null;
  const roomWrap     = document.getElementById('all-chats-chat-room');

  if (layout) { layout.classList.remove('projects-only'); layout.classList.add('chat-only'); }
  if (projectsPane) projectsPane.classList.add('is-hidden');
  if (chatPane)     chatPane.classList.remove('is-hidden');
  if (roomWrap)     roomWrap.removeAttribute('hidden');
}

/* ── Mention menu ─────────────────────────────────────────── */

function chatCloseMentionMenu() {
  const el = document.getElementById('all-chats-mention-menu');
  if (el) { el.setAttribute('hidden', 'hidden'); el.innerHTML = ''; }
  chatMentionItems = [];
  chatMentionIndex = -1;
  chatMentionMatch = null;
}

function chatRenderMentionMenu(items) {
  const el    = document.getElementById('all-chats-mention-menu');
  const input = document.getElementById('all-chats-chat-message-input');
  if (!el || !input) return;

  chatMentionItems = items;
  chatMentionIndex = items.length ? 0 : -1;

  if (!items.length) { chatCloseMentionMenu(); return; }

  el.innerHTML = items.map(function (name, idx) {
    return '<button type="button" class="chats-project-item" data-mention-name="' + chatEsc(name) + '" data-mention-idx="' + idx + '">'
      + '<span class="chats-project-name">' + chatEsc(name) + '</span>'
      + '</button>';
  }).join('');
  el.removeAttribute('hidden');

  function applyActive() {
    el.querySelectorAll('.chats-project-item').forEach(function (btn) {
      btn.setAttribute('aria-selected',
        Number(btn.getAttribute('data-mention-idx')) === chatMentionIndex ? 'true' : 'false'
      );
    });
  }

  function chooseMention(name) {
    if (!chatMentionMatch) { chatCloseMentionMenu(); return; }
    const before = input.value.slice(0, chatMentionMatch.start);
    const after  = input.value.slice(chatMentionMatch.end);
    input.value  = before + '@' + name + ' ' + after;
    const caret  = (before + '@' + name + ' ').length;
    input.focus();
    input.setSelectionRange(caret, caret);
    chatCloseMentionMenu();
  }

  el.querySelectorAll('.chats-project-item').forEach(function (btn) {
    btn.addEventListener('mousedown', function (e) {
      e.preventDefault();  // keep focus on the message input so chatMentionMatch stays valid
      chooseMention(String(btn.getAttribute('data-mention-name') || ''));
    });
  });

  applyActive();

  input.onkeydown = function (e) {
    if (el.hasAttribute('hidden') || !chatMentionItems.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); chatMentionIndex = (chatMentionIndex + 1) % chatMentionItems.length; applyActive(); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); chatMentionIndex = (chatMentionIndex - 1 + chatMentionItems.length) % chatMentionItems.length; applyActive(); return; }
    if (e.key === 'Enter')     { e.preventDefault(); chooseMention(chatMentionItems[chatMentionIndex] || chatMentionItems[0]); return; }
    if (e.key === 'Escape')    { e.preventDefault(); chatCloseMentionMenu(); }
  };
}

function chatUpdateMentionMenu() {
  const input = document.getElementById('all-chats-chat-message-input');
  if (!input) return;

  const value       = input.value;
  const caret       = Number(input.selectionStart ?? value.length);
  const beforeCaret = value.slice(0, caret);
  const match       = beforeCaret.match(/(?:^|\s)@([^\s@]*)$/);
  if (!match) { chatCloseMentionMenu(); return; }

  const partial    = String(match[1] || '').trim().toLowerCase();
  chatMentionMatch = { start: caret - partial.length - 1, end: caret };
  chatRenderMentionMenu(
    chatMentionUsers.filter(function (n) { return n.toLowerCase().includes(partial); }).slice(0, 8)
  );
}

/* ── Reply ────────────────────────────────────────────────── */

function chatClearReply() {
  chatActiveReply = null;
  const previewEl = document.getElementById('all-chats-reply-preview');
  const nameEl    = document.getElementById('all-chats-reply-name');
  const textEl    = document.getElementById('all-chats-reply-text');
  if (previewEl) previewEl.setAttribute('hidden', 'hidden');
  if (nameEl)    nameEl.textContent = '';
  if (textEl)    textEl.textContent = '';
}

function chatSetReply(message) {
  const replyId = Number(message?.id || 0);
  if (!replyId) return;

  chatActiveReply = {
    id:          replyId,
    displayName: chatResolveDisplayName(String(message?.displayName || '')),
    message:     chatSummarize(message?.message || ''),
  };

  const nameEl    = document.getElementById('all-chats-reply-name');
  const textEl    = document.getElementById('all-chats-reply-text');
  const previewEl = document.getElementById('all-chats-reply-preview');
  const inputEl   = document.getElementById('all-chats-chat-message-input');

  if (nameEl)    nameEl.textContent = chatActiveReply.displayName;
  if (textEl)    textEl.textContent = chatActiveReply.message.length > 140
    ? chatActiveReply.message.slice(0, 140) + '…'
    : chatActiveReply.message;
  if (previewEl) previewEl.removeAttribute('hidden');
  if (inputEl)   inputEl.focus();
}

function chatFocusMessageById(messageId) {
  const messagesEl = document.getElementById('all-chats-chat-messages');
  if (!messagesEl) return;
  const target = messagesEl.querySelector('[data-message-id="' + CSS.escape(String(messageId)) + '"]');
  if (!target) return;
  target.classList.add('chat-message--mention-focus');
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(function () { target.classList.remove('chat-message--mention-focus'); }, 1800);
}

/* ── Message rendering ────────────────────────────────────── */

function chatAppendMentionText(container, rawText) {
  const text = String(rawText || '');
  if (!text || !text.includes('@') || !chatMentionUsersByLen.length) {
    container.textContent = text;
    return;
  }

  let cursor = 0;
  while (cursor < text.length) {
    const atIdx = text.indexOf('@', cursor);
    if (atIdx === -1) { container.append(document.createTextNode(text.slice(cursor))); break; }
    if (atIdx > cursor) container.append(document.createTextNode(text.slice(cursor, atIdx)));

    let matched = null;
    for (const cand of chatMentionUsersByLen) {
      const slice = text.substr(atIdx + 1, cand.len);
      if (slice.toLowerCase() !== cand.lower) continue;
      const after = text.charAt(atIdx + 1 + cand.len);
      if (after && !/[\s.,!?;:()\]\[]/.test(after)) continue;
      matched = cand;
      break;
    }

    if (!matched) { container.append(document.createTextNode('@')); cursor = atIdx + 1; continue; }

    const mark = document.createElement('span');
    mark.className   = 'chat-mention-mark';
    mark.textContent = '@' + matched.name;
    container.append(mark);
    cursor = atIdx + 1 + matched.len;
  }
}

/* ── Pending file attachments ─────────────────────────────────── */

function chatRenderPendingFiles() {
  const previewEl = document.getElementById('all-chats-attachment-preview');
  const listEl    = document.getElementById('all-chats-attachment-list');
  if (!previewEl || !listEl) return;

  if (!chatPendingFiles.length) {
    previewEl.setAttribute('hidden', 'hidden');
    listEl.innerHTML = '';
    return;
  }

  previewEl.removeAttribute('hidden');
  listEl.innerHTML = chatPendingFiles.map(function (file) {
    const path = String(file?.path || '');
    const name = String(file?.name || path || 'File');
    return '<span class="chat-attachment-chip" data-path="' + chatEsc(path) + '">'
      + '<span class="chat-attachment-chip__name">' + chatEsc(name) + '</span>'
      + '<button type="button" class="chat-attachment-chip__remove" data-remove-attachment="' + chatEsc(path) + '" aria-label="Remove ' + chatEsc(name) + '">×</button>'
      + '</span>';
  }).join('');
}

function chatClearPendingFiles() {
  chatPendingFiles = [];
  chatRenderPendingFiles();
}

function chatBuildOutgoingMessage(text) {
  const trimmed = String(text || '').trim();
  if (!chatPendingFiles.length) return trimmed;
  return '__OFM1__' + JSON.stringify({
    text: trimmed,
    files: chatPendingFiles.map(function (file) {
      return {
        name: String(file?.name || file?.path || 'File'),
        path: String(file?.path || ''),
        ext:  String(file?.ext  || ''),
        size: Number(file?.size || 0) || 0,
      };
    }),
  });
}

/* ── Message body rendering ───────────────────────────────────── */

function chatParsePayload(rawMessage) {
  const raw = String(rawMessage || '');
  if (!raw.startsWith('__OFM1__')) return { text: raw, files: [] };
  try {
    const parsed = JSON.parse(raw.slice(8));
    return {
      text:  typeof parsed?.text === 'string' ? parsed.text : '',
      files: Array.isArray(parsed?.files)
        ? parsed.files.map(function (f) {
            return {
              name: String(f?.name || ''),
              path: String(f?.path || ''),
              ext:  String(f?.ext  || ''),
              size: Number(f?.size || 0) || 0,
            };
          }).filter(function (f) { return f.path !== ''; })
        : [],
    };
  } catch (_) {
    return { text: raw, files: [] };
  }
}

function chatCreateMessageBody(rawMessage) {
  const payload = chatParsePayload(rawMessage);

  const wrapper = document.createElement('div');
  wrapper.className = 'chat-message__body';

  if (payload.text.trim()) {
    const textBlock = document.createElement('div');
    textBlock.className = 'chat-message__text';
    chatAppendMentionText(textBlock, payload.text);
    wrapper.append(textBlock);
  }

  if (payload.files.length) {
    const attachWrap = document.createElement('div');
    attachWrap.className = 'chat-message__attachments';
    payload.files.forEach(function (file) {
      const btn = document.createElement('button');
      btn.type      = 'button';
      btn.className = 'chat-message__attachment';
      btn.textContent = '📎 ' + (file.name || file.path);
      btn.addEventListener('click', function () {
        if (typeof window.openFinderFileAction === 'function') window.openFinderFileAction(file);
      });
      attachWrap.appendChild(btn);
    });
    wrapper.append(attachWrap);
  }

  return wrapper;
}

function chatCloseOpenMenu() {
  if (!chatOpenMessageMenu) return;
  chatOpenMessageMenu.setAttribute('hidden', 'hidden');
  const owner = chatOpenMessageMenu.closest('.chat-message__menu');
  if (owner) {
    owner.classList.remove('is-open');
    const row    = owner.closest('.chat-message');
    if (row) row.classList.remove('chat-message--menu-open');
    const toggle = owner.querySelector('.chat-message__menu-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }
  chatOpenMessageMenu = null;
}

function chatCreateMessageRow(message) {
  const row         = document.createElement('div');
  row.className     = 'chat-message';
  row.dataset.messageId = String(message.id || '');

  const msgUserId = Number(message.userId || 0);
  const isOwn     = chatCurrentUserId !== null && msgUserId > 0 && msgUserId === chatCurrentUserId;
  const isDeleted = Boolean(message.deleted);
  if (isOwn)     row.classList.add('chat-message--self');
  if (isDeleted) row.classList.add('chat-message--deleted');

  const meta     = document.createElement('div');
  meta.className = 'chat-message__meta';
  const nameSpan = document.createElement('span');
  nameSpan.textContent = chatResolveDisplayName(String(message.displayName || ''));
  const timeSpan = document.createElement('span');
  timeSpan.textContent = chatFormatTimestamp(message.createdAt);
  meta.append(nameSpan, timeSpan);

  const body = chatCreateMessageBody(message.message);
  if (isDeleted) body.classList.add('chat-message__body--deleted');

  let replyRef = null;
  if (message.reply && Number(message.reply.id || 0) > 0) {
    replyRef = document.createElement('button');
    replyRef.type      = 'button';
    replyRef.className = 'chat-message__reply-ref';
    const rName = document.createElement('span');
    rName.className   = 'chat-message__reply-ref-name';
    rName.textContent = chatResolveDisplayName(String(message.reply.displayName || ''));
    const rText = document.createElement('span');
    rText.className   = 'chat-message__reply-ref-text';
    rText.textContent = chatSummarize(message.reply.message || '');
    replyRef.append(rName, rText);
    replyRef.addEventListener('click', function () { chatFocusMessageById(message.reply.id); });
  }

  const contentRow     = document.createElement('div');
  contentRow.className = 'chat-message__content-row';
  contentRow.appendChild(body);

  if (!isDeleted) {
    const menuWrap     = document.createElement('div');
    menuWrap.className = 'chat-message__menu';

    const menuToggle     = document.createElement('button');
    menuToggle.type      = 'button';
    menuToggle.className = 'chat-message__menu-toggle';
    menuToggle.setAttribute('aria-label', 'Message actions');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.textContent = '⋯';

    const menuList     = document.createElement('div');
    menuList.className = 'chat-message__menu-list';
    menuList.setAttribute('hidden', 'hidden');

    const replyAction     = document.createElement('button');
    replyAction.type      = 'button';
    replyAction.className = 'chat-message__menu-item';
    replyAction.textContent = 'Reply';
    replyAction.addEventListener('click', function () {
      chatCloseOpenMenu();
      chatSetReply(message);
    });
    menuList.appendChild(replyAction);

    if (isOwn) {
      const deleteAction     = document.createElement('button');
      deleteAction.type      = 'button';
      deleteAction.className = 'chat-message__menu-item chat-message__menu-item--danger';
      deleteAction.textContent = 'Delete';
      deleteAction.addEventListener('click', function () {
        chatCloseOpenMenu();
        chatDeleteMessage(message.id);
      });
      menuList.appendChild(deleteAction);
    }

    menuToggle.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      const willOpen = menuList.hasAttribute('hidden');
      chatCloseOpenMenu();
      if (!willOpen) { menuWrap.classList.remove('is-open'); menuToggle.setAttribute('aria-expanded', 'false'); return; }
      menuWrap.classList.add('is-open');
      row.classList.add('chat-message--menu-open');
      menuList.removeAttribute('hidden');
      menuToggle.setAttribute('aria-expanded', 'true');
      chatOpenMessageMenu = menuList;
    });

    menuWrap.append(menuToggle, menuList);
    contentRow.appendChild(menuWrap);
  }

  row.append(meta);
  if (replyRef) row.append(replyRef);
  row.append(contentRow);
  return row;
}

/* ── Message list management ──────────────────────────────── */

function chatRenderMessages(messages, scrollMode) {
  const messagesEl = document.getElementById('all-chats-chat-messages');
  if (!messagesEl) return;

  const wasAtBottom = chatIsAtBottom();
  messagesEl.innerHTML = '';
  chatLastMessageId    = 0;

  const list = Array.isArray(messages) ? messages : [];
  if (!list.length) { messagesEl.innerHTML = '<div class="issue-empty">No messages yet.</div>'; return; }

  list.forEach(function (msg) {
    messagesEl.appendChild(chatCreateMessageRow(msg));
    chatLastMessageId = Math.max(chatLastMessageId, Number(msg.id || 0));
  });

  if (scrollMode === 'force' || (scrollMode === 'smart' && wasAtBottom)) {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
}

function chatAppendMessages(messages, scrollMode) {
  const messagesEl = document.getElementById('all-chats-chat-messages');
  if (!messagesEl) return;

  const list  = Array.isArray(messages) ? messages : [];
  const fresh = list.filter(function (msg) { return Number(msg?.id || 0) > chatLastMessageId; });
  if (!fresh.length) return;

  const wasAtBottom = chatIsAtBottom();
  if (messagesEl.querySelector('.issue-empty')) messagesEl.innerHTML = '';

  fresh.forEach(function (msg) {
    messagesEl.appendChild(chatCreateMessageRow(msg));
    chatLastMessageId = Math.max(chatLastMessageId, Number(msg.id || 0));
  });

  if (scrollMode === 'force' || (scrollMode === 'smart' && wasAtBottom)) {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
}

/* ── API calls ────────────────────────────────────────────── */

async function chatLoadMessages(scrollMode, incremental) {
  if (!chatCurrentProjectKey) return;
  const feedbackEl = document.getElementById('all-chats-chat-feedback');

  const url = new URL('./features/chat/chat.php', window.location.href);
  url.searchParams.set('action', 'messages');
  url.searchParams.set('projectKey', chatCurrentProjectKey);
  if (incremental && chatLastMessageId > 0) url.searchParams.set('afterId', String(chatLastMessageId));

  try {
    const response = await fetch(url.toString());
    const data     = await response.json();
    if (!data?.success) throw new Error(data?.message || 'Unable to load messages.');
    if (incremental) chatAppendMessages(data.messages || [], scrollMode || 'smart');
    else chatRenderMessages(data.messages || [], scrollMode || 'smart');
  } catch (err) {
    chatSetFeedback(feedbackEl, err?.message || 'Unable to load messages.', 'error');
  }
}

async function chatDeleteMessage(messageId) {
  const feedbackEl = document.getElementById('all-chats-chat-feedback');
  try {
    const response = await fetch('./features/chat/chat.php', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body:    new URLSearchParams({ action: 'delete_message', messageId: String(messageId || '') }).toString(),
    });
    const data = await response.json();
    if (!data?.success) throw new Error(data?.message || 'Unable to delete message.');
    if (chatActiveReply && Number(chatActiveReply.id || 0) === Number(messageId || 0)) chatClearReply();
    chatSetFeedback(feedbackEl, 'Message deleted.', 'success');
    chatLoadMessages('smart', false);
  } catch (err) {
    chatSetFeedback(feedbackEl, err?.message || 'Unable to delete message.', 'error');
  }
}

function chatStartPolling() {
  if (chatPollTimer) clearInterval(chatPollTimer);
  chatPollTimer = setInterval(function () { chatLoadMessages('smart', true); }, 7000);
}

/* ── Pinned sidebar ───────────────────────────────────────── */

function chatRefreshPinnedSidebar() {
  const sidebarList = document.getElementById('sidebar-pinned-projects-list');
  if (!sidebarList) return;

  const pinned = chatAllProjects.filter(function (p) { return p.pinned; });
  if (!pinned.length) {
    sidebarList.innerHTML = '<div class="muted-text" style="padding: 6px 12px;">No pinned projects yet.</div>';
    return;
  }

  sidebarList.innerHTML = '';
  pinned.forEach(function (p) {
    const a    = document.createElement('a');
    a.className = 'user-item';
    a.href      = '#';
    const span  = document.createElement('span');
    span.className   = 'user-name';
    span.textContent = '\u{1F4AC} ' + p.name;
    a.appendChild(span);
    a.addEventListener('click', function (e) { e.preventDefault(); window.openChatProject(p.key, p.name); });
    sidebarList.appendChild(a);
  });
}

/* ── Project list ─────────────────────────────────────────── */

function chatRenderProjectList(query) {
  const projectsList   = document.getElementById('all-chats-project-list');
  const searchClearBtn = document.getElementById('all-chats-project-search-clear');
  const noResultsEl    = document.getElementById('all-chats-projects-no-results');
  if (!projectsList) return;

  const q        = String(query || '').trim().toLowerCase();
  const filtered = !q ? chatAllProjects : chatAllProjects.filter(function (it) {
    return it.key.toLowerCase().includes(q) || it.name.toLowerCase().includes(q);
  });

  if (searchClearBtn) searchClearBtn.hidden = !q;
  if (noResultsEl)    noResultsEl.hidden    = filtered.length > 0;

  if (!filtered.length) { projectsList.innerHTML = '<div class="issue-empty">No projects found.</div>'; return; }

  projectsList.innerHTML = filtered.map(function (it) {
    const pinClass    = it.pinned ? ' is-pinned' : '';
    const pinTitle    = it.pinned ? 'Unpin project' : 'Pin project';
    const activeClass = it.key === chatCurrentProjectKey ? ' chats-project-item--active' : '';
    return '<button type="button" class="chats-project-item' + activeClass + '" data-key="' + chatEsc(it.key) + '" data-name="' + chatEsc(it.name) + '">'
      + '<span class="chats-project-name">' + chatEsc(it.name) + '</span>'
      + '<span class="chat-pin-toggle' + pinClass + '" data-pin-toggle="1" data-key="' + chatEsc(it.key) + '" data-pinned="' + (it.pinned ? '1' : '0') + '" title="' + pinTitle + '" aria-label="' + pinTitle + '">\u{1F4CC}</span>'
      + '</button>';
  }).join('');

  projectsList.querySelectorAll('.chats-project-item').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      if (e.target.closest('[data-pin-toggle]')) return;
      chatOpenProject(
        String(btn.getAttribute('data-key') || ''),
        String(btn.getAttribute('data-name') || '')
      );
      chatRenderProjectList(document.getElementById('all-chats-project-search')?.value || '');
    });
  });

  projectsList.querySelectorAll('[data-pin-toggle]').forEach(function (pin) {
    pin.addEventListener('click', async function (e) {
      e.preventDefault();
      e.stopPropagation();

      const key           = String(pin.getAttribute('data-key') || '').toUpperCase();
      const projectName   = String(pin.closest('.chats-project-item')?.getAttribute('data-name') || key).trim();
      const currentPinned = pin.getAttribute('data-pinned') === '1';
      if (!key) return;

      try {
        const response = await fetch('./features/chat/chat.php', {
          method:  'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
          body:    new URLSearchParams({ action: 'pin_project', projectKey: key, projectName, pinned: currentPinned ? '0' : '1' }).toString(),
        });
        const data = await response.json();
        if (!data?.success) throw new Error(data?.message || 'Unable to update project pin.');

        if (currentPinned) chatPinnedKeys.delete(key); else chatPinnedKeys.add(key);
        chatAllProjects = chatAllProjects.map(function (proj) {
          return proj.key !== key ? proj : Object.assign({}, proj, { pinned: !currentPinned });
        });
        chatAllProjects.sort(function (a, b) {
          if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
          return String(a.name || a.key).localeCompare(String(b.name || b.key));
        });

        chatRenderProjectList(document.getElementById('all-chats-project-search')?.value || '');
        chatRefreshPinnedSidebar();
        if (typeof chatOnPinnedRefresh === 'function') chatOnPinnedRefresh();
      } catch (err) {
        chatSetFeedback(document.getElementById('all-chats-chat-feedback'), err?.message || 'Unable to update project pin.', 'error');
      }
    });
  });
}

/* ── Project opening ──────────────────────────────────────── */

function chatOpenProject(key, name) {
  chatCurrentProjectKey = String(key || '').trim().toUpperCase();
  if (!chatCurrentProjectKey) return;

  chatLastMessageId = 0;

  const titleEl = document.getElementById('all-chats-chat-room-title');
  if (titleEl) titleEl.textContent = String(name || chatCurrentProjectKey);

  chatShowChatRoom();
  chatCloseAuthModal();
  chatSetFeedback(document.getElementById('all-chats-chat-feedback'), '');
  chatClearReply();
  chatLoadMessages('force', false);
  chatStartPolling();
}

function chatMaybeOpenRequested() {
  if (chatHasOpenedRequested || !chatIsAuthenticated || !chatRequestedKey || !chatAllProjects.length) return false;
  const found = chatAllProjects.find(function (p) { return p.key === chatRequestedKey; });
  if (!found) return false;
  chatHasOpenedRequested = true;
  chatOpenProject(found.key, found.name);
  chatRenderProjectList(document.getElementById('all-chats-project-search')?.value || '');
  return true;
}

/* ── Load all projects ────────────────────────────────────── */

async function chatLoadAllProjects() {
  const projectsList = document.getElementById('all-chats-project-list');

  try {
    const [projectsData, pinnedPayload] = await Promise.all([
      fetch('./Api/all-projects.php').then(function (r) { return r.json(); }),
      fetch('./features/chat/chat.php?action=pinned_projects')
        .then(function (r) { return r.json(); })
        .catch(function () { return { success: false, projects: [] }; }),
    ]);

    if (!projectsData?.ok) throw new Error(projectsData?.error || 'Failed to load projects.');

    chatPinnedKeys = new Set(
      (Array.isArray(pinnedPayload?.projects) ? pinnedPayload.projects : [])
        .map(function (item) { return String(item?.projectKey || '').toUpperCase(); })
        .filter(Boolean)
    );

    chatAllProjects = Object.entries(projectsData.projects || {}).map(function ([key, value]) {
      const k = String(key || '').toUpperCase();
      return { key: k, name: String(value?.name || k), pinned: chatPinnedKeys.has(k) };
    });

    chatAllProjects.sort(function (a, b) {
      if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
      return String(a.name || a.key).localeCompare(String(b.name || b.key));
    });

    chatRenderProjectList(document.getElementById('all-chats-project-search')?.value || '');
    chatRefreshPinnedSidebar();
    if (typeof chatOnPinnedRefresh === 'function') chatOnPinnedRefresh();
    if (!chatMaybeOpenRequested()) chatShowProjectList();
  } catch (err) {
    if (projectsList) {
      projectsList.innerHTML = '<div class="issue-empty">Failed to load projects: ' + chatEsc(err.message) + '</div>';
    }
  }
}

/* ── Auth ─────────────────────────────────────────────────── */

async function chatBootstrapAuth() {
  const feedbackEl = document.getElementById('chat-auth-feedback');
  try {
    const response = await fetch('./features/chat/chat.php?action=whoami');
    const data     = await response.json();
    if (!data?.success) throw new Error(data?.message || 'Unable to validate chat session.');

    const user = data?.user || null;
    if (user && Number(user.id || 0) > 0) {
      chatCurrentUserId   = Number(user.id || 0) || null;
      chatIsAuthenticated = true;
      chatCloseAuthModal();
      chatLoadAllProjects();
      return;
    }

    chatIsAuthenticated = false;
    chatOpenAuthModal();
  } catch (err) {
    chatIsAuthenticated = false;
    chatOpenAuthModal();
    chatSetFeedback(feedbackEl, err?.message || 'Unable to validate chat session.', 'error');
  }
}

async function chatSwitchUser() {
  try {
    await fetch('./features/chat/chat.php', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body:    new URLSearchParams({ action: 'logout' }).toString(),
    });
  } catch (_) { /* ignore */ }
  window.location.href = '?';
}

/* ── Attach all DOM event listeners (once only) ───────────── */

function chatInitListeners() {
  if (chatListenersInit) return;
  chatListenersInit = true;

  /* Auth form */
  const authForm     = document.getElementById('chat-auth-form');
  const authBackdrop = document.getElementById('chat-auth-backdrop');
  const authClose    = document.getElementById('chat-auth-close');

  if (authForm) {
    authForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const feedbackEl = document.getElementById('chat-auth-feedback');
      const pwEl       = document.getElementById('chat-auth-password');
      const password   = String(pwEl ? pwEl.value : '').trim();

      if (!chatSelectedAccountId) { chatSetFeedback(feedbackEl, 'Select a user first before signing in.', 'error'); return; }
      if (password.length < 6)    { chatSetFeedback(feedbackEl, 'Enter a password with at least 6 characters.', 'error'); return; }

      chatSetFeedback(feedbackEl, 'Signing you in…', 'success');

      try {
        const response = await fetch('./features/chat/chat.php', {
          method:  'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
          body:    new URLSearchParams({ action: 'login', password, accountId: chatSelectedAccountId }).toString(),
        });
        const data = await response.json();
        if (!data?.success) throw new Error(data?.message || 'Unable to sign in.');

        chatCurrentUserId   = Number(data?.user?.id || 0) || null;
        chatIsAuthenticated = true;
        chatSetFeedback(feedbackEl, '');
        authForm.reset();
        chatCloseAuthModal();
        chatLoadAllProjects();
      } catch (err) {
        chatIsAuthenticated = false;
        chatSetFeedback(feedbackEl, err?.message || 'Unable to sign in.', 'error');
      }
    });
  }

  if (authClose)    authClose.addEventListener('click', chatSwitchUser);
  if (authBackdrop) authBackdrop.addEventListener('click', chatSwitchUser);

  /* Back button */
  const backBtn = document.getElementById('all-chats-back-to-projects');
  if (backBtn) backBtn.addEventListener('click', chatShowProjectList);

  /* Search */
  const searchEl    = document.getElementById('all-chats-project-search');
  const searchClear = document.getElementById('all-chats-project-search-clear');
  if (searchEl) {
    searchEl.addEventListener('input', function () { chatRenderProjectList(searchEl.value || ''); });
  }
  if (searchClear) {
    searchClear.addEventListener('click', function () {
      if (searchEl) searchEl.value = '';
      chatRenderProjectList('');
      if (searchEl) searchEl.focus();
    });
  }

  /* Mention */
  const msgInput = document.getElementById('all-chats-chat-message-input');
  if (msgInput) {
    msgInput.addEventListener('input', chatUpdateMentionMenu);
    msgInput.addEventListener('click', chatUpdateMentionMenu);
    msgInput.addEventListener('blur', function () { setTimeout(chatCloseMentionMenu, 120); });
  }

  /* Reply cancel */
  const replyCancel = document.getElementById('all-chats-reply-cancel');
  if (replyCancel) replyCancel.addEventListener('click', function (e) { e.preventDefault(); chatClearReply(); });

  /* Attachment list — remove chip on click */
  const attachListEl = document.getElementById('all-chats-attachment-list');
  if (attachListEl) {
    attachListEl.addEventListener('click', function (e) {
      const removePath = e.target instanceof Element
        ? e.target.getAttribute('data-remove-attachment')
        : null;
      if (!removePath) return;
      chatPendingFiles = chatPendingFiles.filter(function (f) { return String(f?.path || '') !== removePath; });
      chatRenderPendingFiles();
    });
  }

  /* Online Finder → add selected files to pending list */
  document.addEventListener('onlineFinder:filesUploaded', function (e) {
    const uploaded = Array.isArray(e?.detail?.files) ? e.detail.files : [];
    if (!uploaded.length) return;
    const seen = new Set(chatPendingFiles.map(function (f) { return String(f?.path || ''); }));
    uploaded.forEach(function (file) {
      const p = String(file?.path || '');
      if (!p || seen.has(p)) return;
      chatPendingFiles.push(file);
      seen.add(p);
    });
    chatRenderPendingFiles();
    const inp = document.getElementById('all-chats-chat-message-input');
    if (inp) inp.focus();
  });

  /* Chat form */
  const formEl = document.getElementById('all-chats-chat-form');
  if (formEl) {
    formEl.addEventListener('submit', async function (e) {
      e.preventDefault();
      chatCloseMentionMenu();

      const feedbackEl = document.getElementById('all-chats-chat-feedback');
      const inputEl    = document.getElementById('all-chats-chat-message-input');

      if (!chatCurrentProjectKey) { chatSetFeedback(feedbackEl, 'Pick a project first.', 'error'); return; }

      const rawText = String(inputEl ? inputEl.value : '').trim();
      if (!rawText && !chatPendingFiles.length) return;
      if (rawText.length > 1000) { chatSetFeedback(feedbackEl, 'Messages are limited to 1000 characters.', 'error'); return; }

      const message = chatBuildOutgoingMessage(rawText);
      const params  = new URLSearchParams({ action: 'send', projectKey: chatCurrentProjectKey, message });
      if (chatActiveReply && Number(chatActiveReply.id || 0) > 0) {
        params.set('replyToMessageId', String(chatActiveReply.id));
      }

      try {
        const response = await fetch('./features/chat/chat.php', {
          method:  'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
          body:    params.toString(),
        });
        const data = await response.json();
        if (!data?.success) throw new Error(data?.message || 'Unable to send message.');
        if (inputEl) inputEl.value = '';
        chatClearReply();
        chatClearPendingFiles();
        chatSetFeedback(feedbackEl, '');
        chatLoadMessages('force', false);
      } catch (err) {
        chatSetFeedback(feedbackEl, err?.message || 'Unable to send message.', 'error');
      }
    });
  }

  /* Close message context menu on outside click or Escape */
  document.addEventListener('click', function (e) {
    if (!chatOpenMessageMenu) return;
    if (e.target instanceof Element && e.target.closest('.chat-message__menu')) return;
    chatCloseOpenMenu();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      const modal = document.getElementById('chat-auth-modal');
      if (modal && modal.classList.contains('is-open')) { chatSwitchUser(); return; }
      chatCloseOpenMenu();
    }
  });
}

/* ── Public API ───────────────────────────────────────────── */

window.openChatProject = function openChatProject(key, name) {
  chatPendingOpenKey  = String(key  || '').trim().toUpperCase();
  const tabEl = document.querySelector('[data-tab="allChats"]');
  if (tabEl) tabEl.click();
};

window.destroyChatPage = function destroyChatPage() {
  if (chatPollTimer) { clearInterval(chatPollTimer); chatPollTimer = null; }
  chatCurrentProjectKey  = '';
  chatCurrentUserId      = null;
  chatIsAuthenticated    = false;
  chatAllProjects        = [];
  chatPinnedKeys         = new Set();
  chatLastMessageId      = 0;
  chatActiveReply        = null;
  chatPendingFiles       = [];
  chatOpenMessageMenu    = null;
  chatMentionMatch       = null;
  chatMentionItems       = [];
  chatMentionIndex       = -1;
  chatHasOpenedRequested = false;
  chatRequestedKey       = '';
};

window.refreshChatPinnedSidebar = chatRefreshPinnedSidebar;

window.loadChatPinnedSidebar = async function loadChatPinnedSidebar() {
  const sidebarList = document.getElementById('sidebar-pinned-projects-list');
  if (!sidebarList) return;

  try {
    const response = await fetch('./features/chat/chat.php?action=pinned_projects');
    const data     = await response.json();
    if (!data?.success) return;

    const projects = Array.isArray(data.projects) ? data.projects : [];
    if (!projects.length) {
      sidebarList.innerHTML = '<div class="muted-text" style="padding: 6px 12px;">No pinned projects yet.</div>';
      return;
    }

    sidebarList.innerHTML = '';
    projects.forEach(function (p) {
      const key  = String(p.projectKey  || '').toUpperCase();
      const name = String(p.projectName || key);
      const a    = document.createElement('a');
      a.className = 'user-item';
      a.href      = '#';
      const span  = document.createElement('span');
      span.className   = 'user-name';
      span.textContent = '\u{1F4AC} ' + name;
      a.appendChild(span);
      a.addEventListener('click', function (e) {
        e.preventDefault();
        if (typeof window.openChatProject === 'function') window.openChatProject(key, name);
      });
      sidebarList.appendChild(a);
    });
  } catch (_) { /* ignore */ }
};

window.initAllChatsPage = function initAllChatsPage(config) {
  if ((config?.tab || '') !== 'allChats') return false;

  window.destroyChatPage();

  chatRequestedKey       = chatPendingOpenKey;
  chatPendingOpenKey     = '';
  chatHasOpenedRequested = false;

  chatSelectedAccountId = String(config?.selectedAccountId || '');
  chatOnPinnedRefresh   = typeof config?.onPinnedRefresh === 'function' ? config.onPinnedRefresh : null;

  const mentionUsersRaw = Array.isArray(config?.mentionUsers) ? config.mentionUsers : [];
  chatMentionUsers = mentionUsersRaw
    .map(function (u) { return String(u || '').trim(); })
    .filter(Boolean)
    .filter(function (n, i, a) {
      return a.findIndex(function (x) { return x.toLowerCase() === n.toLowerCase(); }) === i;
    })
    .sort(function (a, b) { return a.localeCompare(b); });

  chatMentionUsersByLen = chatMentionUsers.slice()
    .sort(function (a, b) { return b.length - a.length; })
    .map(function (name) { return { name, lower: name.toLowerCase(), len: name.length }; });

  const subtitle = document.getElementById('chat-auth-subtitle');
  if (subtitle && chatSelectedAccountId) {
    const selUser = (window.appState?.availableUsers || []).find(function (u) {
      return u.accountId === chatSelectedAccountId;
    });
    if (selUser?.displayName) subtitle.textContent = 'Continue as ' + selUser.displayName;
  }

  chatInitListeners();
  chatBootstrapAuth();
  chatShowProjectList();

  return true;
};
