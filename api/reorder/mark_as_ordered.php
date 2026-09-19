<?php
require '../helpers/response.php';
require '../config/db_config.php';

$input = json_decode(file_get_contents('php://input'), true);
$material_id = $input['material_id'] ?? null;
$user_id = $input['user_id'] ?? null;

if (!$material_id || !$user_id) {
    sendResponse(false, 'material_id and user_id are required');
}


$stmt = $conn->prepare("SELECT reorder_id FROM reorder_orders WHERE material_id = ? AND status = 'pending'");
$stmt->bind_param("i", $material_id);
$stmt->execute();
if ($stmt->get_result()->num_rows > 0) {
    sendResponse(false, 'This material already has an order pending');
}

$stmt = $conn->prepare("
    SELECT rm.name, mpu.purchase_unit_name, mpu.units_per_purchase, mpu.reorder_purchase_qty
    FROM raw_materials rm
    JOIN material_purchase_units mpu ON rm.material_id = mpu.material_id
    WHERE rm.material_id = ?
");
$stmt->bind_param("i", $material_id);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();

if (!$row) {
    sendResponse(false, 'No reorder settings found for this material');
}

$purchase_qty = $row['reorder_purchase_qty'];
$unit_name = $row['purchase_unit_name'];
$quantity_ordered = $purchase_qty * $row['units_per_purchase'];

$stmt = $conn->prepare("
    INSERT INTO reorder_orders (material_id, purchase_qty, purchase_unit_name, quantity_ordered, ordered_by)
    VALUES (?, ?, ?, ?, ?)
");
$stmt->bind_param("idsdi", $material_id, $purchase_qty, $unit_name, $quantity_ordered, $user_id);
$stmt->execute();

sendResponse(true, "Marked {$row['name']} as ordered");