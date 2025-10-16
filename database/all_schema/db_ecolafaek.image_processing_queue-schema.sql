/*!40014 SET FOREIGN_KEY_CHECKS=0*/;
/*!40101 SET NAMES binary*/;
CREATE TABLE `image_processing_queue` (
  `queue_id` int(11) NOT NULL AUTO_INCREMENT,
  `report_id` int(11) NOT NULL,
  `image_url` varchar(255) NOT NULL,
  `status` enum('pending','processing','completed','failed') DEFAULT 'pending',
  `queued_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `processed_at` datetime DEFAULT NULL,
  `retry_count` int(11) DEFAULT '0',
  `error_message` text DEFAULT NULL,
  PRIMARY KEY (`queue_id`) /*T![clustered_index] CLUSTERED */,
  KEY `fk_1` (`report_id`),
  CONSTRAINT `fk_1` FOREIGN KEY (`report_id`) REFERENCES `db_ecolafaek`.`reports` (`report_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin AUTO_INCREMENT=1470001;
