-- Admin users table for the admin panel
CREATE TABLE IF NOT EXISTS admin_users (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'admin', 'moderator') DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    active BOOLEAN DEFAULT TRUE
);

-- Insert default admin user (password is 'admin123')
INSERT IGNORE INTO admin_users (username, email, password_hash, role) VALUES 
('admin', 'admin@ecolafaek.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeJbCDMyWD1wB8gMO', 'super_admin');

-- Add missing waste types if they don't exist
INSERT IGNORE INTO waste_types (name, description, hazard_level, recyclable) VALUES
('Plastic', 'Plastic waste materials', 'medium', true),
('Organic', 'Biodegradable organic waste', 'low', false),
('Metal', 'Metal containers and objects', 'low', true),
('Paper', 'Paper and cardboard waste', 'low', true),
('Glass', 'Glass bottles and containers', 'medium', true),
('Electronic', 'Electronic waste and components', 'high', true),
('Hazardous', 'Dangerous chemical waste', 'high', false),
('Mixed', 'Mixed waste types', 'medium', false);

-- Create system settings table
CREATE TABLE IF NOT EXISTS system_settings (
    setting_id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    data_type ENUM('string', 'number', 'boolean') DEFAULT 'string',
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create notification templates table
CREATE TABLE IF NOT EXISTS notification_templates (
    template_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    type ENUM('email', 'sms', 'push') DEFAULT 'email',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default system settings
INSERT IGNORE INTO system_settings (setting_key, setting_value, data_type, description) VALUES
('app_name', 'EcoLafaek', 'string', 'Application name'),
('app_description', 'Environmental waste monitoring and management system', 'string', 'Application description'),
('admin_email', 'admin@ecolafaek.com', 'string', 'Administrator email address'),
('max_reports_per_user', '50', 'number', 'Maximum reports per user'),
('auto_analyze_reports', '1', 'boolean', 'Automatically analyze new reports'),
('maintenance_mode', '0', 'boolean', 'Enable maintenance mode'),
('allow_registration', '1', 'boolean', 'Allow new user registration'),
('require_email_verification', '0', 'boolean', 'Require email verification for new users'),
('session_timeout_minutes', '60', 'number', 'Session timeout in minutes'),
('max_file_size_mb', '10', 'number', 'Maximum file upload size in MB'),
('supported_file_types', 'jpg,jpeg,png,gif,pdf,doc,docx', 'string', 'Supported file extensions'),
('smtp_enabled', '0', 'boolean', 'Enable SMTP email sending'),
('smtp_host', '', 'string', 'SMTP server hostname'),
('smtp_port', '587', 'number', 'SMTP server port'),
('smtp_username', '', 'string', 'SMTP authentication username'),
('smtp_password', '', 'string', 'SMTP authentication password'),
('notification_email_enabled', '1', 'boolean', 'Enable email notifications'),
('notification_sms_enabled', '0', 'boolean', 'Enable SMS notifications'),
('data_retention_days', '365', 'number', 'Data retention period in days'),
('backup_frequency', 'daily', 'string', 'Database backup frequency'),
('api_rate_limit', '100', 'number', 'API rate limit per minute');

-- Insert default notification templates
INSERT IGNORE INTO notification_templates (name, subject, body, type) VALUES
('welcome_email', 'Welcome to EcoLafaek', 'Welcome to the EcoLafaek platform! Thank you for joining our environmental monitoring community.', 'email'),
('report_submitted', 'Report Submitted Successfully', 'Your environmental report has been submitted and is being processed. You will receive updates as it progresses through our analysis system.', 'email'),
('report_analyzed', 'Report Analysis Complete', 'Your environmental report has been analyzed. Please log in to view the results and recommendations.', 'email'),
('hotspot_alert', 'New Environmental Hotspot Alert', 'A new environmental hotspot has been identified in your area. Please take necessary precautions and consider reporting any related observations.', 'email');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_reports_status_date ON reports(status, report_date);
CREATE INDEX IF NOT EXISTS idx_analysis_results_date ON analysis_results(analyzed_date);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);