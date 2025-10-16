/*!40014 SET FOREIGN_KEY_CHECKS=0*/;
/*!40101 SET NAMES binary*/;
CREATE TABLE `hotspots` (
  `hotspot_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `center_latitude` decimal(10,8) NOT NULL,
  `center_longitude` decimal(11,8) NOT NULL,
  `radius_meters` int(11) DEFAULT NULL,
  `location_id` int(11) DEFAULT NULL,
  `first_reported` date DEFAULT NULL,
  `last_reported` date DEFAULT NULL,
  `total_reports` int(11) DEFAULT '0',
  `average_severity` decimal(5,2) DEFAULT NULL,
  `status` enum('active','monitoring','resolved') DEFAULT 'active',
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`hotspot_id`) /*T![clustered_index] CLUSTERED */,
  KEY `fk_1` (`location_id`),
  KEY `idx_hotspots_location` (`center_latitude`,`center_longitude`),
  CONSTRAINT `fk_1` FOREIGN KEY (`location_id`) REFERENCES `db_ecolafaek`.`locations` (`location_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=450001;
