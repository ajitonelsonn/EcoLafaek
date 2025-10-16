/*!40014 SET FOREIGN_KEY_CHECKS=0*/;
/*!40101 SET NAMES binary*/;
CREATE TABLE `user_verifications` (
  `verification_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `email` varchar(100) NOT NULL,
  `otp` varchar(10) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT '0',
  `attempts` int(11) DEFAULT '0',
  PRIMARY KEY (`verification_id`) /*T![clustered_index] CLUSTERED */,
  KEY `fk_1` (`user_id`),
  CONSTRAINT `fk_1` FOREIGN KEY (`user_id`) REFERENCES `db_ecolafaek`.`users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
