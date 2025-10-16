/*!40014 SET FOREIGN_KEY_CHECKS=0*/;
/*!40101 SET NAMES binary*/;
CREATE TABLE `waste_types` (
  `waste_type_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `hazard_level` enum('low','medium','high') DEFAULT 'low',
  `recyclable` tinyint(1) DEFAULT '0',
  `icon_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`waste_type_id`) /*T![clustered_index] CLUSTERED */
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=150001;
