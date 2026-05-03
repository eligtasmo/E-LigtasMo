<?php
require_once "cors.php";
$ports = [3306, 3307, 3308];
foreach ($ports as $port) {
    echo "Testing 127.0.0.1:$port... ";
    try {
        $pdo = new PDO("mysql:host=127.0.0.1;port=$port", "root", "");
        echo "SUCCESS!\n";
        exit(0);
    } catch (Exception $e) {
        echo "Failed: " . $e->getMessage() . "\n";
    }
}
exit(1);
?>
