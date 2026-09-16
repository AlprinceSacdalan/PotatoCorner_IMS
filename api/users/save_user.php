<?php
require '../helpers/response.php';
require '../config/db_config.php';

$input = json_decode(file_get_contents('php://input'), true);
$user_id = $input['user_id'] ?? null;
$username = trim($input['username'] ?? '');
$f_name = trim($input['f_name'] ?? '');
$l_name = trim($input['l_name'] ?? '');
$role = $input['role'] ?? '';
$password = $input['password'] ?? '';

if ($username === '' || $f_name === '' || $l_name === '' || !in_array($role, ['manager', 'staff'])) {
    sendResponse(false, 'Username, first name, last name, and a valid role are required');
}

try {
    if ($user_id) {
        // Editing an existing account — never touches password_hash
        $stmt = $conn->prepare("UPDATE users SET username = ?, f_name = ?, l_name = ?, role = ? WHERE user_id = ?");
        $stmt->bind_param("ssssi", $username, $f_name, $l_name, $role, $user_id);
        $stmt->execute();

        sendResponse(true, 'Account updated');
    } else {
        // Creating a new account — password is required
        if ($password === '') {
            sendResponse(false, 'Password is required for a new account');
        }
        $password_hash = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $conn->prepare("INSERT INTO users (username, password_hash, f_name, l_name, role) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("sssss", $username, $password_hash, $f_name, $l_name, $role);
        $stmt->execute();

        sendResponse(true, 'Account created', ['user_id' => $stmt->insert_id]);
    }
} catch (Exception $e) {
    if ($e->getCode() == 1062) {
        sendResponse(false, 'That username is already taken');
    }
    sendResponse(false, 'Could not save account: ' . $e->getMessage());
}