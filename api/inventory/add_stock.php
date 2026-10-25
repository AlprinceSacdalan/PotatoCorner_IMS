<?php
require '../helpers/response.php';
require '../config/db_config.php';
require_once '../helpers/auth.php';
require_manager(); 

$input = json_decode(file_get_contents('php://input'), true);
$material_id = $input['material_id'] ?? null;
$user_id = (int)$_SESSION['user_id'];
$new_total = $input['new_total'] ?? null;

if (!is_numeric($new_total) || $new_total < 0) {
    sendResponse(false, 'Enter a valid stock amount (0 or more)');
    exit;
}
if ($new_total < 0) {
    sendResponse(false, 'Stock cannot be negative');
}

$conn->begin_transaction();

try {
    $stmt = $conn->prepare("SELECT current_stock FROM raw_materials WHERE material_id = ? FOR UPDATE");
    $stmt->bind_param("i", $material_id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();

    if (!$row) {
        throw new Exception('Material not found');
    }


    $delta = $new_total - $row['current_stock'];
    $adjustment_type = 'correction';

    $stmt = $conn->prepare("INSERT INTO stock_adjustment (material_id, user_id, adjustment_type, quantity) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("iisd", $material_id, $user_id, $adjustment_type, $delta);
    $stmt->execute();

    $stmt2 = $conn->prepare("UPDATE raw_materials SET current_stock = ? WHERE material_id = ?");
    $stmt2->bind_param("di", $new_total, $material_id);
    $stmt2->execute();

    $stmt3 = $conn->prepare("
        UPDATE raw_materials SET low_stock_notified_at = NULL
        WHERE material_id = ? AND current_stock > threshold
    ");
    $stmt3->bind_param("i", $material_id);
    $stmt3->execute();

    $conn->commit();
    sendResponse(true, 'Stock corrected', ['new_total' => $new_total, 'delta' => $delta]);
} catch (Exception $e) {
    $conn->rollback();
    sendResponse(false, $e->getMessage());
}