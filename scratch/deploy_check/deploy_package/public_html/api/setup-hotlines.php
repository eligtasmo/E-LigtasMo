<?php
require_once "cors.php";
require_once 'db.php';

try {
    $sql = "CREATE TABLE IF NOT EXISTS emergency_hotlines (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        number VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL,
        icon VARCHAR(50) DEFAULT 'Phone',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )";
    $pdo->exec($sql);
    
    // Seed some data if empty
    $check = $pdo->query("SELECT COUNT(*) FROM emergency_hotlines")->fetchColumn();
    if ($check == 0) {
        $seed = [
            ['National Police', '117 / (02) 8723-0401', 'Police', 'ShieldCheck'],
            ['Fire Bureau', '117 / (02) 8723-8401', 'Fire', 'Flame'],
            ['Health Cross', '117 / (02) 8723-0401', 'Medical', 'HeartPulse'],
            ['Disaster Council', '117 / (02) 8723-0401', 'Medical', 'Radio']
        ];
        $stmt = $pdo->prepare("INSERT INTO emergency_hotlines (name, number, category, icon) VALUES (?, ?, ?, ?)");
        foreach ($seed as $row) {
            $stmt->execute($row);
        }
    }
    
    echo json_encode(['success' => true, 'message' => 'Table created and seeded successfully.']);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
