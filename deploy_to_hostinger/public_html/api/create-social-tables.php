<?php
require_once 'db.php';

try {
    // Table: social_posts
    $pdo->exec("CREATE TABLE IF NOT EXISTS social_posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        source_name VARCHAR(255) NOT NULL,
        source_type ENUM('official_page', 'mdrrmo', 'resident', 'news') DEFAULT 'official_page',
        content TEXT,
        summary TEXT,
        risk_level ENUM('low', 'medium', 'high') DEFAULT 'low',
        post_url VARCHAR(512),
        url VARCHAR(512),
        posted_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // Table: barangay_status
    $pdo->exec("CREATE TABLE IF NOT EXISTS barangay_status (
        id INT AUTO_INCREMENT PRIMARY KEY,
        barangay_name VARCHAR(100) NOT NULL UNIQUE,
        status_level ENUM('safe', 'monitor', 'warning', 'critical') DEFAULT 'safe',
        flood_depth_cm INT DEFAULT 0,
        message TEXT,
        updated_by INT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // Seed Barangay Status if empty
    $stmt = $pdo->query("SELECT COUNT(*) FROM barangay_status");
    if ($stmt->fetchColumn() == 0) {
        $barangays = ['Poblacion I', 'Poblacion II', 'Poblacion III', 'Poblacion IV', 'Poblacion V', 'Gatid', 'Labuin', 'Bubukal', 'Patimbao'];
        $insert = $pdo->prepare("INSERT INTO barangay_status (barangay_name, status_level, message) VALUES (?, 'safe', 'No incidents reported.')");
        foreach ($barangays as $b) {
            $insert->execute([$b]);
        }
    }

    echo "Tables created successfully.";
} catch (PDOException $e) {
    die("DB Error: " . $e->getMessage());
}
?>
