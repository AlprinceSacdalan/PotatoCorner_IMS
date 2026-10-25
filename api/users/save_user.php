
<?php
require '../helpers/response.php';
require '../config/db_config.php';

$input = json_decode(file_get_contents('php://input'), true);

$user_id = $input['user_id'] ?? null;
$username = trim($input['username'] ?? '');
$email = strtolower(trim($input['email'] ?? ''));
$f_name = trim($input['f_name'] ?? '');
$l_name = trim($input['l_name'] ?? '');
$role = $input['role'] ?? '';
$password = $input['password'] ?? '';
$phone_number = trim($input['phone_number'] ?? '');
$receive_sms_alerts = !empty($input['receive_sms_alerts']) ? 1 : 0;

if (
    $username === '' ||
    $f_name === '' ||
    $l_name === '' ||
    !in_array($role, ['manager', 'staff'], true)
) {
    sendResponse(false, 'Username, first name, last name, and a valid role are required');
}

if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendResponse(false, 'Please enter a valid email address');
}

if ($receive_sms_alerts && $phone_number === '') {
    sendResponse(false, 'A phone number is required to receive SMS alerts');
}

try {
    if ($user_id) {
        // Edit account without changing its password.
        $stmt = $conn->prepare(
            "UPDATE users
             SET username = ?, f_name = ?, l_name = ?,
                 role = ?, phone_number = ?, email = ?,
                 receive_sms_alerts = ?
             WHERE user_id = ?"
        );

        $stmt->bind_param(
            "ssssssii",
            $username,
            $f_name,
            $l_name,
            $role,
            $phone_number,
            $email,
            $receive_sms_alerts,
            $user_id
        );

        $stmt->execute();

        sendResponse(true, 'Account updated');
    } else {
        // Create account with a hashed password.
        if ($password === '') {
            sendResponse(false, 'Password is required for a new account');
        }

        $password_hash = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $conn->prepare(
            "INSERT INTO users
             (username, password_hash, f_name, l_name, role,
              phone_number, email, receive_sms_alerts)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );

        $stmt->bind_param(
            "sssssssi",
            $username,
            $password_hash,
            $f_name,
            $l_name,
            $role,
            $phone_number,
            $email,
            $receive_sms_alerts
        );

        $stmt->execute();

        sendResponse(true, 'Account created', [
            'user_id' => $stmt->insert_id
        ]);
    }
} catch (mysqli_sql_exception $e) {
    if ($e->getCode() == 1062) {
        sendResponse(false, 'Username or email is already in use');
    }

    error_log($e->getMessage());
    sendResponse(false, 'Could not save account');
}
