/*!40014 SET FOREIGN_KEY_CHECKS=0*/;
/*!40101 SET NAMES binary*/;
CREATE TABLE `report_waste_types` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `analysis_id` int(11) NOT NULL,
  `waste_type_id` int(11) NOT NULL,
  `confidence_score` decimal(5,2) DEFAULT NULL,
  `percentage` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `fk_1` (`analysis_id`),
  KEY `fk_2` (`waste_type_id`),
  CONSTRAINT `fk_1` FOREIGN KEY (`analysis_id`) REFERENCES `db_ecolafaek`.`analysis_results` (`analysis_id`),
  CONSTRAINT `fk_2` FOREIGN KEY (`waste_type_id`) REFERENCES `db_ecolafaek`.`waste_types` (`waste_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
