<?php
declare(strict_types=1);

$sidebarConfig = $sidebarConfig ?? [];
$mainSections  = $sidebarConfig['main_sections'] ?? [];
?>
<div id="main-sidebar-panel">
  <?php foreach ($mainSections as $section): ?>
    <?php require __DIR__ . '/sidebar-section.php'; ?>
  <?php endforeach; ?>

  <section class="sidebar-collapsible" data-sidebar-section="project-managers">
    <button type="button" class="sidebar-section-toggle" data-sidebar-toggle="project-managers" aria-expanded="true">
      <span class="sidebar-section-label">Project Managers</span>
      <span class="sidebar-section-indicator" aria-hidden="true">▾</span>
    </button>
    <div class="sidebar-section-content" data-sidebar-content="project-managers">
      <nav class="user-list" id="sidebar-managers-list">
        <div class="muted-text" style="padding: 6px 12px;">No project managers found.</div>
      </nav>
    </div>
  </section>

  <section class="sidebar-collapsible" data-sidebar-section="team-members">
    <button type="button" class="sidebar-section-toggle" data-sidebar-toggle="team-members" aria-expanded="true">
      <span class="sidebar-section-label">Team Members</span>
      <span class="sidebar-section-indicator" aria-hidden="true">▾</span>
    </button>
    <div class="sidebar-section-content" data-sidebar-content="team-members">
      <nav class="user-list" id="sidebar-members-list">
        <div class="muted-text" style="padding: 6px 12px;">No team members found.</div>
      </nav>
    </div>
  </section>

  <section class="sidebar-collapsible" data-sidebar-section="pinned-projects">
    <button type="button" class="sidebar-section-toggle" data-sidebar-toggle="pinned-projects" aria-expanded="true">
      <span class="sidebar-section-label">Pinned Projects</span>
      <span class="sidebar-section-indicator" aria-hidden="true">▾</span>
    </button>
    <div class="sidebar-section-content" data-sidebar-content="pinned-projects">
      <nav class="user-list" id="sidebar-pinned-projects-list">
        <div class="muted-text" style="padding: 6px 12px;">No pinned projects yet.</div>
      </nav>
    </div>
  </section>

  <div style="padding: 10px 10px 16px; margin-top: auto;">
    <button id="sign-out-btn" type="button" class="switch-user-btn" style="width:100%; justify-content:center;">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      Sign out
    </button>
  </div>
</div>
