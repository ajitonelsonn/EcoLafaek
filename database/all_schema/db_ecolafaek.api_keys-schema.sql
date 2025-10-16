/*!40014 SET FOREIGN_KEY_CHECKS=0*/;
/*!40101 SET NAMES binary*/;
CREATE TABLE `api_keys` (
  `key_id` int(11) NOT NULL AUTO_INCREMENT,
  `api_key` varchar(255) NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `expiration_date` datetime DEFAULT NULL,
  `active` tinyint(1) DEFAULT '1',
  `permissions` json DEFAULT NULL,
  `last_used` datetime DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`key_id`) /*T![clustered_index] CLUSTERED */,
  KEY `fk_1` (`created_by`),
  CONSTRAINT `fk_1` FOREIGN KEY (`created_by`) REFERENCES `db_ecolafaek`.`users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
