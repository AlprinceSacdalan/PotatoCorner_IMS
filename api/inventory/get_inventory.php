<?php
require '../helpers/response.php';
require '../config/db_config.php';

$result = $conn->query("SELECT material_id, name, unit, current_stock, threshold FROM raw_materials ORDER BY name");

$materials = [];
while ($row = $result->fetch_assoc()) {
    $row['status'] = $row['current_stock'] <= $row['threshold'] ? 'low' :
                      ($row['current_stock'] <= $row['threshold'] * 1.2 ? 'watch' : 'ok');
    $materials[] = $row;
}

sendResponse(true, 'Inventory retrieved', $materials);