<?php
/**
 * Tactical Database Initialization & Migration
 * Unifies schema and ensures all tactical columns exist.
 */
require_once 'db.php';

header("Content-Type: text/plain");
echo "Starting Database Synchronization...\n";

try {
    // 1. Create/Harden incident_reports (The Unified Table)
    echo "Synchronizing incident_reports table...\n";
    $pdo->exec("CREATE TABLE IF NOT EXISTS incident_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT DEFAULT 0,
        type VARCHAR(100) NOT NULL,
        barangay VARCHAR(100),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        severity VARCHAR(50) DEFAULT 'Moderate',
        description TEXT,
        image_path VARCHAR(255),
        media_path VARCHAR(255),
        media_paths TEXT,
        photo_url VARCHAR(255),
        reporter_name VARCHAR(255),
        reporter_contact VARCHAR(100),
        reporter_email VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Pending',
        approved_by VARCHAR(150),
        approved_at DATETIME,
        reviewed_at DATETIME,
        location_text TEXT,
        is_passable TINYINT(1) DEFAULT 1,
        allowed_modes TEXT,
        area_geojson LONGTEXT,
        bbox_north DECIMAL(10, 8),
        bbox_south DECIMAL(10, 8),
        bbox_east DECIMAL(11, 8),
        bbox_west DECIMAL(11, 8),
        rejection_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_barangay (barangay),
        INDEX idx_type (type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // 2. Create/Harden notifications
    echo "Synchronizing notifications table...\n";
    $pdo->exec("CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('info','warning','success','error') NOT NULL DEFAULT 'info',
        audience ENUM('all','residents','barangay','admins') NOT NULL DEFAULT 'all',
        brgy_name VARCHAR(100) NULL,
        user_id INT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_audience (audience),
        INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // 3. Create/Harden barangay_status
    echo "Synchronizing barangay_status table...\n";
    $pdo->exec("CREATE TABLE IF NOT EXISTS barangay_status (
        id INT AUTO_INCREMENT PRIMARY KEY,
        barangay_name VARCHAR(100) UNIQUE NOT NULL,
        status_level ENUM('safe','monitor','warning','critical') DEFAULT 'safe',
        message TEXT,
        flood_depth_cm INT DEFAULT 0,
        updated_by VARCHAR(255),
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // 4. Create/Harden shelters
    echo "Synchronizing shelters table...\n";
    $pdo->exec("CREATE TABLE IF NOT EXISTS shelters (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        lat DECIMAL(10, 8),
        lng DECIMAL(11, 8),
        capacity INT DEFAULT 0,
        occupancy INT DEFAULT 0,
        status VARCHAR(50) DEFAULT 'available',
        contact_person VARCHAR(255),
        contact_number VARCHAR(100),
        address TEXT,
        category VARCHAR(100),
        created_brgy VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    echo "\nDatabase Synchronization Complete. All tactical tables are optimized.\n";

} catch (Exception $e) {
    echo "\nERROR during synchronization: " . $e->getMessage() . "\n";
}
?>
