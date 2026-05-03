<?php
require_once "cors.php";
/**
 * E-LigtasMo SMTP Mail Configuration
 * 
 * Update these values with your actual SMTP credentials.
 * For Gmail: enable 2FA, then generate an App Password at
 * https://myaccount.google.com/apppasswords
 */

require_once __DIR__ . '/env_helper.php';

define('SMTP_HOST', getenv('SMTP_HOST') ?: 'smtp.gmail.com');
define('SMTP_PORT', getenv('SMTP_PORT') ?: 587);
define('SMTP_SECURE', getenv('SMTP_SECURE') ?: 'tls');
define('SMTP_USER', getenv('SMTP_USER') ?: '');
define('SMTP_PASS', getenv('SMTP_PASS') ?: '');
define('SMTP_FROM_EMAIL', getenv('SMTP_FROM_EMAIL') ?: getenv('SMTP_USER'));
define('SMTP_FROM_NAME', getenv('SMTP_FROM_NAME') ?: 'E-LigtasMo');
