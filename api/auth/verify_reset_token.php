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

if (!is_string($token) || !preg_match('/^[a-f0-9]{64}$/i', $token)) {
    sendResponse(false, 'This reset link is invalid or has expired. Please request a new one.');
}

$tokenHash = hash('sha256', $token);

$stmt = $conn->prepare(
    "SELECT id
     FROM password_resets
     WHERE token_hash = ?
       AND used_at IS NULL
       AND expires_at > UTC_TIMESTAMP()
     LIMIT 1"
);

$stmt->bind_param('s', $tokenHash);
$stmt->execute();

if (!$stmt->get_result()->fetch_assoc()) {
    sendResponse(false, 'This reset link is invalid or has expired. Please request a new one.');
}

sendResponse(true, 'Reset link is valid.');
