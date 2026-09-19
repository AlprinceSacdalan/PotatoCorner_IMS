<?php
require '../helpers/response.php';
require '../config/db_config.php';


$conn->query("
    UPDATE reorder_orders ro
    JOIN raw_materials rm ON ro.material_id = rm.material_id
    SET ro.status = 'received', ro.received_date = NOW()
    WHERE ro.status = 'pending' AND rm.current_stock > rm.threshold
");

$result = $conn->query("
    SELECT rm.material_id, rm.name, rm.unit, rm.current_stock, rm.threshold,
           mpu.purchase_unit_name, mpu.units_per_purchase, mpu.reorder_purchase_qty,
           ro.reorder_id, ro.ordered_date, ro.purchase_qty AS ordered_purchase_qty
    FROM raw_materials rm
    JOIN material_purchase_units mpu ON rm.material_id = mpu.material_id
    LEFT JOIN reorder_orders ro
           ON ro.material_id = rm.material_id AND ro.status = 'pending'
    WHERE rm.current_stock <= rm.threshold OR ro.reorder_id IS NOT NULL
    ORDER BY rm.name
");

$needsOrdering = [];
while ($row = $result->fetch_assoc()) {
    if (!$row['reorder_id']) {
        $row['recommended_total'] = $row['reorder_purchase_qty'] * $row['units_per_purchase'];
        $needsOrdering[] = $row;
    }
}

// Full order history 
$result = $conn->query("
    SELECT ro.reorder_id, rm.name, rm.unit, rm.current_stock,
           ro.purchase_qty, ro.purchase_unit_name, ro.quantity_ordered,
           ro.status, ro.ordered_date, ro.received_date,
           CONCAT(u.f_name, ' ', u.l_name) AS ordered_by
    FROM reorder_orders ro
    JOIN raw_materials rm ON ro.material_id = rm.material_id
    JOIN users u ON ro.ordered_by = u.user_id
    ORDER BY ro.ordered_date DESC
");
$orderHistory = [];
while ($row = $result->fetch_assoc()) {
    $orderHistory[] = $row;
}

sendResponse(true, 'Reorder list retrieved', [
    'needs_ordering' => $needsOrdering,
    'order_history' => $orderHistory
]);