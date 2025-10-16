/*!40014 SET FOREIGN_KEY_CHECKS=0*/;
/*!40101 SET NAMES binary*/;
CREATE TABLE `admin_notifications` (
  `notification_id` int(11) NOT NULL AUTO_INCREMENT,
  `admin_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` enum('info','warning','success','error') DEFAULT 'info',
  `read_status` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`) /*T![clustered_index] CLUSTERED */,
  KEY `fk_1` (`admin_id`),
  KEY `idx_admin_notifications_read` (`read_status`),
  KEY `idx_admin_notifications_admin_id` (`admin_id`),
  CONSTRAINT `fk_1` FOREIGN KEY (`admin_id`) REFERENCES `db_ecolafaek`.`admin_users` (`admin_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=30001;
