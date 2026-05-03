<?php
require_once "cors.php";
header("Access-Control-Max-Age: 86400");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
header("Content-Type: application/json");

// Use shared database connection
require_once 'db.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || !isset($input['id']) || !isset($input['status'])) {
        throw new Exception("Missing id or status");
    }

    // 0) If attempting to mark as Resolved, enforce SOP completion gating
    if (isset($input['status']) && strcasecmp($input['status'], 'Resolved') === 0) {
        // Ensure there is at least one SOP run for this incident and at least one completed run
        // If your SOP runs table doesn't exist, this will throw; catch and surface a helpful message.
        try {
            $countStmt = $pdo->prepare("SELECT COUNT(*) AS total_runs FROM sop_runs WHERE incident_id = :id");
            $countStmt->execute([':id' => $input['id']]);
            $countRow = $countStmt->fetch(PDO::FETCH_ASSOC);
            $totalRuns = isset($countRow['total_runs']) ? (int)$countRow['total_runs'] : 0;

            if ($totalRuns === 0) {
                throw new Exception('Resolution blocked: no SOP run exists for this incident. Start and complete an SOP to resolve.');
            }

            $completedStmt = $pdo->prepare("SELECT COUNT(*) AS completed_runs FROM sop_runs WHERE incident_id = :id AND status = 'completed'");
            $completedStmt->execute([':id' => $input['id']]);
            $completedRow = $completedStmt->fetch(PDO::FETCH_ASSOC);
            $completedRuns = isset($completedRow['completed_runs']) ? (int)$completedRow['completed_runs'] : 0;

            if ($completedRuns === 0) {
                throw new Exception('Resolution blocked: no completed SOP runs found for this incident. Complete an SOP before resolving.');
            }
        } catch (Exception $gateEx) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => $gateEx->getMessage()]);
            exit();
        }
    }

    // 1) Update incident status
    $fields = [
        'status' => $input['status'],
        'reviewed_at' => date('Y-m-d H:i:s'),
    ];
    if (isset($input['rejectionReason'])) {
        $fields['rejection_reason'] = $input['rejectionReason'];
    }

    $set = [];
    foreach ($fields as $key => $val) {
        $set[] = "$key = :$key";
    }
    $setStr = implode(', ', $set);

    $stmt = $pdo->prepare("UPDATE incidents SET $setStr WHERE id = :id");
    $fields['id'] = $input['id'];
    $stmt->execute($fields);

    $response = ['success' => true];

    // 2) If approved/verified, create a corresponding hazard and persisted danger zone path
    if (strcasecmp($input['status'], 'Approved') === 0 || strcasecmp($input['status'], 'Verified') === 0) {
        // Fetch the incident row
        $fetchStmt = $pdo->prepare("SELECT * FROM incidents WHERE id = :id LIMIT 1");
        $fetchStmt->execute([':id' => $input['id']]);
        $incident = $fetchStmt->fetch(PDO::FETCH_ASSOC);

        if ($incident) {
            // Prevent duplicate hazards for the same incident using a simple heuristic
            $dupCheck = $pdo->prepare("SELECT id FROM hazards WHERE type = :type AND lat = :lat AND lng = :lng AND datetime = :datetime LIMIT 1");
            $dupCheck->execute([
                ':type' => $incident['type'],
                ':lat' => $incident['lat'],
                ':lng' => $incident['lng'],
                ':datetime' => $incident['datetime'],
            ]);
            $existingHazard = $dupCheck->fetch(PDO::FETCH_ASSOC);

            if (!$existingHazard) {
                // Map coordinates: support start/end if present, else use single point
                $start_lat = isset($incident['start_lat']) && $incident['start_lat'] !== null ? $incident['start_lat'] : $incident['lat'];
                $start_lng = isset($incident['start_lng']) && $incident['start_lng'] !== null ? $incident['start_lng'] : $incident['lng'];
                $end_lat   = isset($incident['end_lat']) && $incident['end_lat'] !== null ? $incident['end_lat'] : $incident['lat'];
                $end_lng   = isset($incident['end_lng']) && $incident['end_lng'] !== null ? $incident['end_lng'] : $incident['lng'];

                // Allowed vehicle modes mapping
                $allowed_modes = '';
                if (isset($incident['allowed_vehicles'])) {
                    $allowed_modes = is_array($incident['allowed_vehicles'])
                        ? json_encode(array_values($incident['allowed_vehicles']))
                        : (string)$incident['allowed_vehicles'];
                }

                // Insert hazard mirroring add-hazard.php behavior (status = 'active')
                $ins = $pdo->prepare(
                    "INSERT INTO hazards (type, lat, lng, start_lat, start_lng, end_lat, end_lng, address, datetime, description, severity, photo_url, reporter, contact, email, allowed_modes, barangay, reported_by, status, created_at) 
                     VALUES (:type, :lat, :lng, :start_lat, :start_lng, :end_lat, :end_lng, :address, :datetime, :description, :severity, :photo_url, :reporter, :contact, :email, :allowed_modes, :barangay, :reported_by, :status, NOW())"
                );

                $ins->execute([
                    ':type' => $incident['type'],
                    ':lat' => $incident['lat'],
                    ':lng' => $incident['lng'],
                    ':start_lat' => $start_lat,
                    ':start_lng' => $start_lng,
                    ':end_lat' => $end_lat,
                    ':end_lng' => $end_lng,
                    ':address' => $incident['address'],
                    ':datetime' => $incident['datetime'],
                    ':description' => $incident['description'],
                    ':severity' => $incident['severity'],
                    ':photo_url' => $incident['photo_url'] ?? '',
                    ':reporter' => $incident['reporter'],
                    ':contact' => $incident['contact'],
                    ':email' => $incident['email'] ?? '',
                    ':allowed_modes' => $allowed_modes,
                    ':barangay' => '',
                    ':reported_by' => $incident['reporter'],
                    ':status' => 'active',
                ]);

                $hazardId = $pdo->lastInsertId();
                $response['hazard_created'] = true;
                $response['hazard_id'] = $hazardId;

                // Persist a road-following danger zone path for this approved incident
                try {
                    $profile = 'driving-car';
                    $coords = [ [$start_lng, $start_lat], [$end_lng, $end_lat] ];
                    $apiKey = getenv('OPENROUTESERVICE_API_KEY');
                    if (!$apiKey || $apiKey === '') {
                        $apiKey = '5b3ce3597851110001cf6248d40a71b0b51c4c9eb9927348e7276122';
                    }
                    $url = "https://api.openrouteservice.org/v2/directions/$profile/geojson";
                    $ch = curl_init($url);
                    $body = json_encode(['coordinates' => $coords]);
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_POST, true);
                    curl_setopt($ch, CURLOPT_HTTPHEADER, [
                        'Authorization: ' . $apiKey,
                        'Content-Type: application/json',
                        'Accept: application/geo+json'
                    ]);
                    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
                    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
                    $responseRaw = curl_exec($ch);
                    $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    $lineCoords = null;
                    if ($responseRaw && $statusCode >= 200 && $statusCode < 300) {
                        $json = json_decode($responseRaw, true);
                        if (is_array($json) && isset($json['features'][0]['geometry']['coordinates'])) {
                            $lineCoords = $json['features'][0]['geometry']['coordinates'];
                        }
                    }
                    if (!$lineCoords) {
                        $osrmUrl = "https://router.project-osrm.org/route/v1/driving/" . $coords[0][0] . "," . $coords[0][1] . ";" . $coords[1][0] . "," . $coords[1][1] . "?overview=full&geometries=geojson&steps=false";
                        $och = curl_init($osrmUrl);
                        curl_setopt($och, CURLOPT_RETURNTRANSFER, true);
                        curl_setopt($och, CURLOPT_TIMEOUT, 10);
                        $oResp = curl_exec($och);
                        $oStat = curl_getinfo($och, CURLINFO_HTTP_CODE);
                        if ($oResp && $oStat >= 200 && $oStat < 300) {
                            $oJson = json_decode($oResp, true);
                            if (isset($oJson['routes'][0]['geometry']['coordinates'])) {
                                $lineCoords = $oJson['routes'][0]['geometry']['coordinates'];
                            }
                        }
                    }
                    if (!$lineCoords) {
                        $lineCoords = $coords; // final fallback
                    }
                    $latlngPairs = [];
                    foreach ($lineCoords as $p) {
                        if (is_array($p) && count($p) >= 2) {
                            $latlngPairs[] = [ (float)$p[1], (float)$p[0] ];
                        }
                    }
                    $dzIns = $pdo->prepare(
                        "INSERT INTO danger_zones (path, description, reported_by, reported_at, type, status, created_at) 
                         VALUES (:path, :description, :reported_by, :reported_at, :type, 'active', NOW())"
                    );
                    $dzIns->execute([
                        ':path' => json_encode($latlngPairs),
                        ':description' => ($incident['description'] ?? ''),
                        ':reported_by' => ($incident['reporter'] ?? 'Unknown'),
                        ':reported_at' => ($incident['datetime'] ?? date('Y-m-d H:i:s')),
                        ':type' => ($incident['type'] ?? 'other')
                    ]);
                    $response['danger_zone_created'] = true;
                } catch (Exception $e) {
                    // Non-fatal: approval succeeds even if path persistence fails
                    $response['danger_zone_created'] = false;
                }
            } else {
                $response['hazard_created'] = false;
                $response['hazard_existing_id'] = $existingHazard['id'];
            }
        }
    }

    // 3) Targeted Notification for the Reporter
    try {
        $fetchStmt = $pdo->prepare("SELECT user_id, type FROM incidents WHERE id = :id LIMIT 1");
        $fetchStmt->execute([':id' => $input['id']]);
        $incident = $fetchStmt->fetch(PDO::FETCH_ASSOC);

        if ($incident && isset($incident['user_id']) && $incident['user_id'] > 0) {
            $status = $input['status'];
            $type = $incident['type'];
            $notifTitle = "Incident Intelligence Updated";
            $notifMsg = "Your $type report (ID: " . $input['id'] . ") has been marked as $status by Tactical Command.";
            $notifType = strcasecmp($status, 'Rejected') === 0 ? 'error' : (strcasecmp($status, 'Resolved') === 0 ? 'success' : 'info');
            
            $sqlNotif = "INSERT INTO notifications (title, message, type, audience, user_id, created_at) VALUES (?, ?, ?, 'residents', ?, NOW())";
            $stmtNotif = $pdo->prepare($sqlNotif);
            $stmtNotif->execute([$notifTitle, $notifMsg, $notifType, $incident['user_id']]);
        }
    } catch (Exception $notifEx) { /* Non-fatal */ }

    echo json_encode($response);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
