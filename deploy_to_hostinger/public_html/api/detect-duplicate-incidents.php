<?php
// Include common CORS configuration
require_once 'cors.php';

// Set content type
header("Content-Type: application/json");

// Use shared database connection
require_once 'db.php';

try {
    
    // Get query parameters
    $action = $_GET['action'] ?? 'detect';
    $merge_ids = $_GET['merge_ids'] ?? null;
    
    if ($action === 'detect') {
        // Detect potential duplicates based on:
        // 1. Same type and similar location (within 0.001 degrees ~100m)
        // 2. Similar time (within 1 hour)
        // 3. Similar description (basic text similarity)
        
        $sql = "
            SELECT 
                i1.id as id1,
                i1.type as type1,
                i1.lat as lat1,
                i1.lng as lng1,
                i1.address as address1,
                i1.datetime as datetime1,
                i1.description as description1,
                i1.reporter as reporter1,
                i1.status as status1,
                i2.id as id2,
                i2.type as type2,
                i2.lat as lat2,
                i2.lng as lng2,
                i2.address as address2,
                i2.datetime as datetime2,
                i2.description as description2,
                i2.reporter as reporter2,
                i2.status as status2,
                ABS(i1.lat - i2.lat) + ABS(i1.lng - i2.lng) as distance,
                ABS(TIMESTAMPDIFF(MINUTE, i1.datetime, i2.datetime)) as time_diff
            FROM incidents i1
            JOIN incidents i2 ON i1.id < i2.id
            WHERE i1.type = i2.type
            AND ABS(i1.lat - i2.lat) < 0.001
            AND ABS(i1.lng - i2.lng) < 0.001
            AND ABS(TIMESTAMPDIFF(MINUTE, i1.datetime, i2.datetime)) < 60
            AND (i1.status != 'Rejected' AND i2.status != 'Rejected')
            ORDER BY distance ASC, time_diff ASC
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        $duplicates = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Group duplicates and calculate similarity scores
        $duplicate_groups = [];
        foreach ($duplicates as $dup) {
            $similarity_score = 0;
            
            // Location similarity (closer = higher score)
            $location_score = max(0, 100 - ($dup['distance'] * 100000));
            
            // Time similarity (closer = higher score)
            $time_score = max(0, 100 - ($dup['time_diff'] * 2));
            
            // Description similarity (basic word matching)
            $desc1_words = array_map('strtolower', explode(' ', $dup['description1']));
            $desc2_words = array_map('strtolower', explode(' ', $dup['description2']));
            $common_words = count(array_intersect($desc1_words, $desc2_words));
            $total_words = count(array_unique(array_merge($desc1_words, $desc2_words)));
            $desc_score = $total_words > 0 ? ($common_words / $total_words) * 100 : 0;
            
            // Same reporter bonus
            $reporter_score = ($dup['reporter1'] === $dup['reporter2']) ? 20 : 0;
            
            $similarity_score = ($location_score * 0.4) + ($time_score * 0.3) + ($desc_score * 0.2) + ($reporter_score * 0.1);
            
            if ($similarity_score > 60) { // Only consider high similarity as duplicates
                $group_key = min($dup['id1'], $dup['id2']) . '_' . max($dup['id1'], $dup['id2']);
                $duplicate_groups[$group_key] = [
                    'incident1' => [
                        'id' => $dup['id1'],
                        'type' => $dup['type1'],
                        'lat' => $dup['lat1'],
                        'lng' => $dup['lng1'],
                        'address' => $dup['address1'],
                        'datetime' => $dup['datetime1'],
                        'description' => $dup['description1'],
                        'reporter' => $dup['reporter1'],
                        'status' => $dup['status1']
                    ],
                    'incident2' => [
                        'id' => $dup['id2'],
                        'type' => $dup['type2'],
                        'lat' => $dup['lat2'],
                        'lng' => $dup['lng2'],
                        'address' => $dup['address2'],
                        'datetime' => $dup['datetime2'],
                        'description' => $dup['description2'],
                        'reporter' => $dup['reporter2'],
                        'status' => $dup['status2']
                    ],
                    'similarity_score' => round($similarity_score, 2),
                    'distance_meters' => round($dup['distance'] * 111000, 2), // Convert to meters
                    'time_diff_minutes' => $dup['time_diff']
                ];
            }
        }
        
        echo json_encode([
            'success' => true,
            'duplicate_groups' => array_values($duplicate_groups),
            'total_groups' => count($duplicate_groups)
        ]);
        
    } elseif ($action === 'merge' && $merge_ids) {
        // Merge duplicate incidents
        $ids = explode(',', $merge_ids);
        if (count($ids) < 2) {
            throw new Exception("At least 2 incident IDs required for merging");
        }
        
        // Get the earliest incident as the primary one
        $placeholders = str_repeat('?,', count($ids) - 1) . '?';
        $stmt = $pdo->prepare("SELECT * FROM incidents WHERE id IN ($placeholders) ORDER BY datetime ASC");
        $stmt->execute($ids);
        $incidents = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (count($incidents) < 2) {
            throw new Exception("Invalid incident IDs");
        }
        
        $primary = $incidents[0];
        $duplicates = array_slice($incidents, 1);
        
        // Update primary incident with merged information
        $merged_description = $primary['description'];
        $merged_reporters = [$primary['reporter']];
        $merged_contacts = [$primary['contact']];
        
        foreach ($duplicates as $dup) {
            if (!in_array($dup['reporter'], $merged_reporters)) {
                $merged_reporters[] = $dup['reporter'];
            }
            if (!in_array($dup['contact'], $merged_contacts)) {
                $merged_contacts[] = $dup['contact'];
            }
            if (strlen($dup['description']) > strlen($merged_description)) {
                $merged_description = $dup['description'];
            }
        }
        
        // Update primary incident
        $update_sql = "UPDATE incidents SET 
                       description = ?, 
                       reporter = ?, 
                       contact = ?,
                       updated_at = NOW()
                       WHERE id = ?";
        $stmt = $pdo->prepare($update_sql);
        $stmt->execute([
            $merged_description,
            implode(', ', $merged_reporters),
            implode(', ', $merged_contacts),
            $primary['id']
        ]);
        
        // Mark duplicates as merged/rejected
        $duplicate_ids = array_column($duplicates, 'id');
        $placeholders = str_repeat('?,', count($duplicate_ids) - 1) . '?';
        $stmt = $pdo->prepare("UPDATE incidents SET status = 'Rejected', rejection_reason = 'Merged with incident #" . $primary['id'] . "' WHERE id IN ($placeholders)");
        $stmt->execute($duplicate_ids);
        
        echo json_encode([
            'success' => true,
            'message' => 'Incidents merged successfully',
            'primary_id' => $primary['id'],
            'merged_count' => count($duplicate_ids)
        ]);
        
    } else {
        throw new Exception("Invalid action or missing parameters");
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>