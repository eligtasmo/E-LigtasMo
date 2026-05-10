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
            self::$apiToken = getenv('PHILSMS_API_TOKEN') ?: ($_ENV['PHILSMS_API_TOKEN'] ?? ($_SERVER['PHILSMS_API_TOKEN'] ?? null));
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

        $ch = curl_init();
        
        // PhilSMS v3 expects 'recipient' as a string for single, or array for multiple
        $payload = [
            'sender_id' => 'PhilSMS',
            'type' => 'plain',
            'message' => $message,
            'recipient' => (count($normalizedNumbers) === 1) ? $normalizedNumbers[0] : $normalizedNumbers
        ];
        
        $headers = [
            'Content-Type: application/json',
            'Authorization: Bearer ' . self::$apiToken,
            'Accept: application/json'
        ];
        
        curl_setopt($ch, CURLOPT_URL, 'https://dashboard.philsms.com/api/v3/sms/send');
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        
        $output = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);
        
        $response = json_decode($output, true);
        
        // Tactical Logging
        $maskedToken = substr(self::$apiToken, 0, 4) . '...' . substr(self::$apiToken, -4);
        $logEntry = "[" . date('Y-m-d H:i:s') . "] TO: " . implode(',', $normalizedNumbers) . " | HTTP: $httpCode | ERR: $curlError | TOKEN: $maskedToken | RESP: $output\n";
        file_put_contents(__DIR__ . '/philsms_v3.log', $logEntry, FILE_APPEND);

        $isSuccess = ($httpCode === 200 || $httpCode === 201 || (isset($response['status']) && ($response['status'] === 'success' || $response['status'] === true)));

        return [
            'success' => $isSuccess,
            'data' => $response,
            'http_code' => $httpCode,
            'recipients_count' => count($normalizedNumbers)
        ];
    }
}
