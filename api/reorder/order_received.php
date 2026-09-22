<?php
require '../helpers/response.php';
require '../config/db_config.php';

$input = json_decode(file_get_contents('php://input'), true);
$reorder_id = $input['reorder_id'] ?? null;
$matches_ordered = $input['matches_ordered'] ?? null;
$actual_quantity = $input['actual_quantity'] ?? null;

if (!$reorder_id || $matches_ordered === null) {
    sendResponse(false, 'reorder_id and matches_ordered are required');
}
if (!$matches_ordered && ($actual_quantity === null || $actual_quantity === '')) {
    sendResponse(false, 'actual_quantity is required when the delivered amount differs');
}

$conn->begin_transaction();

try {
    $stmt = $conn->prepare("SELECT material_id, quantity_ordered, status FROM reorder_orders WHERE reorder_id = ? FOR UPDATE");
    $stmt->bind_param("i", $reorder_id);
    $stmt->execute();
    $order = $stmt->get_result()->fetch_assoc();

    if (!$order) {
        throw new Exception('Order not found');
    }
    if ($order['status'] !== 'pending') {
        throw new Exception('This order has already been closed');
    }

    $quantityToAdd = $matches_ordered ? $order['quantity_ordered'] : (float)$actual_quantity;

    $stmt = $conn->prepare("UPDATE raw_materials SET current_stock = current_stock + ? WHERE material_id = ?");
    $stmt->bind_param("di", $quantityToAdd, $order['material_id']);
    $stmt->execute();

    $stmt = $conn->prepare("
        UPDATE reorder_orders
        SET status = 'received', received_date = NOW(), actual_quantity_received = ?
        WHERE reorder_id = ?
    ");
    $stmt->bind_param("di", $quantityToAdd, $reorder_id);
    $stmt->execute();

    $conn->commit();
    sendResponse(true, 'Order marked received', ['quantity_added' => $quantityToAdd]);
} catch (Exception $e) {
    $conn->rollback();
    sendResponse(false, $e->getMessage());
}