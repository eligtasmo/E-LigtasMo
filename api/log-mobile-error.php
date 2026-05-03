<?php
require_once 'cors.php';
header("Content-Type: application/json");

$logFile = __DIR__ . '/mobile_error_log.txt';

$raw = file_get_contents("php://input");
$data = json_decode($raw, true);

if ($data) {
    $timestamp = date('Y-m-d H:i:s');
    $device = $data['device'] ?? 'Unknown Device';
    $message = $data['message'] ?? 'No message';
    $details = isset($data['details']) ? json_encode($data['details']) : 'No details';
    
    $logEntry = "[$timestamp] DEVICE: $device\n";
    $logEntry .= "MESSAGE: $message\n";
    $logEntry .= "DETAILS: $details\n";
    $logEntry .= "----------------------------------------\n";
    
    file_put_contents($logFile, $logEntry, FILE_APPEND);
    echo json_encode(["success" => true, "message" => "Log captured"]);
} else {
    echo json_encode(["success" => false, "message" => "No data provided"]);
}
?>
