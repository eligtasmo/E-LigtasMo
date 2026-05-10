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
        $recipientString = implode(',', $normalizedNumbers);

        $ch = curl_init();
        
        $payload = [
            'recipient' => $recipientString,
            'sender_id' => 'PhilSMS', // User specified PhilSMS as sender or default
            'type' => 'plain',
            'message' => $message
        ];
        
        // Correct endpoint as per user request
        curl_setopt($ch, CURLOPT_URL, 'https://dashboard.philsms.com/api/v3/sms/send');
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . self::$apiToken,
            'Accept: application/json'
        ]);
        
        $output = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        $response = json_decode($output, true);
        
        // Logging for tactical debugging
        file_put_contents(__DIR__ . '/sms_log.txt', "[" . date('Y-m-d H:i:s') . "] TO: $recipientString | HTTP: $httpCode | RESP: $output\n", FILE_APPEND);

        return [
            'success' => ($httpCode === 200 || $httpCode === 201 || (isset($response['status']) && $response['status'] === 'success')),
            'data' => $response,
            'http_code' => $httpCode
        ];
    }
}
