<?php
require '../helpers/response.php';
require '../config/db_config.php';

$stmt = $conn->prepare("
    SELECT user_id, username, f_name, l_name, role,
           phone_number, email, receive_sms_alerts, status
    FROM users
    ORDER BY f_name, l_name
");

if (!$stmt || !$stmt->execute()) {
    error_log('Failed to retrieve users: ' . $conn->error);
    sendResponse(false, 'Could not retrieve accounts');
}

$result = $stmt->get_result();

$users = [];

while ($row = $result->fetch_assoc()) {
    $users[] = $row;
}

sendResponse(true, 'Users retrieved', $users);
