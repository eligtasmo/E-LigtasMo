<?php
$conn = mysqli_connect("192.168.1.19", "root", "", "eligtasmo");
if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
}
echo "Connected successfully\n";

// Truncate and insert
mysqli_query($conn, "SET FOREIGN_KEY_CHECKS = 0");
mysqli_query($conn, "TRUNCATE TABLE users");
mysqli_query($conn, "SET FOREIGN_KEY_CHECKS = 1");

$sql = "INSERT INTO users (username, password, full_name, role, status, brgy_name) VALUES 
('admin', '$2y$10$1Sqv75F2WaUpBQdUJ7vTI.T8giW3D6gfJS9rEO5uIljtSlzkUorJa', 'System Administrator', 'admin', 'approved', 'All'),
('brgy', '$2y$10$2vz/wX.P1K6RL1qAh28rgeJcNsdHziamwIHodSlQwT3SH1EKVz6ey', 'Barangay Official', 'brgy', 'approved', 'Santisima Cruz'),
('resident', '$2y$10$0L/fsqUlshYzynQBa7i3X.llF1tATorAj8QQBAPOQc9j8UwE5VR4G', 'Resident User', 'resident', 'approved', 'Santisima Cruz'),
('coordinator', '$2y$10$znCT.xDXv5q1qQtOfBIzw.KEfsDW3YEUHbqv/QkFCwctEf/Gsa1Xq', 'Emergency Coordinator', 'coordinator', 'approved', 'All')";

if (mysqli_query($conn, $sql)) {
    echo "Users reset successfully\n";
} else {
    echo "Error: " . mysqli_error($conn) . "\n";
}

// Cleanup others
mysqli_query($conn, "DELETE t1 FROM shelters t1 INNER JOIN shelters t2 WHERE t1.id > t2.id AND t1.name = t2.name");
echo "Done cleanup.\n";
mysqli_close($conn);
?>
