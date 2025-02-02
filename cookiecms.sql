-- Create the users table
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
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create the hwids table
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

-- Create the skins table
CREATE TABLE `skins_library` (
  `uuid` VARCHAR(255) NOT NULL,  -- Уникальный идентификатор скина (например, имя файла)
  `name` VARCHAR(255) NOT NULL,  -- Название скина (например, "Test Skin")
  `ownerid` BIGINT NOT NULL,     -- ID владельца скина
  `slim` BOOLEAN NOT NULL DEFAULT FALSE,  -- Тип модели (узкая или стандартная)
  `hd` BOOLEAN NOT NULL DEFAULT FALSE,    -- HD-скин (размер больше 64x64)
  `disabled` BOOLEAN NOT NULL DEFAULT FALSE,  -- Отключён ли скин
  `cloak_id` INT NOT NULL DEFAULT 0,  -- Связь с плащом (если есть)
  PRIMARY KEY (`uuid`),
  FOREIGN KEY (`ownerid`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create the skin_user table
CREATE TABLE `skin_user` (
  `uid` bigint NOT NULL,
  `skin_id` varchar(100) NOT NULL,
  UNIQUE KEY `skins_lib_unique` (`uid`),
  FOREIGN KEY (`uid`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`skin_id`) REFERENCES `skins_library` (`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- Create the cloaks_lib table
CREATE TABLE `cloaks_lib` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cloaks_users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uid` bigint NOT NULL,
  `cloak_id` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`uid`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`cloak_id`) REFERENCES `cloaks_lib` (`uuid`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create the blacklisted_jwts table
CREATE TABLE `blacklisted_jwts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `jwt` text NOT NULL,
  `expiration` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `expiration` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create the verify_codes table
CREATE TABLE `verify_codes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userid` bigint NOT NULL,
  `code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `action` int NOT NULL,
  `expire` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`userid`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create the user_permissions table
CREATE TABLE `user_permissions` (
  `uuid` varchar(100) NOT NULL,
  `name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Create the job_schedule table
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

-- Add foreign key constraints
ALTER TABLE `users` ADD FOREIGN KEY (`hwidId`) REFERENCES `hwids` (`id`) ON DELETE SET NULL;
ALTER TABLE `skins` ADD FOREIGN KEY (`id`) REFERENCES `skins_lib` (`id`) ON DELETE CASCADE;