<?php
require_once "cors.php";
require_once 'env_helper.php';

/**
 * SMS Service Helper for E-LigtasMo
 * Uses Semaphore API (semaphore.co)
 */
class SMSService {
    private static $apiToken = null;
    private static $senderId = 'PhilSMS'; // Default sender ID for PhilSMS

    private static function init() {
        if (self::$apiToken === null) {
            $raw = getenv('PHILSMS_API_TOKEN') ?: ($_ENV['PHILSMS_API_TOKEN'] ?? ($_SERVER['PHILSMS_API_TOKEN'] ?? null));
            self::$apiToken = $raw ? trim($raw) : null;
            
            // Critical Debug: Write raw token to see if it starts with "your"
            file_put_contents(__DIR__ . '/token_debug.txt', "[" . date('Y-m-d H:i:s') . "] RAW TOKEN: " . self::$apiToken . "\n", FILE_APPEND);
        }
    }

    /**
     * Send SMS to a single or multiple numbers
     * @param string|array $numbers Single number or array of numbers
     * @param string $message The message content
     * @return array Response summary
     */
    /**
     * Normalizes phone numbers to 639XXXXXXXXX format
     */
    private static function normalize($number) {
        // Remove non-numeric characters
        $number = preg_replace('/[^0-9]/', '', $number);
        
        // Strictly validate: must be exactly 11 digits and start with 09
        if (strlen($number) === 11 && substr($number, 0, 2) === '09') {
            return '63' . substr($number, 1);
        }
        
        // If it already starts with 639 and is 12 digits
        if (strlen($number) === 12 && substr($number, 0, 3) === '639') {
            return $number;
        }

        return null; // Invalid number
    }

    /**
     * Send SMS to a single or multiple numbers
     * @param string|array $numbers Single number or array of numbers
     * @param string $message The message content
     * @return array Response summary
     */
    public static function send($numbers, $message) {
        self::init();
        if (!self::$apiToken) {
            return ['success' => false, 'message' => 'PhilSMS API Token not configured'];
        }

        // Standardize input to array
        if (!is_array($numbers)) {
            $numbers = explode(',', $numbers);
        }

        // Normalize all numbers to 639... format and filter out invalid ones
        $normalizedNumbers = array_filter(array_map([self::class, 'normalize'], $numbers));
        $normalizedNumbers = array_values(array_unique($normalizedNumbers)); // Re-index

        if (empty($normalizedNumbers)) {
            return ['success' => false, 'message' => 'No valid recipients found'];
        }

        $maskedToken = substr(self::$apiToken, 0, 4) . '...' . substr(self::$apiToken, -4);
        
        $senderId = getenv('PHILSMS_SENDER_ID') ?: ($_ENV['PHILSMS_SENDER_ID'] ?? 'PhilSMS');
        
        $payload = [
            'recipient' => implode(',', $normalizedNumbers),
            'sender_id' => $senderId,
            'type' => 'plain', // PhilSMS standard for SMS. If 'VOICE' appears, 'plain' may be the default fallback for unrecognized types on some accounts.
            'message' => $message
        ];
        
        $jsonPayload = json_encode($payload);
        $safePayload = escapeshellarg($jsonPayload);
        $safeToken = escapeshellarg(self::$apiToken);
        
        // Use system curl to bypass PHP library quirks which were causing Unauthenticated errors
        $cmd = "curl -s -X POST https://dashboard.philsms.com/api/v3/sms/send " .
               "-H \"Content-Type: application/json\" " .
               "-H \"Accept: application/json\" " .
               "-H \"Authorization: Bearer " . self::$apiToken . "\" " .
               "-d $safePayload";
               
        $output = shell_exec($cmd);
        $response = json_decode($output, true);
        
        $isOk = (isset($response['status']) && ($response['status'] === 'success' || $response['status'] === true));
        
        // Tactical Logging
        $logEntry = "[" . date('Y-m-d H:i:s') . "] EXEC CURL TO: " . count($normalizedNumbers) . " | OK: " . ($isOk ? 'YES' : 'NO') . " | TOKEN: $maskedToken | RESP: $output\n";
        file_put_contents(__DIR__ . '/philsms_v3.log', $logEntry, FILE_APPEND);

        return [
            'success' => $isOk,
            'data' => $response,
            'recipients_count' => count($normalizedNumbers)
        ];
    }
}
