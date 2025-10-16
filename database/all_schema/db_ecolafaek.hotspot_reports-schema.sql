/*!40014 SET FOREIGN_KEY_CHECKS=0*/;
/*!40101 SET NAMES binary*/;
CREATE TABLE `hotspot_reports` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `hotspot_id` int(11) NOT NULL,
  `report_id` int(11) NOT NULL,
  PRIMARY KEY (`id`) /*T![clustered_index] CLUSTERED */,
  KEY `fk_1` (`hotspot_id`),
  KEY `fk_2` (`report_id`),
  CONSTRAINT `fk_1` FOREIGN KEY (`hotspot_id`) REFERENCES `db_ecolafaek`.`hotspots` (`hotspot_id`),
  CONSTRAINT `fk_2` FOREIGN KEY (`report_id`) REFERENCES `db_ecolafaek`.`reports` (`report_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=840001;
