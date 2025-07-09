CREATE TABLE hazards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    description TEXT,
    lat DOUBLE,
    lng DOUBLE,
    barangay VARCHAR(100),
    reported_by VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
); 