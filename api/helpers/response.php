<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

function sendResponse($success, $message, $data = null) {
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ]);
    exit;
}