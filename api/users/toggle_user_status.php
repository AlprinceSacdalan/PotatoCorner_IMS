<?php
require '../helpers/response.php';
require '../config/db_config.php';

$input = json_decode(file_get_contents('php://input'), true);
$user_id = $input['user_id'] ?? null;

if (!$user_id) {
    sendResponse(false, 'user_id is required');
}

$stmt = $conn->prepare("SELECT status FROM users WHERE user_id = ?");
$stmt->bind_param("i", $user_id);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();

if (!$row) {
    sendResponse(false, 'User not found');
}

$newStatus = $row['status'] === 'active' ? 'inactive' : 'active';

$stmt = $conn->prepare("UPDATE users SET status = ? WHERE user_id = ?");
$stmt->bind_param("si", $newStatus, $user_id);
$stmt->execute();

sendResponse(true, 'Status updated', ['user_id' => $user_id, 'status' => $newStatus]);