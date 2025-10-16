/*!40014 SET FOREIGN_KEY_CHECKS=0*/;
/*!40101 SET NAMES binary*/;
CREATE TABLE `analysis_results` (
  `analysis_id` int(11) NOT NULL AUTO_INCREMENT,
  `report_id` int(11) NOT NULL,
  `analyzed_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `waste_type_id` int(11) DEFAULT NULL,
  `confidence_score` decimal(5,2) DEFAULT NULL,
  `estimated_volume` decimal(10,2) DEFAULT NULL,
  `severity_score` int(11) DEFAULT NULL,
  `priority_level` enum('low','medium','high','critical') DEFAULT 'low',
  `analysis_notes` text DEFAULT NULL,
  `full_description` text DEFAULT NULL,
  `processed_by` varchar(50) DEFAULT NULL,
  `image_embedding` vector(1024) DEFAULT NULL,
  `location_embedding` vector(1024) DEFAULT NULL,
  PRIMARY KEY (`analysis_id`) /*T![clustered_index] CLUSTERED */,
  KEY `fk_1` (`report_id`),
  KEY `fk_2` (`waste_type_id`),
  KEY `idx_analysis_report` (`report_id`),
  KEY `idx_analysis_results_date` (`analyzed_date`),
  KEY `` (`analyzed_date`),
  CONSTRAINT `fk_1` FOREIGN KEY (`report_id`) REFERENCES `db_ecolafaek`.`reports` (`report_id`),
  CONSTRAINT `fk_2` FOREIGN KEY (`waste_type_id`) REFERENCES `db_ecolafaek`.`waste_types` (`waste_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=1380001;
