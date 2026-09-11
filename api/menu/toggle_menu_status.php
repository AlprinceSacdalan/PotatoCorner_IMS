<?php
require '../helpers/response.php';
require '../config/db_config.php';

$input = json_decode(file_get_contents('php://input'), true);
$menu_id = $input['menu_id'] ?? null;

if (!$menu_id) {
    sendResponse(false, 'menu_id is required');
}

$stmt = $conn->prepare("SELECT status FROM menu_items WHERE menu_id = ?");
$stmt->bind_param("i", $menu_id);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();

if (!$row) {
    sendResponse(false, 'Menu item not found');
}

$newStatus = $row['status'] === 'available' ? 'unavailable' : 'available';

$stmt = $conn->prepare("UPDATE menu_items SET status = ? WHERE menu_id = ?");
$stmt->bind_param("si", $newStatus, $menu_id);
$stmt->execute();

sendResponse(true, 'Status updated', ['menu_id' => $menu_id, 'status' => $newStatus]);