<?php
/**
 * FULL TACTICAL CLEANUP & CONSOLIDATION
 * Merges hazards and incidents into incident_reports and removes legacy tables.
 */
require_once 'db.php';

try {
    echo "Starting Database Cleanup...\n";

    // 1. Ensure incident_reports has all necessary columns for consolidation
    $columnsToAdd = [
        'allowed_modes' => "TEXT NULL",
        'photo_url' => "TEXT NULL",
        'reporter' => "VARCHAR(150) NULL"
    ];

    foreach ($columnsToAdd as $col => $definition) {
        $check = $pdo->query("SHOW COLUMNS FROM incident_reports LIKE '$col'")->fetch();
        if (!$check) {
            $pdo->exec("ALTER TABLE incident_reports ADD COLUMN $col $definition");
            echo "Added $col to incident_reports\n";
        }
    }

    // 2. Fix status column (change ENUM to VARCHAR to prevent truncation during merge)
    $pdo->exec("ALTER TABLE incident_reports MODIFY COLUMN status VARCHAR(50) DEFAULT 'Pending'");
    echo "Converted status column to VARCHAR for flexibility.\n";

    // 2. Migrate data from hazards to incident_reports
    $hasHazards = $pdo->query("SHOW TABLES LIKE 'hazards'")->fetch();
    if ($hasHazards) {
        echo "Migrating data from hazards...\n";
        $pdo->exec("INSERT INTO incident_reports (
            type, latitude, longitude, severity, description, barangay, 
            location_text, area_geojson, bbox_north, bbox_south, bbox_east, bbox_west, 
            is_passable, allowed_modes, status, created_at, reporter_name
        ) SELECT 
            type, lat, lng, severity, description, barangay, 
            address, area_geojson, bbox_north, bbox_south, bbox_east, bbox_west, 
            is_passable, allowed_modes, status, created_at, reporter
        FROM hazards");
        echo "Migration complete.\n";
    }

    // 3. Drop Redundant Tables
    $tablesToDrop = ['hazards', 'incidents', 'access_polygons', 'danger_zones'];
    foreach ($tablesToDrop as $table) {
        $pdo->exec("DROP TABLE IF EXISTS $table");
        echo "Dropped legacy table: $table\n";
    }

    // 4. Rename columns for consistency (optional but recommended)
    // We'll keep latitude/longitude as the primary names in incident_reports for now
    // but ensure they are correctly mapped in APIs.

    echo "\nCleanup Successful! Your database is now unified.\n";
    echo "Remaining primary table: incident_reports\n";

} catch (Exception $e) {
    echo "Cleanup Error: " . $e->getMessage() . "\n";
}
