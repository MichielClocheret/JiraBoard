<?php
declare(strict_types=1);

$section = $section ?? [];
$items   = $section['items'] ?? [];
?>
<section class="sidebar-collapsible" data-sidebar-section="<?= htmlspecialchars((string) ($section['key'] ?? ''), ENT_QUOTES, 'UTF-8') ?>">
  <button type="button" class="sidebar-section-toggle" data-sidebar-toggle="<?= htmlspecialchars((string) ($section['key'] ?? ''), ENT_QUOTES, 'UTF-8') ?>" aria-expanded="true">
    <span class="sidebar-section-label"><?= htmlspecialchars((string) ($section['label'] ?? ''), ENT_QUOTES, 'UTF-8') ?></span>
    <span class="sidebar-section-indicator" aria-hidden="true">▾</span>
  </button>
  <div class="sidebar-section-content" data-sidebar-content="<?= htmlspecialchars((string) ($section['key'] ?? ''), ENT_QUOTES, 'UTF-8') ?>">
    <nav class="user-list">
      <?php foreach ($items as $item): ?>
        <?php require __DIR__ . '/sidebar-tab.php'; ?>
      <?php endforeach; ?>
    </nav>
  </div>
</section>
