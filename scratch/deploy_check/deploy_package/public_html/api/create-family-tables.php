<?php
require_once "cors.php";
header('Content-Type: application/json');
require_once 'db.php';

try {
    // 1. Create family_groups table
    $pdo->exec("CREATE TABLE IF NOT EXISTS family_groups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        creator_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        join_code VARCHAR(10) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 2. Create family_members table
    $pdo->exec("CREATE TABLE IF NOT EXISTS family_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        group_id INT NOT NULL,
        user_id INT NULL,
        name VARCHAR(255) NOT NULL,
        relationship VARCHAR(50),
        contact_number VARCHAR(20),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        location_name VARCHAR(255),
        status ENUM('Safe', 'Needs Help', 'Unknown') DEFAULT 'Unknown',
        profile_image VARCHAR(255),
        last_checkin TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES family_groups(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 3. Seed initial group if empty
    $count = $pdo->query("SELECT COUNT(*) FROM family_groups")->fetchColumn();
    if ($count == 0) {
        $pdo->exec("INSERT INTO family_groups (creator_id, name, join_code) VALUES (1, 'Piodos Family', 'PIODOS24')");
        $groupId = $pdo->lastInsertId();
        
        $pdo->exec("INSERT INTO family_members (group_id, user_id, name, relationship, contact_number, latitude, longitude, location_name, status, profile_image) VALUES
        ($groupId, 1, 'Darwin Piodos', 'Self', '+63 945 566 3459', 14.6507, 121.1029, 'Quezon City', 'Safe', 'https://i.pravatar.cc/150?u=darwin'),
        ($groupId, NULL, 'Ramon Piodos', 'Father', '+63 912 345 6789', 14.6510, 121.1035, 'Quezon City', 'Safe', 'https://i.pravatar.cc/150?u=ramon'),
        ($groupId, NULL, 'Myra Piodos', 'Mother', '+63 912 345 6788', 14.6520, 121.1040, 'Quezon City', 'Safe', 'https://i.pravatar.cc/150?u=myra'),
        ($groupId, NULL, 'Lalaine Cruz', 'Sister', '+63 912 345 6787', 14.6530, 121.1050, 'Quezon City', 'Needs Help', 'https://i.pravatar.cc/150?u=lalaine'),
        ($groupId, NULL, 'Lola Remy', 'Grandmother', '+63 912 345 6786', 14.6540, 121.1060, 'Quezon City', 'Safe', 'https://i.pravatar.cc/150?u=remy')");
    }

    echo json_encode(['success' => true, 'message' => 'Family check-in tables created and seeded successfully']);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
