<?php
declare(strict_types=1);

$item = $item ?? [];

$classes = ['user-item'];
if (!empty($item['active'])) {
    $classes[] = 'active';
}

$attrs = [
    'href="#"',
];

if (!empty($item['tab'])) {
    $attrs[] = 'data-tab="' . htmlspecialchars((string) $item['tab'], ENT_QUOTES, 'UTF-8') . '"';
}
if (!empty($item['title'])) {
    $attrs[] = 'data-title="' . htmlspecialchars((string) $item['title'], ENT_QUOTES, 'UTF-8') . '"';
}
if (!empty($item['hidden_for_guest'])) {
    $attrs[] = 'data-guest-hidden="1"';
}
?>
<a class="<?= htmlspecialchars(implode(' ', $classes), ENT_QUOTES, 'UTF-8') ?>" <?= implode(' ', $attrs) ?>>
  <span class="user-name"<?php if (!empty($item['label_id'])): ?> id="<?= htmlspecialchars((string) $item['label_id'], ENT_QUOTES, 'UTF-8') ?>"<?php endif; ?>>
    <?= htmlspecialchars(trim(((string) ($item['icon'] ?? '')) . ' ' . ((string) ($item['label'] ?? ''))), ENT_QUOTES, 'UTF-8') ?>
  </span>
  <?php if (!empty($item['badge']) && is_array($item['badge'])): ?>
    <span class="nav-badge"<?php if (!empty($item['badge']['id'])): ?> id="<?= htmlspecialchars((string) $item['badge']['id'], ENT_QUOTES, 'UTF-8') ?>"<?php endif; ?><?php if (!empty($item['badge']['style'])): ?> style="<?= htmlspecialchars((string) $item['badge']['style'], ENT_QUOTES, 'UTF-8') ?>"<?php endif; ?>>
      <?= htmlspecialchars((string) ($item['badge']['text'] ?? ''), ENT_QUOTES, 'UTF-8') ?>
    </span>
  <?php endif; ?>
</a>
