<?php
try {
    $pdo = new PDO("mysql:host=127.0.0.1;dbname=eligtasmo", "root", "");
    echo "SUCCESS: Connected to eligtasmo database!\n";
} catch (Exception $e) {
    echo "FAILED: " . $e->getMessage() . "\n";
}
