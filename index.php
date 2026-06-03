<?php
declare(strict_types=1);

$sidebarConfig = require __DIR__ . '/config/sidebar.php';
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Veau Manager</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="./css/style.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/index.global.min.css">
</head>
<body>

  <!--Login modal-->
  <div id="modal" class="modal-backdrop">
    <section class="app-card" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <div class="modal-header">
        <h1 id="modalTitle">Choose your account</h1>
        <p class="subtitle">Select your Jira user to continue</p>
      </div>

      <div class="modal-body">
        <div id="message" class="message" hidden></div>

        <div class="picker">
          <button id="userPickerButton" class="picker-trigger" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="userOptions">
            <span id="pickerIcon" class="picker-icon">?</span>
            <span id="selectedUserLabel" class="picker-label">Select your username...</span>
            <span class="picker-chevron" aria-hidden="true">▾</span>
          </button>

          <div id="userDropdown" class="picker-dropdown" hidden>
            <ul id="userOptions" class="picker-options" role="listbox" aria-label="Jira users"></ul>
          </div>
        </div>

        <!-- ── Step 2: password (shown after a user is selected) ── -->
        <div id="login-password-step" hidden>
          <div class="chat-field" style="margin-top:14px;">
            <label for="login-chat-password" class="chat-field-label">Chat password</label>
            <input type="password" id="login-chat-password" class="chat-input" placeholder="Min. 6 characters" autocomplete="current-password" style="height:38px; font-family:var(--font); font-size:.875rem;">
          </div>
        </div>

        <button id="guestButton" class="guest-button" type="button">Continue as guest</button>

        <div class="actions">
          <button id="continueButton" class="button button-primary" type="button">Continue <span aria-hidden="true">&rarr;</span></button>
        </div>
      </div>
    </section>
  </div>

  <!-- ── Dashboard (shown after login) ─────────────────── -->
  <div id="dashboard" class="dashboard-layout" hidden>

    <div class="mobile-sidebar-backdrop" id="mobile-sidebar-backdrop" hidden></div>

    <aside class="sidebar" id="app-sidebar" aria-hidden="false">

      <div class="sidebar-header-wrap">
        <a class="sidebar-header" href="#">
          <img class="logo-icon" src="./assets/images/logovdv.png" alt="Veau Manager logo">
          <span class="logo-text">Veau Manager</span>
        </a>
        <button type="button" class="sidebar-mobile-toggle sidebar-mobile-close" id="mobile-sidebar-close" aria-label="Close sidebar">✕</button>
      </div>

      <?php require __DIR__ . '/components/main-sidebar-panel.php'; ?>

      <div id="user-sidebar-panel" hidden></div>

    </aside>

    <!-- Main -->
    <main class="main" id="app-main">

      <div class="main-mobile-bar">
        <a class="sidebar-header" href="#" style="text-decoration:none; display:flex; align-items:center; gap:8px; padding:0;">
          <span class="logo-text" style="color: var(--text-primary);">Veau Manager</span>
        </a>
        <button type="button" class="sidebar-mobile-toggle sidebar-mobile-open" id="mobile-sidebar-open" aria-controls="app-sidebar" aria-expanded="false" aria-label="Open sidebar">☰</button>
      </div>

      <div class="content-area">
        <header class="content-header">
          <div class="content-header-left">
            <div id="page-avatar"></div>
            <div>
              <h1 class="content-title" id="page-title">Overview</h1>
              <p class="content-subtitle" id="page-subtitle" hidden></p>
            </div>
            <p class="veaudev-project-detail-label" id="veaudev-project-build-type-icon" hidden></p>
            <span class="password-manager-page-emoji" id="password-manager-page-emoji" hidden aria-hidden="true"></span>
          </div>
          <button type="button" class="third-btn" id="veaudev-content-back-btn" hidden>Go back</button>
          <button type="button" class="third-btn" id="veaudev-content-edit-btn" hidden>✏️ Edit</button>
          <button type="button" class="third-btn" id="password-manager-back-btn" hidden>Go back</button>
          <button type="button" class="third-btn" id="password-manager-edit-btn" hidden>✏️ Edit</button>
        </header>
        <div id="main-content"></div>

        <!-- ── Chat section (shown when All Chats tab is active) ──── -->
        <div id="chat-section" class="section" hidden>
          <div class="all-chats-layout" id="all-chats-layout">

            <aside class="all-chats-projects-pane">
              <div class="chats-search-wrap">
                <svg class="chats-search-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" stroke-width="1.6"/>
                  <path d="M13 13L17 17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                </svg>
                <input type="text" id="all-chats-project-search" class="chat-input" placeholder="Search projects…" autocomplete="off">
                <button class="chats-search-clear" id="all-chats-project-search-clear" aria-label="Clear" hidden>×</button>
              </div>
              <div id="all-chats-project-list" class="chats-project-list all-chats-project-list">
                <div class="issue-empty">Loading projects…</div>
              </div>
              <p class="chats-no-results" id="all-chats-projects-no-results" hidden>No projects match your search.</p>
            </aside>

            <div class="all-chats-chat-pane">
              <div id="all-chats-chat-feedback" class="chat-feedback" hidden></div>

              <div id="all-chats-chat-room" class="chat-room-view" hidden>
                <div class="chat-room-header">
                  <button type="button" id="all-chats-back-to-projects" class="chat-room-header__back" aria-label="Back to projects">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
                  </button>
                  <div id="all-chats-chat-room-title" class="chat-room-header__title">No project selected</div>
                </div>

                <div id="all-chats-chat-messages" class="chat-messages" role="log" aria-live="polite" aria-label="Chat messages"></div>

                <form id="all-chats-chat-form" class="chat-compose" novalidate>
                  <div id="all-chats-reply-preview" class="chat-reply-preview" hidden>
                    <div class="chat-reply-preview__meta">Replying to <span id="all-chats-reply-name"></span></div>
                    <div id="all-chats-reply-text" class="chat-reply-preview__text"></div>
                    <button type="button" id="all-chats-reply-cancel" class="chat-reply-preview__cancel" aria-label="Cancel reply">×</button>
                  </div>
                  <div id="all-chats-attachment-preview" class="chat-attachment-preview" hidden>
                    <div class="chat-attachment-preview__meta">Attachments</div>
                    <div class="chat-attachment-preview__list" id="all-chats-attachment-list"></div>
                  </div>
                  <input type="text" id="all-chats-chat-message-input" class="chat-compose__input chat-input" placeholder="Type a message and use @Name to tag" maxlength="1000" autocomplete="off">
                  <button type="button" class="chat-compose__upload" data-folder-upload aria-label="Attach files from server">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  </button>
                  <button type="submit" class="chat-compose__send" aria-label="Send message">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </button>
                </form>

                <div id="all-chats-mention-menu" class="chats-project-list" hidden style="margin-top:8px; max-height:180px; min-height:0;"></div>
              </div>
            </div>

          </div>
        </div>

        <!-- ── VeauDev Manager section ────────────────────────────── -->
        <section class="section" id="veau-dev-manager-section" hidden>
          <div id="veaudev-projects-view">
            <div class="section-header-row">
              <h2 class="section-title">Web Projects</h2>
              <div class="veaudev-date-filter">
                <button type="button" class="filter-button-webprojects-type" id="filter-button-type-all">All</button>
                <button type="button" class="filter-button-webprojects-type" id="filter-button-type-webflow">Webflow</button>
                <button type="button" class="filter-button-webprojects-type" id="filter-button-type-custom">Custom</button>
                <button type="button" class="filter-button-webprojects-type" id="filter-button-type-other">Other</button>
                <button type="button" class="filter-button-webprojects" id="filter-button-date" aria-haspopup="true" aria-expanded="false">Date</button>
                <div class="veaudev-date-filter-menu" id="veaudev-date-filter-menu" hidden>
                  <button type="button" class="veaudev-date-filter-option" data-sort-order="newest">Newest</button>
                  <button type="button" class="veaudev-date-filter-option" data-sort-order="oldest">Oldest</button>
                </div>
              </div>
              <button type="button" class="add-web-project-button" id="add-web-project-btn">+</button>
            </div>
            <div class="veaudev-project-search-wrap">
              <input type="search" id="veaudev-project-search" class="add-web-project-input veaudev-project-search" placeholder="Search project..." autocomplete="off">
            </div>
            <ul class="issue-list" id="veau-dev-project-list">
              <li class="issue-empty">No projects yet.</li>
            </ul>
          </div>

          <div class="veaudev-project-build-type-row" id="veaudev-project-build-type-row" hidden>
            <p class="veaudev-project-detail-label" id="veaudev-project-build-type-label"></p>
            <button type="button" class="third-btn veaudev-copy-btn" id="veaudev-project-build-type-copy" data-copy-target="#veaudev-project-build-type-label" hidden>📄</button>
          </div>

          <div id="veaudev-project-detail-view" hidden>
            <div>
              <div class="veaudev-project-info">
                <div>
                  <h2 class="veaudev-project-detail-title">Project Notes</h2>
                  <p class="veaudev-project-notes"></p>
                </div>
                <div>
                  <h2 class="veaudev-project-detail-title">Project Login</h2>
                  <div class="veaudev-login-row" hidden>
                    <div class="veaudev-project-login-content">
                      <strong id="veaudev-project-login-choice" class="veaudev-login-value">-</strong>
                    </div>
                  </div>
                  <div class="veaudev-login-row" hidden>
                    <div class="veaudev-project-login-content">
                      <span class="veaudev-login-label">Host:</span>
                      <strong id="veaudev-project-host" class="veaudev-login-value">-</strong>
                    </div>
                    <button type="button" class="third-btn veaudev-copy-btn" data-copy-target="#veaudev-project-host">📄</button>
                  </div>
                  <div class="veaudev-login-row" hidden>
                    <div class="veaudev-project-login-content">
                      <span class="veaudev-login-label">Username:</span>
                      <strong id="veaudev-project-username" class="veaudev-login-value">-</strong>
                    </div>
                    <button type="button" class="third-btn veaudev-copy-btn" data-copy-target="#veaudev-project-username">📄</button>
                  </div>
                  <div class="veaudev-login-row" hidden>
                    <div class="veaudev-project-login-content">
                      <span class="veaudev-login-label">Password:</span>
                      <strong id="veaudev-project-password" class="veaudev-login-value" data-password="">-</strong>
                    </div>
                    <button type="button" class="third-btn veaudev-copy-btn" data-copy-target="#veaudev-project-password" data-copy-password="true">📄</button>
                  </div>
                  <div class="veaudev-login-row" hidden>
                    <div class="veaudev-project-login-content">
                      <span class="veaudev-login-label">Link:</span>
                      <strong id="veaudev-project-link" class="veaudev-login-value">-</strong>
                    </div>
                    <button type="button" class="third-btn" id="veaudev-project-open-login-link" hidden>Open</button>
                  </div>
                  <div class="veaudev-login-row" hidden>
                    <div class="veaudev-project-login-content">
                      <span class="veaudev-login-label">Port:</span>
                      <strong id="veaudev-project-port" class="veaudev-login-value">-</strong>
                    </div>
                    <button type="button" class="third-btn veaudev-copy-btn" data-copy-target="#veaudev-project-port">📄</button>
                  </div>
                  <div class="veaudev-login-row" hidden>
                    <div class="veaudev-project-login-content">
                      <strong id="veaudev-project-personal-notes" class="veaudev-login-value">-</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div class="files-container">
                <div>
                  <h2 class="veaudev-project-detail-title">Webdesign</h2>
                  <p class="veaudev-project-design-empty" id="veaudev-project-design-empty" hidden>No design yet.</p>
                  <div id="veaudev-project-detail-meta" hidden>
                    <span id="veaudev-project-detail-file"></span>
                    <button type="button" class="primaire-btn" id="veaudev-project-open-finder-btn">Open in Finder</button>
                  </div>
                  <button type="button" class="primaire-btn" id="veaudev-project-open-link-btn" hidden>Open link</button>
                </div>
                <div class="veaudev-project-folder-section" id="veaudev-project-archive-section" hidden>
                  <h2 class="veaudev-project-detail-title">Archief folder</h2>
                  <button type="button" class="primaire-btn" id="veaudev-project-open-archive-btn" hidden>Open in Finder</button>
                </div>
                <div class="veaudev-project-folder-section" id="veaudev-project-assets-section" hidden>
                  <h2 class="veaudev-project-detail-title">Assets folder</h2>
                  <button type="button" class="primaire-btn" id="veaudev-project-open-assets-btn" hidden>Open in Finder</button>
                </div>
              </div>

              <div id="veaudev-build-tasks-wrap" hidden>
                <div class="veaudev-tasks-header-main">
                  <h3 class="veaudev-tasks-title-main">Tasks</h3>
                  <div class="veaudev-task-actions">
                    <div class="veaudev-date-filter veaudev-task-filter">
                      <button type="button" class="filter-button-webprojects" id="veaudev-task-filter-assignee-btn" aria-haspopup="true" aria-expanded="false">Assigned to</button>
                      <div class="veaudev-date-filter-menu" id="veaudev-task-filter-assignee-menu" hidden>
                        <button type="button" class="veaudev-date-filter-option" data-task-assignee-filter="">All</button>
                      </div>
                    </div>
                    <div class="veaudev-date-filter veaudev-task-filter">
                      <button type="button" class="filter-button-webprojects" id="veaudev-task-filter-priority-btn" aria-haspopup="true" aria-expanded="false">Priority</button>
                      <div class="veaudev-date-filter-menu" id="veaudev-task-filter-priority-menu" hidden>
                        <button type="button" class="veaudev-date-filter-option" data-task-priority-filter="">All</button>
                        <button type="button" class="veaudev-date-filter-option" data-task-priority-filter="low">Low</button>
                        <button type="button" class="veaudev-date-filter-option" data-task-priority-filter="medium">Medium</button>
                        <button type="button" class="veaudev-date-filter-option" data-task-priority-filter="high">High</button>
                      </div>
                    </div>
                    <button type="button" class="veaudev-add-custom-task-btn" id="veaudev-add-custom-task-btn" aria-label="Add custom task">+</button>
                  </div>
                </div>
                <div class="veaudev-tasks-columns">
                  <div class="veaudev-task-column" id="veaudev-task-column-default">
                    <div class="veaudev-tasks-header"><h3 class="veaudev-tasks-title">Default Tasks</h3></div>
                    <ul id="veaudev-build-tasks-list" class="veaudev-build-task-list"></ul>
                  </div>
                  <div class="veaudev-task-column" id="veaudev-task-column-custom">
                    <div class="veaudev-custom-tasks-header"><h3 class="veaudev-tasks-title">Custom Tasks</h3></div>
                    <ul id="veaudev-custom-tasks-list" class="veaudev-build-task-list"></ul>
                  </div>
                  <div class="veaudev-task-column" id="veaudev-task-column-done">
                    <div class="veaudev-done-tasks-header"><h3 class="veaudev-tasks-title">Done</h3></div>
                    <ul id="veaudev-done-tasks-list" class="veaudev-build-task-list"></ul>
                  </div>
                </div>
              </div>

              <div class="veaudev-project-danger-zone">
                <button type="button" class="third-btn veaudev-delete-project-btn" id="veaudev-delete-project-btn">Delete project</button>
              </div>
            </div>
          </div>
        </section>

        <!-- ── Password Manager section ────────────────────────────── -->
        <section class="section" id="password-manager-section" hidden>
          <div id="password-manager-projects-view">
            <div class="section-header-row password-manager-projects-header">
              <button type="button" class="add-web-project-button" id="add-password-project-btn">+</button>
            </div>
            <div class="password-manager-filter-row" aria-label="Filter passwords by type">
              <button type="button" class="awp-type-btn password-manager-filter-btn is-selected" data-password-filter="all" aria-pressed="true">All</button>
              <button type="button" class="awp-type-btn password-manager-filter-btn" data-password-filter="licence" aria-pressed="false">Licence</button>
              <button type="button" class="awp-type-btn password-manager-filter-btn" data-password-filter="login" aria-pressed="false">Login</button>
            </div>
            <div class="veaudev-project-search-wrap">
              <input type="search" id="password-project-search" class="add-web-project-input veaudev-project-search" placeholder="Search a password..." autocomplete="off">
            </div>
            <ul class="issue-list" id="password-project-list">
              <li class="issue-empty">No passwords yet.</li>
            </ul>
          </div>

          <div id="password-manager-detail-view" hidden>
            <div class="veaudev-project-info">
              <div>
                <h2 class="veaudev-project-detail-title">Credentials</h2>
                <p id="password-project-entry-type" class="veaudev-login-label" style="margin-bottom:10px;"></p>
                <div class="veaudev-login-row" hidden>
                  <div class="veaudev-project-login-content">
                    <span class="veaudev-login-label">Username:</span>
                    <strong id="password-project-username" class="veaudev-login-value">-</strong>
                  </div>
                  <button type="button" class="third-btn veaudev-copy-btn" data-copy-target="#password-project-username">📄</button>
                </div>
                <div class="veaudev-login-row" hidden>
                  <div class="veaudev-project-login-content">
                    <span class="veaudev-login-label">Password:</span>
                    <strong id="password-project-password" class="veaudev-login-value" data-password="">-</strong>
                  </div>
                  <button type="button" class="third-btn veaudev-copy-btn" data-copy-target="#password-project-password" data-copy-password="true">📄</button>
                </div>
                <div class="veaudev-login-row" hidden>
                  <div class="veaudev-project-login-content">
                    <span class="veaudev-login-label">Licence:</span>
                    <strong id="password-project-licence" class="veaudev-login-value">-</strong>
                  </div>
                  <button type="button" class="third-btn veaudev-copy-btn" data-copy-target="#password-project-licence">📄</button>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>

    </main>
  </div> 

  <!-- ── Task Modal ─────────────────────────────────── -->
  <div class="tm-backdrop" id="tm-backdrop" aria-hidden="true"></div>
  <div class="tm-dialog" id="tm-dialog" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="tm-project-title">
    <div class="tm-card">
      <button class="tm-close" id="tm-close" type="button" aria-label="Close">×</button>
      <div class="tm-header">
        <div class="tm-title" id="tm-project-title">Project</div>
        <div class="tm-subtitle" id="tm-meta"></div>
      </div>
      <div class="tm-body">
        <div class="tm-section">
          <div class="tm-label">TODO</div>
          <div class="tm-task-title" id="tm-task-title">Task title</div>
        </div>
        <div class="tm-section tm-section--feedback">
          <div class="tm-label tm-label--feedback">FEEDBACK</div>
          <div class="tm-feedback-meta" id="tm-feedback-meta"></div>
          <div class="tm-feedback-text" id="tm-feedback-text">No feedback yet.</div>
          <div class="tm-feedback-nav">
            <button class="tm-feedback-arrow" id="tm-feedback-prev" type="button" aria-label="Previous feedback">←</button>
            <span class="tm-feedback-pos" id="tm-feedback-pos">0 / 0</span>
            <button class="tm-feedback-arrow" id="tm-feedback-next" type="button" aria-label="Next feedback">→</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Chat Auth Modal ────────────────────────────────── -->
  <div id="chat-auth-backdrop" class="chat-auth-backdrop" aria-hidden="true"></div>
  <div id="chat-auth-modal" class="chat-auth-modal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="chat-auth-title">
    <div class="chat-auth-card">
      <button id="chat-auth-close" class="chat-auth-close" type="button" aria-label="Close">×</button>
      <div class="chat-auth-header">
        <div class="chat-auth-title" id="chat-auth-title">All Chats Sign In</div>
        <div class="chat-auth-subtitle" id="chat-auth-subtitle">Enter your chat password</div>
      </div>
      <div class="chat-auth-body">
        <div id="chat-auth-feedback" class="chat-feedback" hidden></div>
        <form id="chat-auth-form" class="chat-login-form" novalidate>
          <div class="chat-field">
            <label for="chat-auth-password" class="chat-field-label">Password</label>
            <input type="password" id="chat-auth-password" class="chat-input" placeholder="Min. 6 characters" autocomplete="current-password" required>
          </div>
          <button type="submit" class="chat-submit-btn">Sign in / Register</button>
        </form>
      </div>
    </div>
  </div>

  <!-- ── VeauDev: Add/Edit Project Modal ──────────────── -->
  <div class="finder-backdrop" id="add-web-project-backdrop" aria-hidden="true"></div>
  <div class="finder-modal" id="add-web-project-modal" role="dialog" aria-modal="true" aria-hidden="true">
    <div class="modal-card veaudev-modal-card">
      <button class="modal-close" id="add-web-project-close" aria-label="Close">×</button>
      <div class="modal-header">
        <div class="modal-title">Add Web Project</div>
      </div>
      <div class="modal-body">
        <form id="add-web-project-form" novalidate>
          <div class="webproject-div">
            <p class="title-step">1) What's the name of the project?</p>
            <input type="text" id="add-web-project-name" class="add-web-project-input" placeholder="Project name" maxlength="190" required>
          </div>
          <div class="webproject-div">
            <p class="title-step">2) How would you like to build this site?</p>
            <div class="awp-type-choices">
              <button type="button" class="awp-type-btn awp-build-type-btn" data-value="Webflow">Webflow</button>
              <button type="button" class="awp-type-btn awp-build-type-btn" data-value="Custom">Custom</button>
              <button type="button" class="awp-type-btn awp-build-type-btn" data-value="Andere">Andere</button>
            </div>
            <input type="text" id="awp-andere-input" class="add-web-project-input awp-andere-field" placeholder="Specify…" maxlength="100" style="display:none">
          </div>
          <div class="webproject-div">
            <div class="webproject-flex">
              <div>
                <p class="title-step">3) Upload the webdesign.</p>
                <button type="button" class="primaire-btn" data-folder-upload="1" data-folder-target="design" data-finder-selection="file">Open online finder</button>
                <div id="add-web-project-design-files" class="veaudev-selected-files" hidden></div>
              </div>
              <div>
                <p class="title-step">4) What's the Figma link?</p>
                <input type="text" id="design-link" class="add-web-project-input" placeholder="Webdesign link">
              </div>
            </div>
          </div>
          <div class="webproject-div">
            <div class="webproject-flex">
              <div>
                <p class="title-step">5) Upload the archief folder.</p>
                <button type="button" class="primaire-btn" data-folder-upload="1" data-folder-target="archive" data-finder-selection="folder">Open online finder</button>
                <div id="add-web-project-archive-files" class="veaudev-selected-files" hidden></div>
              </div>
              <div>
                <p class="title-step">6) Upload the assets folder.</p>
                <button type="button" class="primaire-btn" data-folder-upload="1" data-folder-target="assets" data-finder-selection="folder">Open online finder</button>
                <div id="add-web-project-assets-files" class="veaudev-selected-files" hidden></div>
              </div>
            </div>
          </div>
          <div class="webproject-div veaudev-deploy-section" id="veaudev-deploy-section" hidden>
            <p class="title-step" id="veaudev-deploy-section-title">5) Login information</p>
            <div class="awp-type-choices veaudev-deploy-choice-buttons" id="veaudev-deploy-mode-choices">
              <button type="button" class="awp-type-btn veaudev-deploy-mode-btn" data-deploy-mode="webhosting">Webhosting</button>
              <button type="button" class="awp-type-btn veaudev-deploy-mode-btn" data-deploy-mode="filezilla">Filezilla</button>
            </div>
            <div class="veaudev-deploy-fields" id="veaudev-webhosting-fields" hidden>
              <p class="title-step">Choose which type:</p>
              <div class="awp-type-choices veaudev-deploy-choice-buttons">
                <button type="button" class="awp-type-btn veaudev-webhosting-mode-btn" data-webhosting-mode="arno">Arno login</button>
                <button type="button" class="awp-type-btn veaudev-webhosting-mode-btn" data-webhosting-mode="customLogin">Custom login</button>
                <button type="button" class="awp-type-btn veaudev-webhosting-mode-btn" data-webhosting-mode="personal">Personal</button>
              </div>
              <div class="webproject-flex veaudev-webhosting-custom-fields" id="veaudev-webhosting-custom-fields" hidden>
                <div>
                  <p class="title-step-sub">Username</p>
                  <input type="text" id="add-web-project-webhosting-username" class="add-web-project-input" placeholder="Username">
                </div>
                <div>
                  <p class="title-step-sub">Password</p>
                  <input type="text" id="add-web-project-webhosting-password" class="add-web-project-input" placeholder="Password">
                </div>
                <div>
                  <p class="title-step-sub">Webhosting Provider</p>
                  <input type="text" id="add-web-project-webhosting-link" class="add-web-project-input" placeholder="Link">
                </div>
              </div>
              <div class="veaudev-webhosting-personal-fields" id="veaudev-webhosting-personal-fields" hidden>
                <p class="title-step-sub">Personal notes</p>
                <textarea id="add-web-project-webhosting-personal-notes" class="add-web-project-input veaudev-task-notes" placeholder="Personal login?"></textarea>
              </div>
            </div>
            <div class="webproject-flex veaudev-deploy-fields" id="veaudev-filezilla-fields" hidden>
              <div>
                <p class="title-step-sub">Host</p>
                <input type="text" id="add-web-project-deploy-host" class="add-web-project-input" placeholder="Host">
              </div>
              <div>
                <p class="title-step-sub">Username</p>
                <input type="text" id="add-web-project-deploy-username" class="add-web-project-input" placeholder="Username">
              </div>
              <div>
                <p class="title-step-sub">Password</p>
                <input type="text" id="add-web-project-deploy-password" class="add-web-project-input" placeholder="Password">
              </div>
              <div>
                <p class="title-step-sub">Port</p>
                <input type="text" id="add-web-project-deploy-port" class="add-web-project-input" placeholder="Port">
              </div>
            </div>
          </div>
          <div class="webproject-div">
            <p class="title-step">Notes</p>
            <textarea id="add-web-project-notes" class="add-web-project-input veaudev-task-notes" placeholder="Add notes for this project"></textarea>
          </div>
          <div class="add-web-project-actions">
            <button type="button" id="add-web-project-cancel" class="second-btn">Cancel</button>
            <button type="submit" class="primaire-btn" id="add-web-project-save">Save</button>
          </div>
        </form>
        <div id="add-web-project-feedback" class="chat-feedback" hidden></div>
      </div>
    </div>
  </div>

  <!-- ── VeauDev: Task Modal ───────────────────────────── -->
  <div class="finder-backdrop" id="veaudev-task-backdrop" aria-hidden="true"></div>
  <div class="finder-modal" id="veaudev-task-modal" role="dialog" aria-modal="true" aria-hidden="true">
    <div class="modal-card veaudev-task-modal-card">
      <button class="modal-close" id="veaudev-task-close" aria-label="Close">×</button>
      <div class="modal-header">
        <div class="modal-title" id="veaudev-task-modal-title">Task</div>
      </div>
      <div class="modal-body">
        <form id="veaudev-task-form" novalidate>
          <div class="webproject-div">
            <p class="title-step">Task name</p>
            <input type="text" id="veaudev-task-name" class="add-web-project-input" placeholder="Task name" maxlength="255">
          </div>
          <div class="webproject-div">
            <p class="title-step">Assign to</p>
            <input type="hidden" id="veaudev-task-assignee" value="">
            <div class="veaudev-user-picker" id="veaudev-task-assignee-picker">
              <button type="button" class="veaudev-user-picker-btn" id="veaudev-task-assignee-btn" aria-haspopup="listbox" aria-expanded="false">
                <span class="veaudev-user-picker-current" id="veaudev-task-assignee-current">
                  <span class="veaudev-user-picker-avatar avatar-fallback">U</span>
                  <span class="veaudev-user-picker-text">Unassigned</span>
                </span>
                <span class="veaudev-user-picker-chevron" aria-hidden="true">▾</span>
              </button>
              <div class="veaudev-user-picker-menu" id="veaudev-task-assignee-menu" role="listbox"></div>
            </div>
          </div>
          <div class="webproject-div">
            <p class="title-step">Priority</p>
            <input type="hidden" id="veaudev-task-priority" value="medium">
            <div class="awp-type-choices veaudev-task-priority-choices">
              <button type="button" class="awp-type-btn veaudev-task-priority-btn" data-task-priority="low">Low</button>
              <button type="button" class="awp-type-btn veaudev-task-priority-btn is-selected" data-task-priority="medium">Medium</button>
              <button type="button" class="awp-type-btn veaudev-task-priority-btn" data-task-priority="high">High</button>
            </div>
          </div>
          <div class="webproject-div">
            <p class="title-step">Notes</p>
            <textarea id="veaudev-task-notes" class="add-web-project-input veaudev-task-notes" placeholder="Add notes for this task"></textarea>
          </div>
          <div class="add-web-project-actions veaudev-task-modal-actions">
            <button type="button" id="veaudev-task-delete" class="second-btn" hidden>Delete task</button>
            <button type="button" id="veaudev-task-cancel" class="second-btn">Cancel</button>
            <button type="submit" id="veaudev-task-save" class="primaire-btn">Save task</button>
          </div>
        </form>
        <div id="veaudev-task-feedback" class="chat-feedback" hidden></div>
      </div>
    </div>
  </div>

  <!-- ── VeauDev: Delete Project Modal ─────────────────── -->
  <div class="finder-backdrop" id="veaudev-delete-project-backdrop" aria-hidden="true"></div>
  <div class="finder-modal" id="veaudev-delete-project-modal" role="dialog" aria-modal="true" aria-hidden="true">
    <div class="modal-card veaudev-delete-project-modal-card">
      <button class="modal-close" id="veaudev-delete-project-close" aria-label="Close">×</button>
      <div class="modal-header">
        <div class="modal-title">Delete project</div>
      </div>
      <div class="modal-body">
        <p class="veaudev-delete-project-text" id="veaudev-delete-project-text">Are you sure you want to delete this project?</p>
        <div class="add-web-project-actions veaudev-delete-project-actions">
          <button type="button" id="veaudev-delete-project-cancel" class="second-btn">Cancel</button>
          <button type="button" id="veaudev-delete-project-confirm" class="second-btn veaudev-delete-project-btn">Delete project</button>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Password Manager: Add/Edit Modal ──────────────── -->
  <div class="finder-backdrop" id="add-password-project-backdrop" aria-hidden="true"></div>
  <div class="finder-modal" id="add-password-project-modal" role="dialog" aria-modal="true" aria-hidden="true">
    <div class="modal-card veaudev-modal-card" style="height:auto; max-height:92vh;">
      <button class="modal-close" id="add-password-project-close" aria-label="Close">×</button>
      <div class="modal-header">
        <div class="modal-title" id="password-manager-modal-title">Add Password Project</div>
      </div>
      <div class="modal-body">
        <form id="add-password-project-form" novalidate>
          <div class="webproject-div">
            <p class="title-step">1) What's the name of the project?</p>
            <input type="text" id="add-password-project-name" class="add-web-project-input" placeholder="Project name" maxlength="190" required>
          </div>
          <div class="webproject-div">
            <p class="title-step">2) What do you want to save?</p>
            <div class="awp-type-choices">
              <button type="button" class="awp-type-btn password-entry-type-btn" data-entry-type="login">Login</button>
              <button type="button" class="awp-type-btn password-entry-type-btn" data-entry-type="licence">Licence</button>
            </div>
          </div>
          <div class="webproject-div password-entry-fields" id="password-entry-login-fields" hidden>
            <div class="webproject-flex">
              <div>
                <p class="title-step-sub">Username</p>
                <input type="text" id="add-password-project-username" class="add-web-project-input" placeholder="Username">
              </div>
              <div>
                <p class="title-step-sub">Password</p>
                <input type="text" id="add-password-project-password" class="add-web-project-input" placeholder="Password">
              </div>
            </div>
          </div>
          <div class="webproject-div password-entry-fields" id="password-entry-licence-fields" hidden>
            <p class="title-step-sub">Licence key</p>
            <textarea id="add-password-project-licence" class="add-web-project-input password-project-licence-textarea" placeholder="Licence key"></textarea>
          </div>
          <div class="add-web-project-actions">
            <button type="button" id="add-password-project-delete" class="second-btn veaudev-delete-project-btn" hidden>Delete</button>
            <button type="button" id="add-password-project-cancel" class="second-btn">Cancel</button>
            <button type="submit" class="primaire-btn" id="add-password-project-save">Save</button>
          </div>
        </form>
        <div id="add-password-project-feedback" class="chat-feedback" hidden></div>
      </div>
    </div>
  </div>

  <!-- ── Password Manager: Delete Modal ────────────────── -->
  <div class="finder-backdrop" id="password-delete-project-backdrop" aria-hidden="true"></div>
  <div class="finder-modal" id="password-delete-project-modal" role="dialog" aria-modal="true" aria-hidden="true">
    <div class="modal-card veaudev-delete-project-modal-card">
      <button class="modal-close" id="password-delete-project-close" aria-label="Close">×</button>
      <div class="modal-header">
        <div class="modal-title">Delete</div>
      </div>
      <div class="modal-body">
        <p class="veaudev-delete-project-text" id="password-delete-project-text">Are you sure you want to delete this password?</p>
        <div class="add-web-project-actions veaudev-delete-project-actions">
          <button type="button" id="password-delete-project-cancel" class="second-btn">Cancel</button>
          <button type="button" id="password-delete-project-confirm" class="second-btn veaudev-delete-project-btn">Delete password</button>
        </div>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/index.global.min.js"></script>
  <script src="./js/userDashboard.js"></script>
  <script src="./js/sideDashboard.js"></script>
  <script src="./features/chat/chat.js"></script>
  <script src="./features/finder/finder.js"></script>
  <script src="./js/login.js"></script>
  <script src="./features/veaudev/veaudev.js"></script>
  <script src="./features/password/password.js"></script>
</body>
</html>
