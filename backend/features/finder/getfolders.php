<?php
declare(strict_types=1);

require_once __DIR__ . '/../../cors.php';
require_once __DIR__ . '/../../config_path.php';

header('Content-Type: application/json; charset=utf-8');

/** @var array<string, mixed> $config */
$config = [];
$configFile = app_config_path();
if (is_file($configFile)) {
    $loaded = require $configFile;
    if (is_array($loaded)) {
        $config = $loaded;
    }
}

/**
 * Resolve the server root for the online finder.
 * Priority:
 * 1) config.php key: finder_root
 * 2) env var: JIRA_FINDER_ROOT
 * 3) common Veaudeville_Server mount points
 * 4) derived from current path when it contains /web_development/
 * 5) nearest ancestor named Veaudeville_Server
 */
$candidates = [];

if (!empty($config['finder_root']) && is_string($config['finder_root'])) {
    $candidates[] = $config['finder_root'];
}

$envFinderRoot = getenv('JIRA_FINDER_ROOT');
if (is_string($envFinderRoot) && trim($envFinderRoot) !== '') {
    $candidates[] = trim($envFinderRoot);
}

$candidates[] = '/Volumes/Veaudeville_Server';
$candidates[] = '/media/Veaudeville_Server';
$candidates[] = '/mnt/Veaudeville_Server';

$projectRoot = realpath(__DIR__ . '/../..') ?: (__DIR__ . '/../..');
$normalizedProjectRoot = str_replace('\\', '/', $projectRoot);

$webDevMarker = '/web_development/';
$markerPos = strpos($normalizedProjectRoot, $webDevMarker);
if ($markerPos !== false && $markerPos > 0) {
    $derived = substr($normalizedProjectRoot, 0, $markerPos);
    if (is_string($derived) && $derived !== '') {
        $candidates[] = $derived;
    }
}

$cursor = $projectRoot;
while ($cursor && $cursor !== DIRECTORY_SEPARATOR && dirname($cursor) !== $cursor) {
    if (strcasecmp(basename($cursor), 'Veaudeville_Server') === 0) {
        $candidates[] = $cursor;
        break;
    }
    $cursor = dirname($cursor);
}

$uniqueCandidates = [];
foreach ($candidates as $candidate) {
    if (!is_string($candidate) || trim($candidate) === '') {
        continue;
    }
    $clean = rtrim($candidate, '/');
    if ($clean === '') {
        $clean = '/';
    }
    if (!in_array($clean, $uniqueCandidates, true)) {
        $uniqueCandidates[] = $clean;
    }
}

$serverRoot = null;
foreach ($uniqueCandidates as $candidate) {
    if (is_dir($candidate) && is_readable($candidate)) {
        $serverRoot = $candidate;
        break;
    }
}

if ($serverRoot === null) {
    http_response_code(500);
    echo json_encode([
        'ok'      => false,
        'error'   => 'Server root is not accessible. Set finder_root in config.php or JIRA_FINDER_ROOT env var.',
        'checked' => $uniqueCandidates,
    ]);
    exit;
}

// Excluded folder/file names
$manualExcludedNames = [
    '#DavinciBackUp',
    '.TemporaryItems',
    '#recycle',
    'Backup Google Drive',
    'boardroom',
    'budgetten',
    'HONECTION',
    'KBF50_history',
    'klanten',
    'Productie_Leveranciers',
    'sharingbox',
    'software',
    'templates',
    '_BACKUP',
    '(A Document Being Saved By AUHelperService 2)',
    '(A Document Being Saved By AUHelperService)',
    '_Assets',
    '_TEMPLATE',
    '#Fonts',
    '#template',
    'backup_arno',
    'commands.txt',
    'synoreport',
];

$configExcluded = !empty($config['finder_exclude']) && is_array($config['finder_exclude'])
    ? $config['finder_exclude']
    : [];

$exclude = array_merge(['.', '..'], $manualExcludedNames, $configExcluded);
$exclude = array_values(array_filter(array_map(static function ($name): string {
    return is_string($name) ? trim($name) : '';
}, $exclude), static function (string $name): bool {
    return $name !== '';
}));

// Determine which directory to list
$requestedFolder = isset($_POST['folder']) && is_string($_POST['folder']) ? trim($_POST['folder']) : '';

if ($requestedFolder !== '') {
    $resolved = realpath($requestedFolder);
    if (
        $resolved === false
        || !is_dir($resolved)
        || strpos($resolved . '/', rtrim($serverRoot, '/') . '/') !== 0
    ) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Invalid or inaccessible folder path.']);
        exit;
    }
    $targetDir = $resolved;
} else {
    $targetDir = $serverRoot;
}

$entries = @scandir($targetDir);
if ($entries === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Unable to read directory.']);
    exit;
}

$allowedExtensions = [
    'ai', 'eps', 'indd',
    'psd', 'psb',
    'pdf',
    'jpg', 'jpeg',
    'png', 'gif', 'webp', 'svg',
    'mp4', 'mov', 'avi', 'mkv', 'aep', 'prproj',
    'mp3', 'wav',
    'doc', 'docx', 'txt',
    'xls', 'xlsx',
    'zip', 'rar',
    'html', 'php', 'css', 'js', 'json',
    'blend', 'blend1', 'exr', 'fbx',
];

$folders = [];
$files   = [];

foreach ($entries as $entry) {
    if (in_array($entry, $exclude, true)) {
        continue;
    }

    $fullPath = $targetDir . '/' . $entry;

    if (is_dir($fullPath)) {
        $folders[] = [
            'name' => $entry,
            'path' => $fullPath,
            'type' => 'folder',
        ];
    } elseif (is_file($fullPath)) {
        $ext = strtolower(pathinfo($entry, PATHINFO_EXTENSION));
        if (in_array($ext, $allowedExtensions, true)) {
            $files[] = [
                'name' => $entry,
                'path' => $fullPath,
                'ext'  => $ext,
                'size' => filesize($fullPath),
                'type' => 'file',
            ];
        }
    }
}

usort($folders, static function (array $a, array $b): int {
    return strcasecmp($a['name'], $b['name']);
});
usort($files, static function (array $a, array $b): int {
    return strcasecmp($a['name'], $b['name']);
});

echo json_encode([
    'ok'      => true,
    'root'    => $serverRoot,
    'current' => $targetDir,
    'folders' => $folders,
    'files'   => $files,
]);
