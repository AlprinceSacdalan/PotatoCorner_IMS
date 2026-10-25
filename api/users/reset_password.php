<?php
require '../helpers/response.php';
require '../config/db_config.php';
require_once '../helpers/auth.php';
require_manager();    

$input = json_decode(file_get_contents('php://input'), true);
$user_id = $input['user_id'] ?? null;
$new_password = $input['new_password'] ?? '';

if (!$user_id || $new_password === '') {
    sendResponse(false, 'user_id and new_password are required');
    exit;
}
if (!is_string($new_password) || strlen($new_password) < 8 || strlen($new_password) > 72) {
    sendResponse(false, 'Password must be 8 to 72 characters');
    exit;
}

$password_hash = password_hash($new_password, PASSWORD_DEFAULT);

$stmt = $conn->prepare("UPDATE users SET password_hash = ? WHERE user_id = ?");
$stmt->bind_param("si", $password_hash, $user_id);
$stmt->execute();

sendResponse(true, 'Password reset');