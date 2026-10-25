<?php
require '../helpers/response.php';
require '../config/db_config.php';
require_once '../helpers/auth.php';
require_manager();

$input = json_decode(file_get_contents('php://input'), true);
$material_id = $input['material_id'] ?? null;
$user_id = (int)$_SESSION['user_id'];
$quantity_wasted = $input['quantity_wasted'] ?? null;
$reason = trim($input['reason'] ?? '');

if (!$material_id || !$user_id || $reason === '' ||
    !is_numeric($quantity_wasted) || $quantity_wasted <= 0) {
    sendResponse(false, 'Material, a positive quantity, and a reason are required');
    exit;
}

$conn->begin_transaction();

try {
    $stmt = $conn->prepare("SELECT name, current_stock FROM raw_materials WHERE material_id = ?");
    $stmt->bind_param("i", $material_id);
    $stmt->execute();
    $material = $stmt->get_result()->fetch_assoc();

    if (!$material) {
        throw new Exception('Material not found');
    }
    if ($material['current_stock'] < $quantity_wasted) {
        throw new Exception("Cannot waste more than current stock ({$material['current_stock']} available for {$material['name']})");
    }

    $stmt = $conn->prepare("UPDATE raw_materials SET current_stock = current_stock - ? WHERE material_id = ?");
    $stmt->bind_param("di", $quantity_wasted, $material_id);
    $stmt->execute();

    $stmt = $conn->prepare("INSERT INTO waste_logs (material_id, user_id, quantity_wasted, reason) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("iids", $material_id, $user_id, $quantity_wasted, $reason);
    $stmt->execute();

    $conn->commit();
    sendResponse(true, 'Waste logged');
} catch (Exception $e) {
    $conn->rollback();
    sendResponse(false, $e->getMessage());
}