<?php
$logFile = __DIR__ . '/route_debug.txt';
if (isset($_GET['file'])) {
    $requested = basename($_GET['file']);
    if (in_array($requested, ['route_debug.txt', 'here_debug.log', 'route_debug.log'])) {
        $logFile = __DIR__ . '/' . $requested;
    }
}

header('Content-Type: text/plain');
if (file_exists($logFile)) {
    echo "--- LOG START: $logFile ---\n";
    echo file_get_contents($logFile);
} else {
    echo "NO LOG FILE FOUND AT: $logFile";
}
