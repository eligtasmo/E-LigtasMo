<?php
/**
 * Database Cleanup and Standardization Script (V2 - Web Version)
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'db.php';

try {
    echo "Starting database cleanup...\n";

    // 1. Reset Users Table
    echo "Resetting users table...\n";
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
    $pdo->exec("TRUNCATE TABLE users;");
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

    $accounts = [
        [
            'username' => 'admin',
            'full_name' => 'System Administrator',
            'role' => 'admin',
            'brgy_name' => 'All',
            'email' => 'admin@eligtasmo.com',
            'city' => 'Santa Cruz',
            'province' => 'Laguna'
        ],
        [
            'username' => 'brgy',
            'full_name' => 'Barangay Official',
            'role' => 'brgy',
            'brgy_name' => 'Santisima Cruz',
            'email' => 'brgy@eligtasmo.com',
            'city' => 'Santa Cruz',
            'province' => 'Laguna'
        ],
        [
            'username' => 'resident',
            'full_name' => 'Resident User',
            'role' => 'resident',
            'brgy_name' => 'Santisima Cruz',
            'email' => 'resident@eligtasmo.com',
            'city' => 'Santa Cruz',
            'province' => 'Laguna'
        ],
        [
            'username' => 'coordinator',
            'full_name' => 'Emergency Coordinator',
            'role' => 'coordinator',
            'brgy_name' => 'All',
            'email' => 'coordinator@eligtasmo.com',
            'city' => 'Santa Cruz',
            'province' => 'Laguna'
        ]
    ];

    $stmt = $pdo->prepare("INSERT INTO users (username, password, full_name, brgy_name, role, email, city, province, status, contact_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved', '09123456789')");

    foreach ($accounts as $acc) {
        $hashedPassword = password_hash($acc['username'], PASSWORD_DEFAULT);
        $stmt->execute([
            $acc['username'],
            $hashedPassword,
            $acc['full_name'],
            $acc['brgy_name'],
            $acc['role'],
            $acc['email'],
            $acc['city'],
            $acc['province']
        ]);
        echo "Created account: {$acc['username']}\n";
    }

    // 2. Deduplicate Shelters
    echo "Deduplicating shelters...\n";
    $pdo->exec("
        DELETE t1 FROM shelters t1
        INNER JOIN shelters t2 
        WHERE t1.id > t2.id 
        AND t1.name = t2.name 
        AND t1.latitude = t2.latitude 
        AND t1.longitude = t2.longitude
    ");

    // 3. Deduplicate Social Posts
    echo "Deduplicating social_posts...\n";
    $pdo->exec("
        DELETE t1 FROM social_posts t1
        INNER JOIN social_posts t2 
        WHERE t1.id > t2.id 
        AND t1.content = t2.content 
        AND t1.username = t2.username
    ");

    // 4. Deduplicate Flood Reports
    echo "Deduplicating incident_reports...\n";
    $pdo->exec("
        DELETE t1 FROM incident_reports t1
        INNER JOIN incident_reports t2 
        WHERE t1.id > t2.id 
        AND t1.latitude = t2.latitude 
        AND t1.longitude = t2.longitude 
        AND t1.description = t2.description
    ");

    echo "Database cleanup completed successfully!\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
