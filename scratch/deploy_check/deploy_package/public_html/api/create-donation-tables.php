<?php
require_once "cors.php";
header('Content-Type: application/json');
require_once 'db.php';

try {
    // 1. Create donation_drives table
    $pdo->exec("CREATE TABLE IF NOT EXISTS donation_drives (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        target_amount DECIMAL(15, 2) NOT NULL,
        current_amount DECIMAL(15, 2) DEFAULT 0,
        category VARCHAR(50) DEFAULT 'General',
        location VARCHAR(255),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        image_url VARCHAR(255),
        urgent TINYINT(1) DEFAULT 0,
        status ENUM('Active', 'Completed', 'Cancelled') DEFAULT 'Active',
        end_date DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 2. Create donations table
    $pdo->exec("CREATE TABLE IF NOT EXISTS donations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        drive_id INT NOT NULL,
        user_id INT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        payment_method VARCHAR(50),
        message TEXT,
        status ENUM('Pending', 'Completed', 'Failed') DEFAULT 'Completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (drive_id) REFERENCES donation_drives(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // 3. Seed some initial data if empty
    $count = $pdo->query("SELECT COUNT(*) FROM donation_drives")->fetchColumn();
    if ($count == 0) {
        $pdo->exec("INSERT INTO donation_drives (title, description, target_amount, current_amount, category, location, latitude, longitude, image_url, urgent, end_date) VALUES
        ('Help Marikina Flood Survivors', 'Raising emergency food packs for 300 families affected by the recent monsoon floods in Marikina City.', 50000.00, 35000.00, 'Foods', 'Marikina City, NCR Region', 14.6507, 121.1029, 'https://images.unsplash.com/photo-1547683905-f686c993aae5?q=80&w=800', 1, DATE_ADD(NOW(), INTERVAL 2 DAY)),
        ('Relief for Bohol Earthquake Victims', 'Targeting hygiene kits and water for 500 families in rural areas of Bohol.', 150000.00, 42000.00, 'Medical', 'Bohol, Central Visayas', 9.8500, 124.1435, 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?q=80&w=800', 0, DATE_ADD(NOW(), INTERVAL 14 DAY)),
        ('Support for Cagayan Fire Victims', 'Providing immediate financial assistance for rebuilding materials and basic necessities.', 75000.00, 12000.00, 'Financial', 'Tuguegarao, Cagayan', 17.6132, 121.7270, 'https://images.unsplash.com/photo-1542150601-3b62963a7d47?q=80&w=800', 1, DATE_ADD(NOW(), INTERVAL 7 DAY))");
    }

    echo json_encode(['success' => true, 'message' => 'Donation tables created and seeded successfully']);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
