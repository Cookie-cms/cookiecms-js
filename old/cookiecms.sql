-- MySQL dump 10.13  Distrib 8.0.41, for Linux (x86_64)
--
-- Host: localhost    Database: cookiecms
-- ------------------------------------------------------
-- Server version       8.0.41

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `blacklisted_jwts`
--

DROP TABLE IF EXISTS `blacklisted_jwts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `blacklisted_jwts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `jwt` text NOT NULL,
  `expiration` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `expiration` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cloaks_lib`
--

DROP TABLE IF EXISTS `cloaks_lib`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cloaks_lib` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cloaks_users`
--

DROP TABLE IF EXISTS `cloaks_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cloaks_users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uid` bigint NOT NULL,
  `cloak_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `uid` (`uid`),
  KEY `cloak_id` (`cloak_id`),
  CONSTRAINT `cloaks_users_ibfk_1` FOREIGN KEY (`uid`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cloaks_users_ibfk_2` FOREIGN KEY (`cloak_id`) REFERENCES `cloaks_lib` (`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `hwids`
--

DROP TABLE IF EXISTS `hwids`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hwids` (
  `id` bigint NOT NULL,
  `publickey` blob,
  `hwDiskId` varchar(255) DEFAULT NULL,
  `baseboardSerialNumber` varchar(255) DEFAULT NULL,
  `graphicCard` varchar(255) DEFAULT NULL,
  `displayId` blob,
  `bitness` int DEFAULT NULL,
  `totalMemory` bigint DEFAULT NULL,
  `logicalProcessors` int DEFAULT NULL,
  `physicalProcessors` int DEFAULT NULL,
  `processorMaxFreq` bigint DEFAULT NULL,
  `battery` tinyint(1) NOT NULL DEFAULT '0',
  `banned` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `job_schedule`
--

DROP TABLE IF EXISTS `job_schedule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_schedule` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_name` varchar(255) NOT NULL,
  `action` varchar(255) NOT NULL,
  `target_id` int NOT NULL,
  `scheduled_date` bigint NOT NULL,
  `status` enum('pending','completed','cancelled') DEFAULT 'pending',
  `created_at` bigint DEFAULT NULL,
  `updated_at` bigint DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `skin_user`
--

DROP TABLE IF EXISTS `skin_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `skin_user` (
  `uid` bigint NOT NULL,
  `skin_id` varchar(100) NOT NULL,
  UNIQUE KEY `skins_lib_unique` (`uid`),
  KEY `skin_id` (`skin_id`),
  CONSTRAINT `skin_user_ibfk_1` FOREIGN KEY (`uid`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `skin_user_ibfk_2` FOREIGN KEY (`skin_id`) REFERENCES `skins_library` (`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `skins_library`
--

DROP TABLE IF EXISTS `skins_library`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `skins_library` (
  `uuid` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `ownerid` bigint NOT NULL,
  `slim` tinyint(1) NOT NULL DEFAULT '0',
  `hd` tinyint(1) NOT NULL DEFAULT '0',
  `disabled` tinyint(1) NOT NULL DEFAULT '0',
  `cloak_id` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`uuid`),
  KEY `ownerid` (`ownerid`),
  CONSTRAINT `skins_library_ibfk_1` FOREIGN KEY (`ownerid`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_permissions`
--

DROP TABLE IF EXISTS `user_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_permissions` (
  `uuid` varchar(100) NOT NULL,
  `name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint NOT NULL,
  `username` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `dsid` bigint DEFAULT NULL,
  `mail` varchar(255) DEFAULT NULL,
  `mail_verify` int DEFAULT '0',
  `uuid` char(36) DEFAULT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `perms` int NOT NULL DEFAULT '1',
  `accessToken` char(32) DEFAULT NULL,
  `serverID` varchar(41) DEFAULT NULL,
  `hwidId` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `hwidId` (`hwidId`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`hwidId`) REFERENCES `hwids` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `verify_codes`
--

DROP TABLE IF EXISTS `verify_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `verify_codes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userid` bigint NOT NULL,
  `code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `action` int NOT NULL,
  `expire` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `userid` (`userid`),
  CONSTRAINT `verify_codes_ibfk_1` FOREIGN KEY (`userid`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping routines for database 'cookiecms'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-02-02 12:29:20