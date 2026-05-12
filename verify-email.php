<?php
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/db.php';

$email = strtolower(trim((string)($_GET['email'] ?? '')));
$code = trim((string)($_GET['code'] ?? ''));

$success = false;
$message = '';
$title = 'Verification';

try {
    if (empty($email) || empty($code)) {
        throw new Exception('Missing email or verification code.');
    }

    $stmt = $pdo->prepare("SELECT * FROM verification_codes WHERE email = ? AND code = ? ORDER BY id DESC LIMIT 1");
    $stmt->execute([$email, $code]);
    $record = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$record) {
        throw new Exception('Invalid verification link or code.');
    }

    if (time() > (int)$record['expires_at']) {
        throw new Exception('This verification link has expired. Please request a new one from the app.');
    }

    if ((int)$record['verified'] === 1) {
        $success = true;
        $message = 'Your email has already been verified! You can return to the app.';
    } else {
        $update = $pdo->prepare("UPDATE verification_codes SET verified = 1 WHERE id = ?");
        $update->execute([$record['id']]);
        $success = true;
        $message = 'Email verified successfully! You can now return to the E-LigtasMo app to complete your registration.';
    }
    
    $title = 'Verification Successful';

} catch (Exception $e) {
    $success = false;
    $message = $e->getMessage();
    $title = 'Verification Failed';
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $title; ?> | E-LigtasMo</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-dark: #0F172A;
            --card-bg: rgba(30, 41, 59, 0.7);
            --accent: #3B82F6;
            --success: #10B981;
            --error: #EF4444;
            --text-main: #F8FAFC;
            --text-muted: #94A3B8;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Outfit', sans-serif;
            background-color: var(--bg-dark);
            color: var(--text-main);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
            overflow-x: hidden;
        }

        /* Ambient Background Effect */
        body::before {
            content: '';
            position: fixed;
            top: -10%;
            left: -10%;
            width: 40%;
            height: 40%;
            background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%);
            z-index: -1;
            filter: blur(60px);
        }

        body::after {
            content: '';
            position: fixed;
            bottom: -10%;
            right: -10%;
            width: 40%;
            height: 40%;
            background: radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%);
            z-index: -1;
            filter: blur(60px);
        }

        .container {
            width: 100%;
            max-width: 480px;
            text-align: center;
            animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .logo {
            width: 80px;
            height: 80px;
            margin-bottom: 30px;
            filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.3));
        }

        .card {
            background: var(--card-bg);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 24px;
            padding: 40px 30px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
        }

        .icon-circle {
            width: 70px;
            height: 70px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            font-size: 32px;
        }

        .icon-success {
            background: rgba(16, 185, 129, 0.15);
            color: var(--success);
            border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .icon-error {
            background: rgba(239, 68, 68, 0.15);
            color: var(--error);
            border: 1px solid rgba(239, 68, 68, 0.2);
        }

        h1 {
            font-size: 28px;
            font-weight: 800;
            margin-bottom: 16px;
            letter-spacing: -0.02em;
        }

        p {
            color: var(--text-muted);
            line-height: 1.6;
            font-size: 16px;
            margin-bottom: 32px;
        }

        .btn {
            display: inline-block;
            background: white;
            color: var(--bg-dark);
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 14px;
            font-weight: 700;
            font-size: 16px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(255, 255, 255, 0.1);
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(255, 255, 255, 0.2);
            filter: brightness(0.9);
        }

        .footer {
            margin-top: 40px;
            font-size: 13px;
            color: var(--text-muted);
        }

        @media (max-width: 480px) {
            .card {
                padding: 30px 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <img src="https://api.eligtasmo.site/assets/eligtasmo_logo.png" alt="E-LigtasMo" class="logo">
        
        <div class="card">
            <?php if ($success): ?>
                <div class="icon-circle icon-success">✓</div>
                <h1>Success!</h1>
            <?php else: ?>
                <div class="icon-circle icon-error">✕</div>
                <h1>Oops!</h1>
            <?php endif; ?>
            
            <p><?php echo $message; ?></p>
            
            <?php if ($success): 
                $deepLink = "eligtasmo://verify-code?email=" . urlencode($email) . "&code=" . urlencode($code);
            ?>
                <a href="<?php echo $deepLink; ?>" class="btn">Return to App</a>
            <?php else: ?>
                <a href="javascript:location.reload()" class="btn">Try Again</a>
            <?php endif; ?>
        </div>
        
        <div class="footer">
            &copy; <?php echo date('Y'); ?> E-LigtasMo Tactical Operations.
        </div>
    </div>
</body>
</html>
