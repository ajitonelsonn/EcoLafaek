/*!40014 SET FOREIGN_KEY_CHECKS=0*/;
/*!40101 SET NAMES binary*/;
CREATE TABLE `reports` (
  `report_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `latitude` decimal(10,8) NOT NULL,
  `longitude` decimal(11,8) NOT NULL,
  `location_id` int(11) DEFAULT NULL,
  `report_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `description` text DEFAULT NULL,
  `status` enum('submitted','analyzing','analyzed','resolved','rejected') DEFAULT 'submitted',
  `image_url` varchar(255) DEFAULT NULL,
  `device_info` json DEFAULT NULL,
  `address_text` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`report_id`) /*T![clustered_index] CLUSTERED */,
  KEY `fk_1` (`user_id`),
  KEY `fk_2` (`location_id`),
  KEY `idx_reports_location` (`latitude`,`longitude`),
  KEY `idx_reports_status` (`status`),
  KEY `idx_reports_user_id` (`user_id`),
  KEY `idx_reports_status_date` (`status`,`report_date`),
  KEY `` (`status`,`report_date`),
  CONSTRAINT `fk_1` FOREIGN KEY (`user_id`) REFERENCES `db_ecolafaek`.`users` (`user_id`),
  CONSTRAINT `fk_2` FOREIGN KEY (`location_id`) REFERENCES `db_ecolafaek`.`locations` (`location_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=1500001;
