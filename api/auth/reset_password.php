
<?php
require '../helpers/response.php';
require '../config/db_config.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    sendResponse(false, 'Method not allowed');
}

$input = json_decode(file_get_contents('php://input'), true);

$token = $input['token'] ?? '';
$newPassword = $input['new_password'] ?? '';

if (
    !is_string($token) ||
    !preg_match('/^[a-f0-9]{64}$/i', $token) ||
    !is_string($newPassword) ||
    strlen($newPassword) < 8 ||
    strlen($newPassword) > 72
) {
    sendResponse(false, 'Invalid reset request or password.');
}

$tokenHash = hash('sha256', $token);

try {
    $conn->begin_transaction();

    $stmt = $conn->prepare(
        "SELECT id, user_id
         FROM password_resets
         WHERE token_hash = ?
           AND used_at IS NULL
           AND expires_at > UTC_TIMESTAMP()
         LIMIT 1
         FOR UPDATE"
    );
    $stmt->bind_param('s', $tokenHash);
    $stmt->execute();
    $reset = $stmt->get_result()->fetch_assoc();

    if (!$reset) {
        $conn->rollback();
        sendResponse(false, 'This reset link is invalid or has expired. Please request a new one.');
    }

    $passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);

    $stmt = $conn->prepare(
        "UPDATE users
         SET password_hash = ?
         WHERE user_id = ? AND role = 'manager' AND status = 'active'"
    );
    $stmt->bind_param('si', $passwordHash, $reset['user_id']);
    $stmt->execute();

    if ($stmt->affected_rows !== 1) {
        $conn->rollback();
        sendResponse(false, 'Unable to reset this account. Please request a new link.');
    }

    $stmt = $conn->prepare(
        "UPDATE password_resets
         SET used_at = UTC_TIMESTAMP()
         WHERE user_id = ? AND used_at IS NULL"
    );
    $stmt->bind_param('i', $reset['user_id']);
    $stmt->execute();

    $conn->commit();

    sendResponse(true, 'Password reset successfully. You can now log in with your new password.');
} catch (Throwable $e) {
    $conn->rollback();
    error_log('Password reset failed: ' . $e->getMessage());
    http_response_code(500);
    sendResponse(false, 'Unable to reset your password right now. Please try again.');
}
