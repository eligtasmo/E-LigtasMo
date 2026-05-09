<?php
require_once "cors.php";
require_once 'db.php';

try {
    // 1. Rename flood_reports to incident_reports if flood_reports exists
    $hasFloodTable = $pdo->query("SHOW TABLES LIKE 'flood_reports'")->fetch();
    if ($hasFloodTable) {
        $pdo->exec("RENAME TABLE flood_reports TO incident_reports");
        echo "Successfully renamed flood_reports to incident_reports\n";
    }

    // 2. Add 'type' to incident_reports if missing
    $hasType = $pdo->query("SHOW COLUMNS FROM incident_reports LIKE 'type'")->fetch();
    if (!$hasType) {
        $pdo->exec("ALTER TABLE incident_reports ADD COLUMN type VARCHAR(50) DEFAULT 'Incident' AFTER user_id");
        echo "Added type to incident_reports\n";
    }

    // 3. Add 'is_passable' to incident_reports if missing (safety check)
    $hasPassable = $pdo->query("SHOW COLUMNS FROM incident_reports LIKE 'is_passable'")->fetch();
    if (!$hasPassable) {
        $pdo->exec("ALTER TABLE incident_reports ADD COLUMN is_passable TINYINT(1) DEFAULT 0");
        echo "Added is_passable to incident_reports\n";
    }

    // 4. Add 'is_passable' to hazards if missing
    $hasHazPassable = $pdo->query("SHOW COLUMNS FROM hazards LIKE 'is_passable'")->fetch();
    if (!$hasHazPassable) {
        $pdo->exec("ALTER TABLE hazards ADD COLUMN is_passable TINYINT(1) DEFAULT 0");
        echo "Added is_passable to hazards\n";
    }

} catch (Exception $e) {
    echo "Migration error: " . $e->getMessage() . "\n";
}
