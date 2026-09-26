<?php
require_once __DIR__ . '/../config/textbee_config.php';

function sendTextBeeSms($recipients, $message) {
    if (empty($recipients)) {
        return ['success' => false, 'error' => 'No recipients'];
    }

    $url = 'https://api.textbee.dev/api/v1/gateway/devices/' . TEXTBEE_DEVICE_ID . '/send-sms';
    $payload = json_encode([
        'recipients' => array_values($recipients),
        'message' => $message
    ]);

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'x-api-key: ' . TEXTBEE_API_KEY
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        return ['success' => false, 'error' => $curlError];
    }

    return [
        'success' => $httpCode >= 200 && $httpCode < 300,
        'http_code' => $httpCode,
        'response' => $response
    ];
}