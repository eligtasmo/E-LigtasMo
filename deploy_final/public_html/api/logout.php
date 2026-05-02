<?php
require_once 'cors.php';
require_once 'session_boot.php';
session_unset();
session_destroy();
setcookie(session_name(), '', time() - 3600, '/');
echo json_encode(['success' => true]);
?>
