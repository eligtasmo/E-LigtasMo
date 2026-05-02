<?php
/**
 * E-LigtasMo Mail Helper
 * Sends email via PHPMailer + SMTP (Gmail, etc.)
 */

require_once __DIR__ . '/mail_config.php';
require_once __DIR__ . '/lib/PHPMailer/Exception.php';
require_once __DIR__ . '/lib/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/lib/PHPMailer/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

/**
 * Send an email using PHPMailer SMTP.
 *
 * @param string $toEmail   Recipient email address
 * @param string $subject   Email subject line
 * @param string $body      Plain-text email body
 * @return array            ['sent' => bool, 'error' => string|null]
 */
function sendMail(string $toEmail, string $subject, string $body): array
{
    // Guard: SMTP credentials must be configured
    if (empty(SMTP_USER) || empty(SMTP_PASS)) {
        return [
            'sent' => false,
            'error' => 'SMTP credentials not configured. Update api/mail_config.php.',
        ];
    }

    $mail = new PHPMailer(true);

    try {
        // SMTP settings
        $mail->isSMTP();
        $mail->Host       = SMTP_HOST;
        $mail->SMTPAuth   = true;
        $mail->Username   = SMTP_USER;
        $mail->Password   = SMTP_PASS;
        $mail->SMTPSecure = SMTP_SECURE;
        $mail->Port       = SMTP_PORT;

        // Sender / recipient
        $mail->setFrom(
            SMTP_FROM_EMAIL ?: SMTP_USER,
            SMTP_FROM_NAME ?: 'E-LigtasMo'
        );
        $mail->addAddress($toEmail);

        // Content
        $mail->isHTML(false);
        $mail->Subject = $subject;
        $mail->Body    = $body;
        $mail->CharSet = 'UTF-8';

        $mail->send();

        return ['sent' => true, 'error' => null];
    } catch (Exception $e) {
        return [
            'sent' => false,
            'error' => 'Mailer Error: ' . $mail->ErrorInfo,
        ];
    }
}
