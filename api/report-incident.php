<?php
require_once 'cors.php';
header("Content-Type: application/json");
session_start();
require_once 'db.php';

try {
    
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception("Invalid JSON input");
    }
    
    // Validate required fields - now supporting start-to-end coordinates
    $required_fields = ['type', 'address', 'datetime', 'description', 'severity', 'reporter', 'contact'];
    foreach ($required_fields as $field) {
        if (empty($input[$field])) {
            throw new Exception("Missing required field: $field");
        }
    }

    // Validate PH phone format only (no verification required)
    $contactPhoneRaw = preg_replace('/\s+/', '', (string)$input['contact']);
    if (!preg_match('/^(\+639\d{9}|09\d{9})$/', $contactPhoneRaw)) {
        throw new Exception('Invalid PH mobile format. Use 09xxxxxxxxx or +639xxxxxxxxx');
    }
    // Normalize to +63 format for consistency
    $contactPhone = preg_match('/^09\d{9}$/', $contactPhoneRaw) ? ('+63' . substr($contactPhoneRaw, 1)) : $contactPhoneRaw;
    $input['contact'] = $contactPhone;
    


    // Validate coordinates - require both start and end coordinates for road segments
    if (isset($input['start_lat']) && isset($input['start_lng']) && isset($input['end_lat']) && isset($input['end_lng']) &&
        $input['start_lat'] !== null && $input['start_lng'] !== null && $input['end_lat'] !== null && $input['end_lng'] !== null) {
        // Start-to-end incident (road segment)
        $start_lat = $input['start_lat'];
        $start_lng = $input['start_lng'];
        $end_lat = $input['end_lat'];
        $end_lng = $input['end_lng'];
        // Use start coordinates as primary lat/lng for backward compatibility
        $lat = $start_lat;
        $lng = $start_lng;
    } elseif (isset($input['lat']) && isset($input['lng']) && $input['lat'] !== null && $input['lng'] !== null) {
        // Single point incident (backward compatibility) - but convert to road segment
        $lat = $input['lat'];
        $lng = $input['lng'];
        // For single points, create a small road segment (10 meters apart) to enable road visualization
        $offset = 0.0001; // Approximately 10 meters
        $start_lat = $lat - $offset;
        $start_lng = $lng - $offset;
        $end_lat = $lat + $offset;
        $end_lng = $lng + $offset;
    } else {
        throw new Exception("Missing coordinate information. Both start and end coordinates are required for road segment visualization.");
    }
    

    
    // Ensure start/end coordinate columns exist
    try {
        $checkStartLat = $pdo->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = 'incidents' AND COLUMN_NAME = 'start_lat'");
        $checkStartLat->execute([':schema' => $db]);
        $hasStartLat = (int)$checkStartLat->fetchColumn();
        if ($hasStartLat === 0) {
            $pdo->exec("ALTER TABLE incidents ADD COLUMN start_lat DECIMAL(10, 8) AFTER lng");
        }
        $checkStartLng = $pdo->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = 'incidents' AND COLUMN_NAME = 'start_lng'");
        $checkStartLng->execute([':schema' => $db]);
        $hasStartLng = (int)$checkStartLng->fetchColumn();
        if ($hasStartLng === 0) {
            $pdo->exec("ALTER TABLE incidents ADD COLUMN start_lng DECIMAL(11, 8) AFTER start_lat");
        }
        $checkEndLat = $pdo->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = 'incidents' AND COLUMN_NAME = 'end_lat'");
        $checkEndLat->execute([':schema' => $db]);
        $hasEndLat = (int)$checkEndLat->fetchColumn();
        if ($hasEndLat === 0) {
            $pdo->exec("ALTER TABLE incidents ADD COLUMN end_lat DECIMAL(10, 8) AFTER start_lng");
        }
        $checkEndLng = $pdo->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = 'incidents' AND COLUMN_NAME = 'end_lng'");
        $checkEndLng->execute([':schema' => $db]);
        $hasEndLng = (int)$checkEndLng->fetchColumn();
        if ($hasEndLng === 0) {
            $pdo->exec("ALTER TABLE incidents ADD COLUMN end_lng DECIMAL(11, 8) AFTER end_lat");
        }
    } catch (Exception $e) { }

    // Ensure flood_level_cm column exists
    try {
        $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = 'incidents' AND COLUMN_NAME = 'flood_level_cm'");
        $checkStmt->execute([':schema' => $db]);
        $hasColumn = $checkStmt->fetchColumn();
        if ((int)$hasColumn === 0) {
            $pdo->exec("ALTER TABLE incidents ADD COLUMN flood_level_cm INT NULL AFTER severity");
        }
    } catch (Exception $e) { }

    // Capture flood level if provided and type is Flood
    $floodLevelCm = null;
    if (isset($input['floodLevelCm']) && strtolower($input['type']) === 'flood') {
        $floodLevelCm = is_numeric($input['floodLevelCm']) ? intval($input['floodLevelCm']) : null;
    }

    // Ensure allowed_vehicles column exists on incidents
    try {
        $checkAllowedVehicles = $pdo->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = 'incidents' AND COLUMN_NAME = 'allowed_vehicles'");
        $checkAllowedVehicles->execute([':schema' => $db]);
        $hasAllowedVehicles = (int)$checkAllowedVehicles->fetchColumn();
        if ($hasAllowedVehicles === 0) {
            $pdo->exec("ALTER TABLE incidents ADD COLUMN allowed_vehicles TEXT NULL AFTER flood_level_cm");
        }
    } catch (Exception $e) { }

    // Derive allowed vehicles text from flood level guidelines
    $allowedVehiclesText = '';
    if (strtolower($input['type']) === 'flood' && $floodLevelCm !== null) {
        if ($floodLevelCm <= 15) {
            $allowedVehiclesText = 'Motorcycle, Tricycle';
        } elseif ($floodLevelCm <= 30) {
            $allowedVehiclesText = 'Sedan/Hatchback, SUV, Jeepney, Van';
        } elseif ($floodLevelCm <= 45) {
            $allowedVehiclesText = 'Pickup, SUV, Van, Light Truck, Jeepney (caution)';
        } elseif ($floodLevelCm <= 60) {
            $allowedVehiclesText = 'Bus, Heavy Truck, Emergency vehicles';
        } else {
            $allowedVehiclesText = 'Road closed (Emergency vehicles only)';
        }
    }

    // Ensure incident_code and public_id columns exist and generate identifiers
    try {
        $checkIncidentCode = $pdo->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = 'incidents' AND COLUMN_NAME = 'incident_code'");
        $checkIncidentCode->execute([':schema' => $db]);
        $hasIncidentCode = (int)$checkIncidentCode->fetchColumn();
        if ($hasIncidentCode === 0) {
            $pdo->exec("ALTER TABLE incidents ADD COLUMN incident_code VARCHAR(12) NULL, ADD INDEX idx_code (incident_code)");
        }
    } catch (Exception $e) { }

    try {
        $checkPublicId = $pdo->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = 'incidents' AND COLUMN_NAME = 'public_id'");
        $checkPublicId->execute([':schema' => $db]);
        $hasPublicId = (int)$checkPublicId->fetchColumn();
        if ($hasPublicId === 0) {
            $pdo->exec("ALTER TABLE incidents ADD COLUMN public_id VARCHAR(32) NULL");
        }
        $checkUserId = $pdo->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = 'incidents' AND COLUMN_NAME = 'user_id'");
        $checkUserId->execute([':schema' => $db]);
        $hasUserId = (int)$checkUserId->fetchColumn();
        if ($hasUserId === 0) {
            $pdo->exec("ALTER TABLE incidents ADD COLUMN user_id INT DEFAULT 0 AFTER public_id");
        }
    } catch (Exception $e) { }

    // Use database auto-increment id as the unique incident code/public id.
    // Insert first, then update incident_code/public_id to the newly assigned id.
    $incomingPublicId = isset($input['public_id']) ? trim($input['public_id']) : '';
    $incident_code = null;

    // Check for potential duplicates (unless force_submit is true)
    if (empty($input['force_submit'])) {
        $duplicate_check_sql = "SELECT id, type, lat, lng, datetime, description, reporter 
                               FROM incidents 
                               WHERE type = :type 
                               AND ABS(lat - :lat) < 0.001 
                               AND ABS(lng - :lng) < 0.001 
                               AND ABS(TIMESTAMPDIFF(MINUTE, datetime, :datetime)) < 60
                               AND status != 'Rejected'
                               ORDER BY datetime DESC 
                               LIMIT 5";
        
        $duplicate_stmt = $pdo->prepare($duplicate_check_sql);
        $duplicate_stmt->execute([
            ':type' => $input['type'],
            ':lat' => $lat,
            ':lng' => $lng,
            ':datetime' => $input['datetime']
        ]);
        
        $potential_duplicates = $duplicate_stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (!empty($potential_duplicates)) {
            // Check if any of the potential duplicates are very similar
            foreach ($potential_duplicates as $existing) {
                $desc1_words = array_map('strtolower', explode(' ', $input['description']));
                $desc2_words = array_map('strtolower', explode(' ', $existing['description']));
                $common_words = count(array_intersect($desc1_words, $desc2_words));
                $total_words = count(array_unique(array_merge($desc1_words, $desc2_words)));
                $desc_similarity = $total_words > 0 ? ($common_words / $total_words) : 0;
                
                // If description similarity > 50% and same reporter, likely duplicate
                if ($desc_similarity > 0.5 && $existing['reporter'] === $input['reporter']) {
                    echo json_encode([
                        'success' => false,
                        'error' => 'Potential duplicate incident detected',
                        'duplicate_warning' => true,
                        'existing_incident' => $existing,
                        'similarity_score' => round($desc_similarity * 100, 2)
                    ]);
                    exit;
                }
            }
        }
    }
    
    // Prepare SQL statement with start-to-end support
    $sql = "INSERT INTO incidents (type, lat, lng, start_lat, start_lng, end_lat, end_lng, address, datetime, description, severity, flood_level_cm, allowed_vehicles, photo_url, reporter, contact, email, barangay, reported_by, status, incident_code, public_id, user_id, created_at) 
            VALUES (:type, :lat, :lng, :start_lat, :start_lng, :end_lat, :end_lng, :address, :datetime, :description, :severity, :flood_level_cm, :allowed_vehicles, :photo_url, :reporter, :contact, :email, :barangay, :reported_by, :status, :incident_code, :public_id, :user_id, NOW())";
    
    $stmt = $pdo->prepare($sql);
    
    // Execute with parameters (auto-approved status like hazards)
    $status = (isset($_SESSION['role']) && in_array($_SESSION['role'], ['admin', 'brgy'])) ? 'Verified' : 'Pending';
    
    // Allow status override (e.g. for Flood reports from Brgy)
    if (isset($input['status']) && $input['status'] === 'Verified') {
        $status = 'Verified';
    }

    $result = $stmt->execute([
        ':type' => $input['type'],
        ':lat' => $lat,
        ':lng' => $lng,
        ':start_lat' => $start_lat,
        ':start_lng' => $start_lng,
        ':end_lat' => $end_lat,
        ':end_lng' => $end_lng,
        ':address' => $input['address'],
        ':datetime' => $input['datetime'],
        ':description' => $input['description'],
        ':severity' => $input['severity'],
        ':flood_level_cm' => $floodLevelCm,
        ':allowed_vehicles' => $allowedVehiclesText,
        ':photo_url' => $input['photoUrl'] ?? '',
        ':reporter' => $input['reporter'],
        ':contact' => $input['contact'],
        ':email' => $input['email'] ?? '',
        ':barangay' => $input['barangay'] ?? '',
        ':reported_by' => $input['reporter'], // For backward compatibility
        ':status' => $status,
        ':incident_code' => $incident_code,
        ':public_id' => null,
        ':user_id' => $input['user_id'] ?? 0
    ]);
    
    if ($result) {
        $incident_id = (int)$pdo->lastInsertId();
        
        try {
            // Ensure columns exist (in case older schema)
            $pdo->exec("ALTER TABLE incidents ADD COLUMN incident_code VARCHAR(12) NULL");
        } catch (Exception $e) { /* ignore */ }
        try {
            $pdo->exec("ALTER TABLE incidents ADD COLUMN public_id VARCHAR(32) NULL");
        } catch (Exception $e) { /* ignore */ }

        // Update the incident to set code/public id as the DB id
        $upd = $pdo->prepare("UPDATE incidents SET incident_code = ?, public_id = ? WHERE id = ?");
        $upd->execute([strval($incident_id), strval($incident_id), $incident_id]);

        // Fetch the newly created incident
        $fetch_sql = "SELECT * FROM incidents WHERE id = :id";
        $fetch_stmt = $pdo->prepare($fetch_sql);
        $fetch_stmt->execute([':id' => $incident_id]);
        $incident = $fetch_stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'message' => 'Incident reported successfully - UPDATED VERSION',
            'incident_id' => $incident_id,
            'public_id' => strval($incident_id),
            'incident' => $incident,
            'incident_code' => strval($incident_id)
        ]);
    } else {
        throw new Exception("Failed to insert incident");
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
