<?php
/**
 * PushService - Relay logic for Expo Push Notifications
 */
class PushService {
    private static $expo_url = 'https://exp.host/--/api/v2/push/send';

    /**
     * Sends push notifications to multiple Expo tokens
     * 
     * @param array $tokens Array of ExpoPushToken strings
     * @param string $title Title of the notification
     * @param string $body Body text of the notification
     * @param array $data Additional data payload
     * @return array Result with success status and Expo response
     */
    public static function send($tokens, $title, $body, $data = []) {
        if (empty($tokens)) {
            return ['success' => true, 'message' => 'No tokens provided'];
        }

        // Expo recommends batching notifications (up to 100 per request)
        $chunks = array_chunk($tokens, 100);
        $results = [];

        foreach ($chunks as $chunk) {
            $messages = [];
            foreach ($chunk as $token) {
                // Validate token format roughly (starts with ExponentPushToken or ExpoPushToken)
                if (strpos($token, 'ExponentPushToken') === 0 || strpos($token, 'ExpoPushToken') === 0) {
                    $messages[] = [
                        'to' => $token,
                        'title' => $title,
                        'body' => $body,
                        'data' => $data,
                        'sound' => 'default',
                        'priority' => 'high'
                    ];
                }
            }

            if (empty($messages)) continue;

            $ch = curl_init(self::$expo_url);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'accept: application/json',
                'accept-encoding: gzip, deflate',
            ]);
            curl_setopt($ch, CURLOPT_POST, 1);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($messages));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            
            $response = curl_exec($ch);
            $info = curl_getinfo($ch);
            curl_close($ch);

            $results[] = [
                'http_code' => $info['http_code'],
                'response' => json_decode($response, true)
            ];
        }

        return [
            'success' => true,
            'results' => $results
        ];
    }
}
?>
