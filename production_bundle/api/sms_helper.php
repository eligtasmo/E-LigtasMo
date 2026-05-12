<?php
require_once "cors.php";
require_once 'env_helper.php';

/**
 * SMS Service Helper for E-LigtasMo
 * Uses PhilSMS API v3 with Native cURL
 */
class SMSService {
    private static $apiToken = null;
    private static $senderId = 'PhilSMS';

    private static function init() {
        if (self::$apiToken === null) {
            // Force reload env from parent directory if needed
            if (file_exists(__DIR__ . '/../.env')) {
                loadEnv(__DIR__ . '/../.env');
            }
            $raw = getenv('PHILSMS_API_TOKEN') ?: ($_ENV['PHILSMS_API_TOKEN'] ?? ($_SERVER['PHILSMS_API_TOKEN'] ?? null));
            self::$apiToken = $raw ? trim($raw) : null;
            
            // Critical Debug: Log token status (masked)
            if (self::$apiToken) {
                $masked = substr(self::$apiToken, 0, 4) . '...' . substr(self::$apiToken, -4);
                file_put_contents(__DIR__ . '/token_debug.txt', "[" . date('Y-m-d H:i:s') . "] TOKEN LOADED: $masked\n", FILE_APPEND);
            }
        }
    }

    private static function normalize($number) {
        $number = preg_replace('/[^0-9]/', '', $number);
        if (strlen($number) === 11 && substr($number, 0, 2) === '09') {
            return '63' . substr($number, 1);
        }
        if (strlen($number) === 12 && substr($number, 0, 3) === '639') {
            return $number;
        }
        return null;
    }

    public static function send($numbers, $message) {
        self::init();
        if (!self::$apiToken) {
            return ['success' => false, 'message' => 'PhilSMS API Token not configured'];
        }

        if (!is_array($numbers)) {
            $numbers = explode(',', $numbers);
        }

        $normalizedNumbers = array_filter(array_map([self::class, 'normalize'], $numbers));
        $normalizedNumbers = array_values(array_unique($normalizedNumbers));

        if (empty($normalizedNumbers)) {
            return ['success' => false, 'message' => 'No valid recipients found'];
        }

        $senderId = getenv('PHILSMS_SENDER_ID') ?: ($_ENV['PHILSMS_SENDER_ID'] ?? 'PhilSMS');
        
        $payload = [
            'recipient' => implode(',', $normalizedNumbers),
            'sender_id' => $senderId,
            'message' => $message
        ];

        // Use Native PHP cURL (Standard on Hostinger)
        $ch = curl_init('https://dashboard.philsms.com/api/v3/sms/send');
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Accept: application/json',
            'Authorization: Bearer ' . self::$apiToken
        ]);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // For compatibility

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $resData = json_decode($response, true);
        $isOk = ($httpCode >= 200 && $httpCode < 300 && (isset($resData['status']) && ($resData['status'] === 'success' || $resData['status'] === true)));

        // Tactical Logging
        $logEntry = "[" . date('Y-m-d H:i:s') . "] cURL POST: " . count($normalizedNumbers) . " numbers | Status: " . ($isOk ? 'OK' : 'FAIL') . " | Code: $httpCode | Resp: $response\n";
        file_put_contents(__DIR__ . '/philsms_v3.log', $logEntry, FILE_APPEND);

        return [
            'success' => $isOk,
            'data' => $resData,
            'recipients_count' => count($normalizedNumbers)
        ];
    }
}
?>
