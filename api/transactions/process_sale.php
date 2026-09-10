<?php
require '../helpers/response.php';
require '../config/db_config.php';

const MIX_COMPONENT_MAX_FLAVORS = 1;

$input = json_decode(file_get_contents('php://input'), true);
$user_id = $input['user_id'] ?? null;
$items = $input['items'] ?? null;

if (!$user_id || !$items || count($items) === 0) {
    sendResponse(false, 'user_id and at least one item are required');
}

$conn->begin_transaction();

try {
    // Validate stock (and flavor counts) 
    foreach ($items as $item) {
        // Base recipe check 
        $stmt = $conn->prepare("
            SELECT rm.material_id, rm.name, rm.current_stock, rb.quantity_required
            FROM recipes_bom rb
            JOIN raw_materials rm ON rb.material_id = rm.material_id
            WHERE rb.menu_id = ?
        ");
        $stmt->bind_param("i", $item['menu_id']);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($ingredient = $result->fetch_assoc()) {
            $needed = $ingredient['quantity_required'] * $item['quantity'];
            if ($ingredient['current_stock'] < $needed) {
                throw new Exception("Insufficient stock: {$ingredient['name']}");
            }
        }

        $hasComponents = !empty($item['components']);

        // Item-level flavor check (non-Mix items only)
        if (!$hasComponents && !empty($item['flavors'])) {
            $sizeInfo = getSizeFlavorInfo($conn, getMenuSizeName($conn, $item['menu_id']));
            $flavors = $item['flavors'];
            validateFlavorCount($flavors, $sizeInfo['max_flavors']);
            $gramsEach = computeGramsPerFlavor($sizeInfo['grams_per_serving'], $item['is_extra_flavor'] ?? false, count($flavors));
            foreach ($flavors as $flavorId) {
                checkStock($conn, $flavorId, $gramsEach * $item['quantity']);
            }
        }

        // Mix component check
        if ($hasComponents) {
            $mixSizeInfo = getSizeFlavorInfo($conn, getMenuSizeName($conn, $item['menu_id']));

            foreach ($item['components'] as $comp) {
                $stmt = $conn->prepare("SELECT base_material_id, grams_required FROM mix_recipe WHERE menu_id = ? AND snack_type = ?");
                $stmt->bind_param("is", $item['menu_id'], $comp['snack_type']);
                $stmt->execute();
                $mixRow = $stmt->get_result()->fetch_assoc();
                if (!$mixRow) {
                    throw new Exception("No mix_recipe entry for menu_id {$item['menu_id']} / snack_type {$comp['snack_type']}");
                }
                checkStock($conn, $mixRow['base_material_id'], $mixRow['grams_required'] * $item['quantity']);

                if (!empty($comp['flavors'])) {
                    $flavors = $comp['flavors'];
                    validateFlavorCount($flavors, MIX_COMPONENT_MAX_FLAVORS);
                    $gramsEach = computeGramsPerFlavor($mixSizeInfo['grams_per_serving'], $comp['is_extra_flavor'] ?? false, count($flavors));
                    foreach ($flavors as $flavorId) {
                        checkStock($conn, $flavorId, $gramsEach * $item['quantity']);
                    }
                }
            }
        }
    }

    // Compute total 
    $total_amount = 0;
    foreach ($items as $item) {
        $stmt = $conn->prepare("SELECT price FROM menu_items WHERE menu_id = ?");
        $stmt->bind_param("i", $item['menu_id']);
        $stmt->execute();
        $price = $stmt->get_result()->fetch_assoc()['price'];
        $total_amount += $price * $item['quantity'];
    }

    $stmt = $conn->prepare("INSERT INTO transactions (user_id, total_amount) VALUES (?, ?)");
    $stmt->bind_param("id", $user_id, $total_amount);
    $stmt->execute();
    $transaction_id = $stmt->insert_id;

    // Insert rows and deduct stock 
    foreach ($items as $item) {
        $stmt = $conn->prepare("SELECT price FROM menu_items WHERE menu_id = ?");
        $stmt->bind_param("i", $item['menu_id']);
        $stmt->execute();
        $price = $stmt->get_result()->fetch_assoc()['price'];
        $subtotal = $price * $item['quantity'];

        $hasComponents = !empty($item['components']);

        $stmt = $conn->prepare("INSERT INTO transaction_details (transaction_id, menu_id, quantity, subtotal, flavor_material_id, is_extra_flavor) VALUES (?, ?, ?, ?, NULL, 0)");
        $stmt->bind_param("iiid", $transaction_id, $item['menu_id'], $item['quantity'], $subtotal);
        $stmt->execute();
        $detail_id = $stmt->insert_id;

        // Deduct base recipe ingredients 
        $stmt = $conn->prepare("SELECT material_id, quantity_required FROM recipes_bom WHERE menu_id = ?");
        $stmt->bind_param("i", $item['menu_id']);
        $stmt->execute();
        $ingredients = $stmt->get_result();
        while ($ing = $ingredients->fetch_assoc()) {
            deductStock($conn, $ing['material_id'], $ing['quantity_required'] * $item['quantity']);
        }

        // Item-level flavors (non-Mix items only)
        if (!$hasComponents && !empty($item['flavors'])) {
            $sizeInfo = getSizeFlavorInfo($conn, getMenuSizeName($conn, $item['menu_id']));
            $flavors = $item['flavors'];
            $isExtra = $item['is_extra_flavor'] ?? false;
            $gramsEach = computeGramsPerFlavor($sizeInfo['grams_per_serving'], $isExtra, count($flavors));

            foreach ($flavors as $flavorId) {
                deductStock($conn, $flavorId, $gramsEach * $item['quantity']);

                $stmt = $conn->prepare("INSERT INTO transaction_detail_flavors (transactionDetail_id, flavor_material_id, grams_used) VALUES (?, ?, ?)");
                $gramsForRow = $gramsEach * $item['quantity'];
                $stmt->bind_param("iid", $detail_id, $flavorId, $gramsForRow);
                $stmt->execute();
            }
        }

        // Mix & Max components
        if ($hasComponents) {
            $mixSizeInfo = getSizeFlavorInfo($conn, getMenuSizeName($conn, $item['menu_id']));

            foreach ($item['components'] as $comp) {
                $stmt = $conn->prepare("SELECT base_material_id, grams_required FROM mix_recipe WHERE menu_id = ? AND snack_type = ?");
                $stmt->bind_param("is", $item['menu_id'], $comp['snack_type']);
                $stmt->execute();
                $mixRow = $stmt->get_result()->fetch_assoc();
                $gramsUsed = $mixRow['grams_required'] * $item['quantity'];
                deductStock($conn, $mixRow['base_material_id'], $gramsUsed);

                $stmt = $conn->prepare("INSERT INTO mix_components (transactionDetail_id, snack_type, grams_used, flavor_material_id, is_extra_flavor) VALUES (?, ?, ?, NULL, 0)");
                $stmt->bind_param("isd", $detail_id, $comp['snack_type'], $gramsUsed);
                $stmt->execute();
                $component_id = $stmt->insert_id;

                if (!empty($comp['flavors'])) {
                    $flavors = $comp['flavors'];
                    $isExtra = $comp['is_extra_flavor'] ?? false;
                    $gramsEach = computeGramsPerFlavor($mixSizeInfo['grams_per_serving'], $isExtra, count($flavors));

                    foreach ($flavors as $flavorId) {
                        deductStock($conn, $flavorId, $gramsEach * $item['quantity']);

                        $stmt = $conn->prepare("INSERT INTO mix_component_flavors (component_id, flavor_material_id, grams_used) VALUES (?, ?, ?)");
                        $gramsForRow = $gramsEach * $item['quantity'];
                        $stmt->bind_param("iid", $component_id, $flavorId, $gramsForRow);
                        $stmt->execute();
                    }
                }
            }
        }
    }

    $conn->commit();
    sendResponse(true, 'Sale recorded', ['transaction_id' => $transaction_id, 'total_amount' => $total_amount]);

} catch (Exception $e) {
    $conn->rollback();
    sendResponse(false, $e->getMessage());
}

// Helper functions 


function getMenuSizeName($conn, $menu_id) {
    $stmt = $conn->prepare("SELECT size_name FROM menu_items WHERE menu_id = ?");
    $stmt->bind_param("i", $menu_id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    if (!$row || !$row['size_name']) {
        throw new Exception("menu_id {$menu_id} has no size_name set");
    }
    return $row['size_name'];
}


function getSizeFlavorInfo($conn, $size_name) {
    $stmt = $conn->prepare("SELECT grams_per_serving, max_flavors FROM flavor_usage_by_size WHERE size_name = ?");
    $stmt->bind_param("s", $size_name);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    if (!$row) {
        throw new Exception("No flavor_usage_by_size entry for size {$size_name}");
    }
    return $row;
}


function validateFlavorCount($flavors, $max_flavors) {
    if (count($flavors) > $max_flavors) {
        throw new Exception("Too many flavors selected (max {$max_flavors} for this size)");
    }
}


function computeGramsPerFlavor($baseGrams, $isExtra, $flavorCount) {
    if ($flavorCount === 0) {
        return 0;
    }
    $total = $isExtra ? $baseGrams + 4.75 : $baseGrams;
    return $total / $flavorCount;
}

function checkStock($conn, $material_id, $needed) {
    $stmt = $conn->prepare("SELECT name, current_stock FROM raw_materials WHERE material_id = ?");
    $stmt->bind_param("i", $material_id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    if (!$row) {
        throw new Exception("Unknown raw material id {$material_id}");
    }
    if ($row['current_stock'] < $needed) {
        throw new Exception("Insufficient stock: {$row['name']}");
    }
}

function deductStock($conn, $material_id, $amount) {
    $stmt = $conn->prepare("UPDATE raw_materials SET current_stock = current_stock - ? WHERE material_id = ?");
    $stmt->bind_param("di", $amount, $material_id);
    $stmt->execute();
}