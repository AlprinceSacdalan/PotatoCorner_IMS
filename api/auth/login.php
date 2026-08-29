<?php
require '../helpers/response.php';
require '../config/db_config.php';

$input = json_decode(file_get_contents('php://input'), true);
$username = trim($input['username'] ?? '');
$password = trim($input['password'] ?? '');

if ($username === '' || $password === '') {
    sendResponse(false, 'Username and password are required');
}

$stmt = $conn->prepare("SELECT user_id, username, password_hash, f_name, l_name, role, status FROM users WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    sendResponse(false, 'Invalid username or password');
}

$user = $result->fetch_assoc();

if ($user['status'] !== 'active') {
    sendResponse(false, 'This account has been deactivated');
}

if (!password_verify($password, $user['password_hash'])) {
    sendResponse(false, 'Invalid username or password');
}

sendResponse(true, 'Login successful', [
    'user_id' => $user['user_id'],
    'username' => $user['username'],
    'full_name' => $user['f_name'] . ' ' . $user['l_name'],
    'role' => $user['role']
]);