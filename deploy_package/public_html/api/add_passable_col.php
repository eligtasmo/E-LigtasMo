<?php
require_once 'db.php';
try {
    $pdo->exec("ALTER TABLE hazards ADD COLUMN is_passable TINYINT(1) DEFAULT 0");
    echo "Added is_passable to hazards\n";
} catch (Exception $e) { echo "hazards: " . $e->getMessage() . "\n"; }

try {
    $pdo->exec("ALTER TABLE incidents ADD COLUMN is_passable TINYINT(1) DEFAULT 0");
    echo "Added is_passable to incidents\n";
} catch (Exception $e) { echo "incidents: " . $e->getMessage() . "\n"; }

try {
    $pdo->exec("ALTER TABLE incident_reports ADD COLUMN is_passable TINYINT(1) DEFAULT 0");
    echo "Added is_passable to incident_reports\n";
} catch (Exception $e) { echo "incident_reports: " . $e->getMessage() . "\n"; }
