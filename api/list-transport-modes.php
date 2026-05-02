<?php
require_once 'cors.php';
header('Content-Type: application/json');
require_once 'db.php';
require_once 'session_boot.php';

$role = null;
if (isset($_SESSION['role'])) {
  $role = strtolower(trim((string)$_SESSION['role']));
}
if (!$role) {
  $role = isset($_GET['role']) ? strtolower(trim((string)$_GET['role'])) : 'resident';
}
if (!in_array($role, ['resident','brgy','admin','coordinator'], true)) {
  $role = 'resident';
}

$defaults = [
  [
    'code' => 'on_foot',
    'label' => 'Walking',
    'description' => 'Walking evacuation',
    'icon' => 'walk',
    'routing_profile' => 'foot-walking',
    'roles' => ['resident','brgy','admin','coordinator'],
    'sort_order' => 10,
  ],
  [
    'code' => 'motorcycle',
    'label' => 'Motorcycle',
    'description' => 'Fast mobility',
    'icon' => 'motorbike',
    'routing_profile' => 'driving-car',
    'roles' => ['resident','brgy','admin','coordinator'],
    'sort_order' => 20,
  ],
  [
    'code' => 'private_vehicle',
    'label' => 'Car',
    'description' => 'Personal car/van',
    'icon' => 'car',
    'routing_profile' => 'driving-car',
    'roles' => ['resident','brgy','admin','coordinator'],
    'sort_order' => 30,
  ],
  [
    'code' => 'rescue_truck',
    'label' => 'Truck',
    'description' => 'High clearance / cargo',
    'icon' => 'truck',
    'routing_profile' => 'driving-hgv',
    'roles' => ['resident','brgy','admin','coordinator'],
    'sort_order' => 40,
  ],
  [
    'code' => 'tricycle',
    'label' => 'Tricycle',
    'description' => 'Local public transport',
    'icon' => 'rickshaw',
    'routing_profile' => 'driving-car',
    'roles' => ['resident','brgy','admin','coordinator'],
    'sort_order' => 50,
  ],
  [
    'code' => 'evac_shuttle',
    'label' => 'Evac Shuttle',
    'description' => 'MDRRMO pickup/evac vehicle',
    'icon' => 'bus',
    'routing_profile' => 'driving-car',
    'roles' => ['resident','brgy','admin','coordinator'],
    'sort_order' => 60,
  ],
  [
    'code' => 'response_vehicle',
    'label' => 'Response Vehicle',
    'description' => 'MDRRMO emergency response',
    'icon' => 'ambulance',
    'routing_profile' => 'driving-car',
    'roles' => ['brgy','admin','coordinator'],
    'sort_order' => 70,
  ],
];

try {
  $exists = $pdo->query("SHOW TABLES LIKE 'transport_modes'")->fetch(PDO::FETCH_ASSOC);
  if (!$exists) {
    $filtered = array_values(array_filter($defaults, function ($m) use ($role) {
      return in_array($role, $m['roles'], true);
    }));
    usort($filtered, function ($a, $b) {
      return ($a['sort_order'] ?? 100) <=> ($b['sort_order'] ?? 100);
    });
    echo json_encode(['modes' => $filtered, 'source' => 'defaults']);
    exit;
  }

  $stmt = $pdo->query("SELECT id, code, label, description, icon, routing_profile, roles_json, is_active, sort_order FROM transport_modes WHERE is_active = 1 ORDER BY sort_order ASC, id ASC");
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  $out = [];
  foreach ($rows as $r) {
    $roles = [];
    if (!empty($r['roles_json'])) {
      $decoded = json_decode($r['roles_json'], true);
      if (is_array($decoded)) $roles = $decoded;
    }
    if ($roles && !in_array($role, $roles, true)) continue;
    $out[] = [
      'id' => (int)$r['id'],
      'code' => $r['code'],
      'label' => $r['label'],
      'description' => $r['description'],
      'icon' => $r['icon'],
      'routing_profile' => $r['routing_profile'],
      'roles' => $roles ?: ['resident','brgy','admin','coordinator'],
      'sort_order' => (int)($r['sort_order'] ?? 100),
    ];
  }

  if (empty($out)) {
    $filtered = array_values(array_filter($defaults, function ($m) use ($role) {
      return in_array($role, $m['roles'], true);
    }));
    usort($filtered, function ($a, $b) {
      return ($a['sort_order'] ?? 100) <=> ($b['sort_order'] ?? 100);
    });
    echo json_encode(['modes' => $filtered, 'source' => 'defaults']);
    exit;
  }

  echo json_encode(['modes' => $out, 'source' => 'database']);
} catch (Exception $e) {
  $filtered = array_values(array_filter($defaults, function ($m) use ($role) {
    return in_array($role, $m['roles'], true);
  }));
  usort($filtered, function ($a, $b) {
    return ($a['sort_order'] ?? 100) <=> ($b['sort_order'] ?? 100);
  });
  echo json_encode(['modes' => $filtered, 'source' => 'defaults']);
}
?>
