<?php
require_once __DIR__ . '/send_sms.php';

function checkAndSendLowStockAlerts($conn) {
    try {
        $result = $conn->query("
            SELECT name FROM raw_materials
            WHERE current_stock <= threshold AND low_stock_notified_at IS NULL
        ");
        $lowItems = [];
        while ($row = $result->fetch_assoc()) {
            $lowItems[] = $row['name'];
        }

        if (empty($lowItems)) {
            return; // nothing new — most calls end here
        }

        $recipResult = $conn->query("
            SELECT phone_number FROM users
            WHERE receive_sms_alerts = 1
              AND phone_number IS NOT NULL AND phone_number != ''
              AND status = 'active'
        ");
        $recipients = [];
        while ($row = $recipResult->fetch_assoc()) {
            $recipients[] = $row['phone_number'];
        }

        if (empty($recipients)) {
            return; // nobody opted in yet — don't mark notified, so this can retry later
        }

        $count = count($lowItems);
        $header = $count === 1 ? "1 item is low in stock" : "{$count} items are low in stock";
        $lines = array_map(fn($name) => "{$name} low in stock", $lowItems);
        $message = $header . "\n\nLow Stock:\n" . implode("\n", $lines);

        sendTextBeeSms($recipients, $message);

        $conn->query("
            UPDATE raw_materials
            SET low_stock_notified_at = NOW()
            WHERE current_stock <= threshold AND low_stock_notified_at IS NULL
        ");
    } catch (Exception $e) {
        error_log('checkAndSendLowStockAlerts failed: ' . $e->getMessage());
    }
}