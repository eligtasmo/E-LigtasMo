<?php
require_once 'db.php';
$tables = ['hazards', 'incidents', 'incident_reports'];
foreach ($tables as $t) {
    echo "\nTable: $t\n";
    $stmt = $pdo->query("DESCRIBE $t");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "  {$row['Field']} ({$row['Type']})\n";
    }
}
