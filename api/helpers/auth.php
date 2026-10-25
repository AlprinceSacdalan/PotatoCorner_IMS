<?php
if (!function_exists('sendResponse')) {
    require __DIR__ . '/response.php';
}

function start_app_session() {
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params([
            'lifetime' => 0,
            'path'     => '/',
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
        session_start();
    }
}

function require_login() {
    start_app_session();
    if (empty($_SESSION['user_id'])) {
        http_response_code(401);
        sendResponse(false, 'Not logged in');
        exit;
    }
}

function require_manager() {
    require_login();
    if (($_SESSION['role'] ?? '') !== 'manager') {
        http_response_code(403);
        sendResponse(false, 'Forbidden');
        exit;
    }
}