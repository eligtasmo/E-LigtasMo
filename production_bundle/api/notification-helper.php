<?php
/**
 * Universal Notification Helper for E-LigtasMo
 */
require_once __DIR__ . '/../push_helper.php';

class NotificationHelper {
    /**
     * Notify an audience or specific user
     */
    public static function notify($pdo, $title, $message, $audience = 'all', $brgy_name = null, $type = 'info', $category = 'general', $created_by = null, $extra_data = []) {
        // 1. Save to DB for in-app history
        $stmt = $pdo->prepare('INSERT INTO notifications (title, message, type, audience, brgy_name, category, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$title, $message, $type, $audience, $brgy_name, $category, $created_by]);
        $notif_id = intval($pdo->lastInsertId());

        // 2. Fetch push tokens based on audience
        $push_tokens = [];
        
        if ($audience === 'all') {
            $pStmt = $pdo->query("SELECT push_token FROM users WHERE push_token IS NOT NULL AND push_token != ''");
            $push_tokens = $pStmt->fetchAll(PDO::FETCH_COLUMN);
        } elseif ($audience === 'residents') {
            if ($brgy_name) {
                $pStmt = $pdo->prepare("SELECT push_token FROM users WHERE role = 'resident' AND brgy_name = ? AND push_token IS NOT NULL AND push_token != ''");
                $pStmt->execute([$brgy_name]);
            } else {
                $pStmt = $pdo->query("SELECT push_token FROM users WHERE role = 'resident' AND push_token IS NOT NULL AND push_token != ''");
            }
            $push_tokens = $pStmt->fetchAll(PDO::FETCH_COLUMN);
        } elseif ($audience === 'barangay') {
            if ($brgy_name) {
                $pStmt = $pdo->prepare("SELECT push_token FROM users WHERE brgy_name = ? AND push_token IS NOT NULL AND push_token != ''");
                $pStmt->execute([$brgy_name]);
            } else {
                $pStmt = $pdo->query("SELECT push_token FROM (SELECT push_token FROM users WHERE role = 'brgy' UNION SELECT push_token FROM users WHERE role = 'captain') as combined WHERE push_token IS NOT NULL AND push_token != ''");
            }
            $push_tokens = $pStmt->fetchAll(PDO::FETCH_COLUMN);
        } elseif ($audience === 'admins') {
            $pStmt = $pdo->query("SELECT push_token FROM users WHERE role = 'admin' AND push_token IS NOT NULL AND push_token != ''");
            $push_tokens = $pStmt->fetchAll(PDO::FETCH_COLUMN);
        } elseif (is_numeric($audience)) { // Direct User ID notification
            $pStmt = $pdo->prepare("SELECT push_token FROM users WHERE id = ? AND push_token IS NOT NULL AND push_token != ''");
            $pStmt->execute([(int)$audience]);
            $push_tokens = $pStmt->fetchAll(PDO::FETCH_COLUMN);
        }

        if (!empty($push_tokens)) {
            PushService::send(
                array_unique($push_tokens),
                $title,
                $message,
                array_merge([
                    'notification_id' => $notif_id,
                    'type' => $type,
                    'category' => $category,
                    'click_action' => 'Notifications'
                ], $extra_data)
            );
        }

        return $notif_id;
    }

    /**
     * Notify everyone relevant about a report update
     */
    public static function notifyReportUpdate($pdo, $report, $title, $message, $type = 'info') {
        // Notify Reporter (Resident)
        if (isset($report['user_id'])) {
            self::notify($pdo, $title, $message, $report['user_id'], null, $type, 'report_update', null, ['report_id' => $report['id']]);
        }
        
        // Notify Barangay
        if (isset($report['brgy_name'])) {
            self::notify($pdo, $title, $message, 'barangay', $report['brgy_name'], $type, 'report_update', null, ['report_id' => $report['id']]);
        }
        
        // Notify Admins
        self::notify($pdo, $title, $message, 'admins', null, $type, 'report_update', null, ['report_id' => $report['id']]);
    }
}
