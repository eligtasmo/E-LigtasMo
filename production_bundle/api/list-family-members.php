<?php require_once 'cors.php'; ?><?php
header('Content-Type: application/json');

require_once 'db.php';

try {
    $userId = isset($_GET['user_id']) ? $_GET['user_id'] : 1; // Default to 1 for demo
    
    // Find the group this user belongs to or created
    $stmt = $pdo->prepare("SELECT g.* FROM family_groups g 
                          JOIN family_members m ON g.id = m.group_id 
                          WHERE m.user_id = ? OR g.creator_id = ? 
                          LIMIT 1");
    $stmt->execute([$userId, $userId]);
    $group = $stmt->fetch();
    
    if (!$group) {
        echo json_encode(['success' => true, 'group' => null, 'members' => []]);
        exit;
    }
    
    // Fetch all members of this group
    $stmt = $pdo->prepare("SELECT * FROM family_members WHERE group_id = ? ORDER BY created_at ASC");
    $stmt->execute([$group['id']]);
    $members = $stmt->fetchAll();
    
    echo json_encode([
        'success' => true, 
        'group' => $group, 
        'members' => $members
    ]);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
