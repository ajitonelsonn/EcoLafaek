/*!40014 SET FOREIGN_KEY_CHECKS=0*/;
/*!40101 SET NAMES binary*/;
CREATE TABLE `dashboard_statistics` (
  `stat_id` int(11) NOT NULL AUTO_INCREMENT,
  `stat_date` date NOT NULL,
  `location_id` int(11) DEFAULT NULL,
  `waste_type_id` int(11) DEFAULT NULL,
  `total_reports` int(11) DEFAULT '0',
  `resolved_reports` int(11) DEFAULT '0',
  `average_severity` decimal(5,2) DEFAULT NULL,
  `total_volume` decimal(10,2) DEFAULT NULL,
  `trend_direction` enum('increasing','stable','decreasing') DEFAULT NULL,
  `last_updated` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`stat_id`) /*T![clustered_index] CLUSTERED */,
  KEY `fk_1` (`location_id`),
  KEY `fk_2` (`waste_type_id`),
  KEY `idx_dashboard_stats_date` (`stat_date`),
  CONSTRAINT `fk_1` FOREIGN KEY (`location_id`) REFERENCES `db_ecolafaek`.`locations` (`location_id`),
  CONSTRAINT `fk_2` FOREIGN KEY (`waste_type_id`) REFERENCES `db_ecolafaek`.`waste_types` (`waste_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
