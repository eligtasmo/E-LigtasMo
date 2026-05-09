<?php
$file = __DIR__ . '/test_signal.txt';
$status = file_put_contents($file, "SIGNAL TEST: " . date('Y-m-d H:i:s'));
echo json_encode([
    'writable' => $status !== false,
    'path' => $file,
    'dir' => __DIR__,
    'user' => get_current_user()
]);
