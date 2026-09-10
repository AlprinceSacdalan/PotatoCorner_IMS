<?php
// Place in api/flavors/get_flavor_sizes.php
require '../helpers/response.php';
require '../config/db_config.php';

$result = $conn->query("SELECT size_name, grams_per_serving, max_flavors FROM flavor_usage_by_size");

$sizes = [];
while ($row = $result->fetch_assoc()) {
    $sizes[$row['size_name']] = [
        'grams_per_serving' => (float)$row['grams_per_serving'],
        'max_flavors' => (int)$row['max_flavors']
    ];
}

sendResponse(true, 'Flavor sizes retrieved', $sizes);