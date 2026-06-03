<?php
declare(strict_types=1);

header('Content-Type: application/json');

$dir   = __DIR__ . '/cache';
$count = 0;

if (is_dir($dir)) {
    foreach (glob($dir . '/*.json') as $file) {
        if (is_file($file) && unlink($file)) {
            $count++;
        }
    }
}

echo json_encode(['success' => true, 'cleared' => $count]);
