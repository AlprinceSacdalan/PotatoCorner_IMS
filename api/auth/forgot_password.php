
<?php
require '../helpers/response.php';
require '../config/db_config.php';

use PHPMailer\PHPMailer\PHPMailer;

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    sendResponse(false, 'Method not allowed');
}

$input = json_decode(file_get_contents('php://input'), true);
$email = strtolower(trim($input['email'] ?? ''));

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendResponse(false, 'Please enter a valid email address.');
}

try {
    $stmt = $conn->prepare(
        "SELECT user_id, email
         FROM users
         WHERE email = ? AND role = 'manager' AND status = 'active'
         LIMIT 1"
    );
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();

   
    $genericMessage =
        'If an eligible manager account exists for that email, a reset link will be sent.';

    if (!$user) {
        sendResponse(true, $genericMessage);
    }

    
    $stmt = $conn->prepare(
        "UPDATE password_resets
         SET used_at = UTC_TIMESTAMP()
         WHERE user_id = ? AND used_at IS NULL"
    );
    $stmt->bind_param('i', $user['user_id']);
    $stmt->execute();

    $token = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $token);

    $stmt = $conn->prepare(
        "INSERT INTO password_resets
         (user_id, token_hash, expires_at)
         VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE))"
    );
    $stmt->bind_param('is', $user['user_id'], $tokenHash);
    $stmt->execute();

  
    $resetUrl = 'http://localhost/PotatoCorner_IMS/html/reset_password.html?token='
        . urlencode($token);

    $mailConfig = require 'C:/xampp/private_config/potatocorner_mail.php';
    require __DIR__ . '/../../vendor/autoload.php';

    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = $mailConfig['host'];
    $mail->SMTPAuth = true;
    $mail->Username = $mailConfig['username'];
    $mail->Password = $mailConfig['password'];
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port = $mailConfig['port'];
    $mail->CharSet = 'UTF-8';
    $mail->Timeout = 15;

    $mail->setFrom($mailConfig['username'], $mailConfig['from_name']);
    $mail->addAddress($user['email']);
    $mail->isHTML(true);
    $mail->Subject = 'Potato Corner IMS - Password Reset';
    $mail->Body =
        '<p>A password reset was requested for your manager account.</p>' .
        '<p><a href="' . htmlspecialchars($resetUrl, ENT_QUOTES, 'UTF-8') .
        '">Reset your password</a></p>' .
        '<p>This link expires in 30 minutes and can only be used once. ' .
        'If you did not request this, you can ignore this email.</p>';
    $mail->AltBody =
        "Reset your password using this link (expires in 30 minutes):\n" .
        $resetUrl .
        "\nIf you did not request this, ignore this email.";

    $mail->send();

    sendResponse(true, $genericMessage);
} catch (Throwable $e) {
    error_log('Password reset request failed: ' . $e->getMessage());
    http_response_code(500);
    sendResponse(false, 'Unable to process your request right now. Please try again later.');
}
