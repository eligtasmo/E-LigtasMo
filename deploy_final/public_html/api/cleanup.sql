-- Database Cleanup and Standardization SQL
-- Target Database: eligtasmo

USE eligtasmo;

-- 1. Reset Users Table
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- 2. Insert Standardized Accounts
INSERT INTO users (username, password, full_name, brgy_name, role, email, city, province, status, contact_number) VALUES
('admin', '$2y$10$1Sqv75F2WaUpBQdUJ7vTI.T8giW3D6gfJS9rEO5uIljtSlzkUorJa', 'System Administrator', 'All', 'admin', 'admin@eligtasmo.com', 'Santa Cruz', 'Laguna', 'approved', '09123456789'),
('brgy', '$2y$10$2vz/wX.P1K6RL1qAh28rgeJcNsdHziamwIHodSlQwT3SH1EKVz6ey', 'Barangay Official', 'Santisima Cruz', 'brgy', 'brgy@eligtasmo.com', 'Santa Cruz', 'Laguna', 'approved', '09123456789'),
('resident', '$2y$10$0L/fsqUlshYzynQBa7i3X.llF1tATorAj8QQBAPOQc9j8UwE5VR4G', 'Resident User', 'Santisima Cruz', 'resident', 'resident@eligtasmo.com', 'Santa Cruz', 'Laguna', 'approved', '09123456789'),
('coordinator', '$2y$10$znCT.xDXv5q1qQtOfBIzw.KEfsDW3YEUHbqv/QkFCwctEf/Gsa1Xq', 'Emergency Coordinator', 'All', 'coordinator', 'coordinator@eligtasmo.com', 'Santa Cruz', 'Laguna', 'approved', '09123456789');

-- 3. Deduplicate Shelters
DELETE t1 FROM shelters t1
INNER JOIN shelters t2 
WHERE t1.id > t2.id 
AND t1.name = t2.name 
AND t1.lat = t2.lat 
AND t1.lng = t2.lng;

-- 4. Deduplicate Social Posts
DELETE t1 FROM social_posts t1
INNER JOIN social_posts t2 
WHERE t1.id > t2.id 
AND t1.content = t2.content 
AND t1.source_name = t2.source_name;

-- 5. Deduplicate Flood Reports
DELETE t1 FROM incident_reports t1
INNER JOIN incident_reports t2 
WHERE t1.id > t2.id 
AND t1.latitude = t2.latitude 
AND t1.longitude = t2.longitude 
AND t1.description = t2.description;
