<?php
require '../helpers/response.php';
require '../config/db_config.php';

$result = $conn->query("
    SELECT wl.wasteLog_id, rm.name AS material_name, rm.unit, wl.quantity_wasted,
           wl.reason, wl.waste_date, CONCAT(u.f_name, ' ', u.l_name) AS logged_by
    FROM waste_logs wl
    JOIN raw_materials rm ON wl.material_id = rm.material_id
    JOIN users u ON wl.user_id = u.user_id
    ORDER BY wl.waste_date DESC
");

$logs = [];
while ($row = $result->fetch_assoc()) {
    $logs[] = $row;
}

sendResponse(true, 'Waste log retrieved', $logs);