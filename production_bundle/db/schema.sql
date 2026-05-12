-- E-LigtasMo Unified Database Schema
-- Optimized for production Hostinger environment

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+08:00";

-- 1. Unified Incident Reports Table
CREATE TABLE IF NOT EXISTS `incident_reports` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT '0',
  `type` varchar(100) NOT NULL,
  `barangay` varchar(100) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `severity` varchar(50) DEFAULT 'Moderate',
  `description` text,
  `image_path` varchar(255) DEFAULT NULL,
  `media_path` varchar(255) DEFAULT NULL,
  `media_paths` text,
  `photo_url` varchar(255) DEFAULT NULL,
  `reporter_name` varchar(255) DEFAULT NULL,
  `reporter_contact` varchar(100) DEFAULT NULL,
  `reporter_email` varchar(255) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'Pending',
  `approved_by` varchar(150) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `location_text` text,
  `is_passable` tinyint(1) DEFAULT '1',
  `allowed_modes` text,
  `area_geojson` longtext,
  `bbox_north` decimal(10,8) DEFAULT NULL,
  `bbox_south` decimal(10,8) DEFAULT NULL,
  `bbox_east` decimal(11,8) DEFAULT NULL,
  `bbox_west` decimal(11,8) DEFAULT NULL,
  `rejection_reason` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_barangay` (`barangay`),
  KEY `idx_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Notifications Table
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` enum('info','warning','success','error') NOT NULL DEFAULT 'info',
  `audience` enum('all','residents','barangay','admins') NOT NULL DEFAULT 'all',
  `brgy_name` varchar(100) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audience` (`audience`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Barangay Status Table
CREATE TABLE IF NOT EXISTS `barangay_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `barangay_name` varchar(100) NOT NULL,
  `status_level` enum('safe','monitor','warning','critical') DEFAULT 'safe',
  `message` text,
  `flood_depth_cm` int(11) DEFAULT '0',
  `updated_by` varchar(255) DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `barangay_name` (`barangay_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Shelters Table
CREATE TABLE IF NOT EXISTS `shelters` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `lat` decimal(10,8) DEFAULT NULL,
  `lng` decimal(11,8) DEFAULT NULL,
  `capacity` int(11) DEFAULT '0',
  `occupancy` int(11) DEFAULT '0',
  `status` varchar(50) DEFAULT 'available',
  `contact_person` varchar(255) DEFAULT NULL,
  `contact_number` varchar(100) DEFAULT NULL,
  `address` text,
  `category` varchar(100) DEFAULT NULL,
  `created_brgy` varchar(100) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Standard Operating Procedures (SOP) Runs
CREATE TABLE IF NOT EXISTS `sop_runs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `incident_id` int(11) NOT NULL,
  `sop_id` varchar(64) NOT NULL,
  `step_state` json DEFAULT NULL,
  `notes` text,
  `status` enum('in_progress','completed','overridden','archived') NOT NULL DEFAULT 'in_progress',
  `status_label` varchar(32) DEFAULT NULL,
  `started_by` int(11) DEFAULT NULL,
  `started_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` datetime DEFAULT NULL,
  `overridden_by` int(11) DEFAULT NULL,
  `overridden_reason` text,
  `team_assigned` varchar(128) DEFAULT NULL,
  `dispatched_at` datetime DEFAULT NULL,
  `ppe_checklist` json DEFAULT NULL,
  `equipment_used` json DEFAULT NULL,
  `agencies_tagged` json DEFAULT NULL,
  `health_coordination` json DEFAULT NULL,
  `run_code` varchar(12) DEFAULT NULL,
  `destination_lat` decimal(10,8) DEFAULT NULL,
  `destination_lng` decimal(11,8) DEFAULT NULL,
  `last_updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_incident` (`incident_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

COMMIT;
