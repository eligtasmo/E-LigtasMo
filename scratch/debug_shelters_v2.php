<?php
// Set up environment for the script
$_ENV['DB_HOST'] = '127.0.0.1';
$_ENV['DB_NAME'] = 'u238547610_eligtasmo';
$_ENV['DB_USER'] = 'u238547610_admin';
$_ENV['DB_PASS'] = '@Eligtasmo29';

require_once '/Applications/XAMPP/xamppfiles/htdocs/eligtasmo latest/api/db.php';

echo "SHELTERS TABLE DEBUG:\n";
try {
    $stmt = $pdo->query("SELECT id, name, created_brgy, created_by FROM shelters ORDER BY id DESC LIMIT 20");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach($rows as $row) {
        echo "ID: {$row['id']} | Name: {$row['name']} | Brgy: [{$row['created_brgy']}] | By: [{$row['created_by']}]\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
