<?php
require_once "cors.php";
require_once 'db.php';
$stmt = $pdo->query("DESCRIBE users");
echo json_encode($stmt->fetchAll());
