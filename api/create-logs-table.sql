-- Create system_logs table for audit trail
CREATE TABLE IF NOT EXISTS system_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    username VARCHAR(255),
    user_role VARCHAR(50),
    action_type VARCHAR(100) NOT NULL,
    action_description TEXT NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(50) DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_action_type (action_type),
    INDEX idx_created_at (created_at),
    INDEX idx_user_role (user_role),
    INDEX idx_status (status)
);

-- Insert some sample log types for reference
-- Action types: login, logout, create, update, delete, approve, reject, view, export
-- Resource types: user, incident, shelter, announcement, emergency_contact, barangay_coordinator 