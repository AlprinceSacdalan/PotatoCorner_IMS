<?php
require '../helpers/response.php';
require '../config/db_config.php';

$input = json_decode(file_get_contents('php://input'), true);
$material_id = $input['material_id'] ?? null;
$user_id = $input['user_id'] ?? null;
$quantity = $input['quantity'] ?? null;
$adjustment_type = $input['adjustment_type'] ?? null;

if (!$material_id || !$user_id || !$quantity || !$adjustment_type) {
    sendResponse(false, 'Missing required fields');
}

$conn->begin_transaction();

try {
    $stmt = $conn->prepare("INSERT INTO stock_adjustment (material_id, user_id, adjustment_type, quantity) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("iisd", $material_id, $user_id, $adjustment_type, $quantity);
    $stmt->execute();

    $stmt2 = $conn->prepare("UPDATE raw_materials SET current_stock = current_stock + ? WHERE material_id = ?");
    $stmt2->bind_param("di", $quantity, $material_id);
    $stmt2->execute();

    $conn->commit();
    sendResponse(true, 'Stock adjustment recorded');
} catch (Exception $e) {
    $conn->rollback();
    sendResponse(false, 'Failed to record adjustment');
}