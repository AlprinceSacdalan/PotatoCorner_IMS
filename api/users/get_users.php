<?php
require '../helpers/response.php';
require '../config/db_config.php';

$result = $conn->query("
    SELECT user_id, username, f_name, l_name, role, status, phone_number, receive_sms_alerts, created_at
    FROM users
    ORDER BY f_name, l_name
");

$users = [];
while ($row = $result->fetch_assoc()) {
    $users[] = $row;
}

sendResponse(true, 'Users retrieved', $users);