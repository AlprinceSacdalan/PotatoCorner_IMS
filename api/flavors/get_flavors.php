<?php
require '../helpers/response.php';
require '../config/db_config.php';
require_once '../helpers/auth.php';
require_login(); 
 
$result = $conn->query("SELECT material_id, name FROM raw_materials WHERE category = 'flavor' ORDER BY name");
 
$flavors = [];
while ($row = $result->fetch_assoc()) {
    $flavors[] = $row;
}
 
sendResponse(true, 'Flavors retrieved', $flavors);