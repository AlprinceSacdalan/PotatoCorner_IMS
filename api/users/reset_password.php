<?php
require '../helpers/response.php';
require '../config/db_config.php';

$input = json_decode(file_get_contents('php://input'), true);
$user_id = $input['user_id'] ?? null;
$new_password = $input['new_password'] ?? '';

if (!$user_id || $new_password === '') {
    sendResponse(false, 'user_id and new_password are required');
}
if (strlen($new_password) < 6) {
    sendResponse(false, 'Password must be at least 6 characters');
}

$password_hash = password_hash($new_password, PASSWORD_DEFAULT);

$stmt = $conn->prepare("UPDATE users SET password_hash = ? WHERE user_id = ?");
$stmt->bind_param("si", $password_hash, $user_id);
$stmt->execute();

sendResponse(true, 'Password reset');