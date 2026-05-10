<?php
$_ENV['DB_HOST'] = '127.0.0.1';
$_ENV['DB_NAME'] = 'u238547610_eligtasmo';
$_ENV['DB_USER'] = 'u238547610_admin';
$_ENV['DB_PASS'] = '@Eligtasmo29';

require_once '/Applications/XAMPP/xamppfiles/htdocs/eligtasmo latest/api/db.php';

echo "USER BRGY_NAME DEBUG:\n";
try {
    $stmt = $pdo->query("SELECT username, brgy_name, role FROM users WHERE role IN ('brgy', 'brgy_chair')");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach($rows as $row) {
        echo "User: {$row['username']} | Role: {$row['role']} | Brgy: [{$row['brgy_name']}]\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

echo "\nBARANGAYS TABLE:\n";
try {
    $stmt = $pdo->query("SELECT name FROM barangays");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach($rows as $row) {
        echo "Brgy: [{$row['name']}]\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
