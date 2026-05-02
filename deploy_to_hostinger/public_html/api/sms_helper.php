<?php
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
            self::$apiToken = getenv('PHILSMS_API_TOKEN');
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
        
        // Convert 09XXXXXXXXX to 639XXXXXXXXX
        if (substr($number, 0, 2) === '09' && strlen($number) === 11) {
            $number = '63' . substr($number, 1);
        }
        // Convert 9XXXXXXXXX to 639XXXXXXXXX
        elseif (substr($number, 0, 1) === '9' && strlen($number) === 10) {
            $number = '63' . $number;
        }
        // If already 639XXXXXXXXX, keep it
        
        return $number;
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

        // Normalize all numbers to 639... format
        $normalizedNumbers = array_map([self::class, 'normalize'], $numbers);
        $recipientString = implode(',', $normalizedNumbers);

        $ch = curl_init();
        
        $payload = [
            'recipient' => $recipientString,
            'sender_id' => self::$senderId,
            'type' => 'plain',
            'message' => $message
        ];
        
        curl_setopt($ch, CURLOPT_URL, 'https://app.philsms.com/api/v3/sms/send');
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . self::$apiToken,
            'Accept: application/json'
        ]);
        
        $output = curl_exec($ch);
        curl_close($ch);
        
        $response = json_decode($output, true);
        
        return [
            'success' => (isset($response['status']) && $response['status'] === 'success'),
            'data' => $response
        ];
    }
}
