-- Create database
CREATE DATABASE db_ecolafaek;
USE db_ecolafaek;

-- Users table to store citizen information
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) UNIQUE,
    phone_number VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    account_status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    profile_image_url VARCHAR(255),
    verification_status BOOLEAN DEFAULT FALSE
);

-- Locations table to store predefined locations/districts in Timor-Leste
CREATE TABLE locations (
    location_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    district VARCHAR(100),
    sub_district VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    population_estimate INT,
    area_sqkm DECIMAL(10, 2)
);

-- Waste types classification table
CREATE TABLE waste_types (
    waste_type_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    hazard_level ENUM('low', 'medium', 'high') DEFAULT 'low',
    recyclable BOOLEAN DEFAULT FALSE,
    icon_url VARCHAR(255)
);

-- Reports table for citizen waste reports
CREATE TABLE reports (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location_id INT,
    report_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    status ENUM('submitted', 'analyzing', 'analyzed', 'resolved', 'rejected') DEFAULT 'submitted',
    image_url VARCHAR(255),
    device_info JSON,
    address_text VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (location_id) REFERENCES locations(location_id)
);

select * from reports;

-- Analysis results table
CREATE TABLE analysis_results (
    analysis_id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    analyzed_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    waste_type_id INT,
    confidence_score DECIMAL(5, 2),
    estimated_volume DECIMAL(10, 2),
    severity_score INT,
    priority_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low',
    analysis_notes TEXT,
    full_description TEXT,
    processed_by VARCHAR(50),
    image_embedding VECTOR(1024),
    location_embedding VECTOR(1024),
    FOREIGN KEY (report_id) REFERENCES reports(report_id),
    FOREIGN KEY (waste_type_id) REFERENCES waste_types(waste_type_id)
);



-- Secondary waste types identified in a report (many-to-many relationship)
CREATE TABLE report_waste_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    analysis_id INT NOT NULL,
    waste_type_id INT NOT NULL,
    confidence_score DECIMAL(5, 2),
    percentage DECIMAL(5, 2),
    FOREIGN KEY (analysis_id) REFERENCES analysis_results(analysis_id),
    FOREIGN KEY (waste_type_id) REFERENCES waste_types(waste_type_id)
);

-- Hotspots table for identified waste problem areas
CREATE TABLE hotspots (
    hotspot_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    center_latitude DECIMAL(10, 8) NOT NULL,
    center_longitude DECIMAL(11, 8) NOT NULL,
    radius_meters INT,
    location_id INT,
    first_reported DATE,
    last_reported DATE,
    total_reports INT DEFAULT 0,
    average_severity DECIMAL(5, 2),
    status ENUM('active', 'monitoring', 'resolved') DEFAULT 'active',
    notes TEXT,
    FOREIGN KEY (location_id) REFERENCES locations(location_id)
);

-- Connect reports to hotspots
CREATE TABLE hotspot_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hotspot_id INT NOT NULL,
    report_id INT NOT NULL,
    FOREIGN KEY (hotspot_id) REFERENCES hotspots(hotspot_id),
    FOREIGN KEY (report_id) REFERENCES reports(report_id)
);

-- Statistics table for pre-calculated dashboard metrics
CREATE TABLE dashboard_statistics (
    stat_id INT AUTO_INCREMENT PRIMARY KEY,
    stat_date DATE NOT NULL,
    location_id INT,
    waste_type_id INT,
    total_reports INT DEFAULT 0,
    resolved_reports INT DEFAULT 0,
    average_severity DECIMAL(5, 2),
    total_volume DECIMAL(10, 2),
    trend_direction ENUM('increasing', 'stable', 'decreasing'),
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(location_id),
    FOREIGN KEY (waste_type_id) REFERENCES waste_types(waste_type_id)
);

-- System logs
CREATE TABLE system_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    agent VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    log_level ENUM('info', 'warning', 'error', 'critical') DEFAULT 'info',
    related_id INT,
    related_table VARCHAR(50)
);

-- API keys for external integrations
CREATE TABLE api_keys (
    key_id INT AUTO_INCREMENT PRIMARY KEY,
    api_key VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    expiration_date DATETIME,
    active BOOLEAN DEFAULT TRUE,
    permissions JSON,
    last_used DATETIME,
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Image processing queue
CREATE TABLE image_processing_queue (
    queue_id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    queued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    retry_count INT DEFAULT 0,
    error_message TEXT,
    FOREIGN KEY (report_id) REFERENCES reports(report_id)
);

CREATE TABLE user_verifications (
    verification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    email VARCHAR(100) NOT NULL,
    otp VARCHAR(10) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    is_verified BOOLEAN DEFAULT FALSE,
    attempts INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE pending_registrations (
    registration_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    otp VARCHAR(10) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    attempts INT DEFAULT 0,
    UNIQUE KEY unique_email (email),
    UNIQUE KEY unique_username (username)
);

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


-- Creating indexes for performance
CREATE INDEX idx_reports_location ON reports(latitude, longitude);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_analysis_report ON analysis_results(report_id);
CREATE INDEX idx_hotspots_location ON hotspots(center_latitude, center_longitude);
CREATE INDEX idx_dashboard_stats_date ON dashboard_statistics(stat_date);
CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_admin_users_username ON admin_users(username);
CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_reports_status_date ON reports(status, report_date);
CREATE INDEX idx_analysis_results_date ON analysis_results(analyzed_date);
