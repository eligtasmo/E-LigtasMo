<?php
require 'api/db.php';
$stmt = $pdo->query("SHOW TABLES");
$tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
file_put_contents('scratch/tables.txt', implode("\n", $tables));
?>
