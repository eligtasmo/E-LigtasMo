-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 09, 2025 at 09:45 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `eligtasmo`
--

-- --------------------------------------------------------

--
-- Table structure for table `barangay`
--

CREATE TABLE `barangay` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `barangay`
--

INSERT INTO `barangay` (`id`, `name`, `latitude`, `longitude`) VALUES
(1, 'ALIPIT', 14.2417000, 121.4322000),
(2, 'BAGUMBAYAN', 14.2687000, 121.4214000),
(3, 'BARANGAY I', 0.0000000, 0.0000000),
(4, 'BARANGAY II', 14.2762000, 121.4164000),
(5, 'BARANGAY III', 14.2749000, 121.4177000),
(6, 'BARANGAY IV', 14.2736000, 121.4189000),
(7, 'BARANGAY V', 14.2723000, 121.4202000),
(8, 'BUBUKAL', 14.2763000, 121.4152000),
(9, 'CALIOS', 14.2560000, 121.4264000),
(10, 'DUHAT', 14.2585000, 121.4370000),
(11, 'GATID', 14.2786000, 121.4325000),
(12, 'JASAAN', 14.2545000, 121.4075000),
(13, 'LABUIN', 14.2262000, 121.4133000),
(14, 'MALINAO', 14.2614000, 121.4386000),
(15, 'OOGONG', 14.2471000, 121.4361000),
(16, 'PAGSAWITAN', 14.2731000, 121.4250000),
(17, 'PALASAN', 14.2782000, 121.4271000),
(18, 'PATIMBAO', 14.2494000, 121.4117000),
(19, 'SAN JOSE', 14.2654000, 121.4352000),
(20, 'SAN JUAN', 14.2690000, 121.4299000),
(21, 'SAN PABLO NORTE', 14.2646000, 121.4413000),
(22, 'SAN PABLO SUR', 14.2595000, 121.4431000),
(23, 'SANTISIMA CRUZ', 14.2730000, 121.4281000),
(24, 'SANTO ANGEL NORTE', 14.2663000, 121.4382000),
(25, 'SANTO ANGEL SUR', 14.2631000, 121.4365000),
(26, 'SANTO ANGEL CENTRAL', 14.2842000, 121.4083000);

-- --------------------------------------------------------

--
-- Table structure for table `barangays`
--

CREATE TABLE `barangays` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `lat` decimal(10,8) NOT NULL,
  `lng` decimal(11,8) NOT NULL,
  `address` text NOT NULL,
  `contact` varchar(50) DEFAULT NULL,
  `type` varchar(50) DEFAULT 'Hall',
  `added_by` varchar(100) DEFAULT NULL,
  `added_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `barangays`
--

INSERT INTO `barangays` (`id`, `name`, `lat`, `lng`, `address`, `contact`, `type`, `added_by`, `added_at`, `created_at`) VALUES
(1, 'asdas', 14.23709694, 121.13628387, 'dsad', 'dsadas', 'Outpost', 'asdsadsad', '2025-07-06 12:34:53', '2025-07-06 12:34:53');

-- --------------------------------------------------------

--
-- Table structure for table `hazards`
--

CREATE TABLE `hazards` (
  `id` int(11) NOT NULL,
  `type` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `lat` double DEFAULT NULL,
  `lng` double DEFAULT NULL,
  `barangay` varchar(100) DEFAULT NULL,
  `reported_by` varchar(100) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `incidents`
--

CREATE TABLE `incidents` (
  `id` int(11) NOT NULL,
  `type` varchar(50) DEFAULT NULL,
  `lat` double DEFAULT NULL,
  `lng` double DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `datetime` datetime DEFAULT NULL,
  `description` text DEFAULT NULL,
  `severity` varchar(20) DEFAULT NULL,
  `photo_url` text DEFAULT NULL,
  `photo` varchar(255) DEFAULT NULL,
  `reporter` varchar(100) DEFAULT NULL,
  `contact` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `nearest_shelter` varchar(100) DEFAULT NULL,
  `status` enum('Pending','Approved','Rejected') DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `reviewed_by` varchar(100) DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `rejection_reason` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `incidents`
--

INSERT INTO `incidents` (`id`, `type`, `lat`, `lng`, `address`, `datetime`, `description`, `severity`, `photo_url`, `photo`, `reporter`, `contact`, `email`, `nearest_shelter`, `status`, `created_at`, `reviewed_by`, `reviewed_at`, `rejection_reason`) VALUES
(1, 'Flood', 14.300341995596, 121.10610346562, 'Pooc, Santa Rosa, Laguna, Calabarzon, 4026, Philippines', '2025-07-05 03:03:00', 'asdasd', 'Moderate', 'bg.jpg', NULL, 'asdsad', 'asdas', 'asdsadasss@gmail.com', 'Barangay Hall Shelter', '', '2025-07-05 03:11:43', NULL, '2025-07-06 07:36:27', NULL),
(2, 'Flood', 14.209995599625, 121.32751464844, 'San Felix, Victoria, Laguna, Calabarzon, 4011, Philippines', '2025-07-06 12:24:00', 'asdsada', 'Moderate', '', NULL, 'dasda', 'asdada', 'asdsada@gmail.com', '', '', '2025-07-06 12:24:25', NULL, '2025-07-07 09:31:55', NULL),
(3, 'Fire', 14.28185047169, 121.10778808594, 'Phillip II, San Lorenzo Royale Subdivision, Santa Rosa, Laguna, Calabarzon, 4026, Philippines', '2025-07-07 10:26:00', ' n', 'Moderate', '', NULL, 'asd', 'asdsa', 'captainkrampustv@gmail.com', 'Barangay Hall Shelter', 'Pending', '2025-07-07 10:32:18', NULL, NULL, NULL),
(4, 'Flood', 14.267215224559, 121.09680175781, 'South Lake Drive, Eton City, Malitlit, Santa Rosa, Laguna, Calabarzon, 4026, Philippines', '2025-07-07 10:51:00', 'sad', 'Moderate', '', NULL, 'asd', 'asd', 'captainkrampustv@gmail.com', 'Barangay Hall Shelter', 'Pending', '2025-07-07 10:52:07', NULL, NULL, NULL),
(5, 'Flood', 14.25124841621, 121.12289428711, 'Canton Road, Banay-Banay, Cabuyao, Laguna, Calabarzon, 4025, Philippines', '2025-07-07 10:55:00', 'asdsada', 'Moderate', '', NULL, 'asdsadsa', 'asdsa', 'asdsadasss@gmail.com', 'Barangay Hall Shelter', 'Pending', '2025-07-07 10:56:29', NULL, NULL, NULL),
(6, 'Flood', 14.216649789058, 121.15036010742, 'Parian, Calamba, Laguna, Calabarzon, 4027, Philippines', '2025-07-07 10:56:00', 'asdsadsa', 'Moderate', '', NULL, 'asda', 'dsadsa', 'dsadsasd@gmail.com', 'Barangay Hall Shelter', 'Pending', '2025-07-07 11:00:18', NULL, NULL, NULL),
(7, 'Flood', 14.256570811297, 121.1393737793, 'Banay-Banay, Cabuyao, Laguna, Calabarzon, 4025, Philippines', '2025-07-07 12:15:00', 'dsadsa', 'Moderate', 'cursor.png', NULL, 'asdsa', 'asdsa', 'captainkrampustv@gmail.com', 'Barangay Hall Shelter', 'Pending', '2025-07-07 12:15:45', NULL, NULL, NULL),
(8, 'Flood', 14.307127293115, 121.0871887207, 'Evergreen Street, Evergreen County, Biñan, Laguna, Calabarzon, 4024, Philippines', '2025-07-07 12:15:00', 'sd', 'Moderate', 'cursor.png', NULL, 'asd', 'asdsa', 'captainkrampustv@gmail.com', 'Barangay Hall Shelter', 'Pending', '2025-07-07 12:18:49', NULL, NULL, NULL),
(9, 'Flood', 14.343042094045, 121.06521606445, '5-25 Batanes St, 5-25, Pangasinan Street, Pacita I, San Pedro, Laguna, Calabarzon, 4023, Philippines', '2025-07-07 12:22:00', 'sda', 'Critical', '', NULL, 'asdsad', 'asdas', 'asdsada@gmail.com', 'Barangay Hall Shelter', 'Pending', '2025-07-07 12:22:38', NULL, NULL, NULL),
(10, 'Flood', 14.264554168371, 121.13250732422, 'NIA Road, Niugan, Cabuyao, Laguna, Calabarzon, 4025, Philippines', '2025-07-07 12:26:00', 'sdasadsa', 'Moderate', '', NULL, 'asd', 'asdsa', 'captainkrampustv@gmail.com', 'Barangay Hall Shelter', 'Pending', '2025-07-07 12:26:52', NULL, NULL, NULL),
(11, 'Flood', 14.264554168371, 121.13250732422, 'NIA Road, Niugan, Cabuyao, Laguna, Calabarzon, 4025, Philippines', '2025-07-07 12:26:00', 'sdasadsa', 'Moderate', '', NULL, 'asd', 'asdsa', 'captainkrampustv@gmail.com', 'Barangay Hall Shelter', 'Pending', '2025-07-07 12:27:03', NULL, NULL, NULL),
(12, 'Flood', 14.264554168371, 121.13250732422, 'NIA Road, Niugan, Cabuyao, Laguna, Calabarzon, 4025, Philippines', '2025-07-07 12:26:00', 'sdasadsa', 'Moderate', '', NULL, 'asd', 'asdsa', 'captainkrampustv@gmail.com', 'Barangay Hall Shelter', 'Pending', '2025-07-07 12:27:08', NULL, NULL, NULL),
(13, 'Flood', 14.264554168371, 121.13250732422, 'NIA Road, Niugan, Cabuyao, Laguna, Calabarzon, 4025, Philippines', '2025-07-07 12:26:00', 'sdasadsa', 'Moderate', '', NULL, 'asd', 'asdsa', 'captainkrampustv@gmail.com', 'Barangay Hall Shelter', 'Pending', '2025-07-07 12:28:49', NULL, NULL, NULL),
(14, 'Flood', 14.25124841621, 121.13250732422, 'Copper Street, Banay-Banay, Cabuyao, Laguna, Calabarzon, 4025, Philippines', '2025-07-07 12:33:00', 'asdasda', 'Moderate', '', NULL, 'asd', 'asdsa', 'captainkrampustv@gmail.com', 'Covered Court Shelter', 'Pending', '2025-07-07 12:33:36', NULL, NULL, NULL),
(15, 'Blocked Road', 14.177233812949, 121.20597839355, 'Tadlac, Los Baños, Laguna, Calabarzon, 4030, Philippines', '2025-07-09 06:02:00', 'sqds', 'Moderate', '', NULL, 'dasdas', '234', 'df@gmail.com', 'Barangay Hall Shelter', 'Pending', '2025-07-09 06:03:43', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `reports`
--

CREATE TABLE `reports` (
  `id` int(11) NOT NULL,
  `barangay` varchar(100) NOT NULL,
  `coordinator_name` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `date` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reports`
--

INSERT INTO `reports` (`id`, `barangay`, `coordinator_name`, `description`, `date`) VALUES
(1, 'Gatid', 'Juan Dela Cruz', 'Flooding near the riverbank reported.', '2025-06-16 23:06:29'),
(2, 'Pagsawitan', 'Maria Santos', 'Tree fell and blocked the main road.', '2025-06-16 23:06:29'),
(3, 'Palasan', 'Carlos Reyes', 'Evacuation center opened.', '2025-06-16 23:06:29'),
(4, 'Bagumbayan', 'Ana Lopez', 'Minor fire in residential area.', '2025-06-16 23:06:29'),
(5, 'MALINAO', 'krisyah kaye maristela', 'hatdog', '2025-06-18 14:22:24'),
(6, 'ALIPIT', 'elyser mancera', 'okkk', '2025-06-18 14:48:51'),
(7, 'PATIMBAO', 'cristina maristela', 'hjuicndjifnd', '2025-06-18 14:58:36');

-- --------------------------------------------------------

--
-- Table structure for table `shelters`
--

CREATE TABLE `shelters` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `lat` double NOT NULL,
  `lng` double NOT NULL,
  `capacity` int(11) NOT NULL,
  `occupancy` int(11) NOT NULL,
  `status` enum('available','full') NOT NULL,
  `contact_person` varchar(255) DEFAULT NULL,
  `contact_number` varchar(50) DEFAULT NULL,
  `address` varchar(500) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `photo` varchar(500) DEFAULT NULL,
  `created_by` varchar(100) DEFAULT NULL,
  `created_brgy` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `shelters`
--

INSERT INTO `shelters` (`id`, `name`, `lat`, `lng`, `capacity`, `occupancy`, `status`, `contact_person`, `contact_number`, `address`, `category`, `photo`, `created_by`, `created_brgy`, `created_at`) VALUES
(1, 'asdadsa', 14.232437996569, 121.12579768546, 100, 50, 'available', 'asdad', 'sadada', 'Mapagong, Calamba, Laguna, Calabarzon, 4027, Philippines', 'School', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAACXUlEQVRIDcVVO0gkQRCtkcUfJi5ccBcpIggq+IXLlgPRQEzMBXMTQUMxEEMFE8HQ7DIjQ5ONT/YuOIPDQCMNDExEVpOxX8/UTG1vdc94KFvBTlV1Vb36dW+0NztLnaCuToACs/KfwLHiFyk6r+q9wBZwbnycat05Tv01psurK04mP/DCvq/iWAL27x1lYWu7m1SbniCRQCF42Rl7QYHOSaALWyYBQ1w9eJVKt5pbyyCI9mwqZYKeZYAf/v4LcG/lUYnrFKdVZJUxAINq37TtOFLBiyq2LYa3rAhyEaFDlwGjIuBse7UqTTttaLl0AayWo9ByZdW2eKRCCoo2RuYqaSZBXQg4q9aNIEDdo9Jy5an/QTUeeP6i6rE0H0G+GattBujPxjmN9gyrm6oldP1yo6mpcv/4pB5UfzSpftubtRug1a', 'admin', 'Sample Barangay', '2025-07-06 12:22:58'),
(2, 'hghug', 14.367840732856, 121.04789819549, 103, 1, 'full', '1232131', '6767567', 'Dollar Street, Tunasan, Muntinlupa District 1, Muntinlupa, Southern Manila District, Metro Manila, 1773, Philippines', 'School', NULL, 'admin', 'Sample Barangay', '2025-07-09 05:34:03');

-- --------------------------------------------------------

--
-- Table structure for table `system_logs`
--

CREATE TABLE `system_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `username` varchar(255) DEFAULT NULL,
  `user_role` varchar(50) DEFAULT NULL,
  `action_type` varchar(100) NOT NULL,
  `action_description` text NOT NULL,
  `resource_type` varchar(100) DEFAULT NULL,
  `resource_id` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `status` varchar(50) DEFAULT 'success',
  `error_message` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `system_logs`
--

INSERT INTO `system_logs` (`id`, `user_id`, `username`, `user_role`, `action_type`, `action_description`, `resource_type`, `resource_id`, `ip_address`, `user_agent`, `status`, `error_message`, `created_at`) VALUES
(1, 1, NULL, 'admin', 'login', 'User admin logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36', 'success', NULL, '2025-07-05 16:13:09'),
(2, NULL, NULL, NULL, 'logout', 'User admin logged out', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36', 'success', NULL, '2025-07-06 12:24:57'),
(3, 3, NULL, 'brgy', 'login', 'User brgy logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36', 'success', NULL, '2025-07-06 12:25:03'),
(4, 3, NULL, 'brgy', 'login', 'User brgy logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36', 'success', NULL, '2025-07-06 12:25:10'),
(5, 3, NULL, 'brgy', 'login', 'User brgy logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36', 'success', NULL, '2025-07-06 12:34:04'),
(6, 3, NULL, 'brgy', 'login', 'User brgy logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36', 'success', NULL, '2025-07-06 12:34:16'),
(7, 1, NULL, 'admin', 'login', 'User admin logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36', 'success', NULL, '2025-07-06 12:35:33'),
(8, NULL, NULL, NULL, 'login', 'User admin logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36', 'success', NULL, '2025-07-07 06:25:23'),
(9, NULL, NULL, NULL, 'login', 'User admin logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36', 'success', NULL, '2025-07-07 06:25:31'),
(10, NULL, NULL, NULL, 'login', 'User admin logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36', 'success', NULL, '2025-07-07 06:25:53'),
(11, NULL, NULL, NULL, 'login', 'User admin logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36', 'success', NULL, '2025-07-07 06:25:57'),
(12, NULL, NULL, NULL, 'login', 'User admin logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0', 'success', NULL, '2025-07-07 06:26:47'),
(13, NULL, NULL, NULL, 'login', 'User admin logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0', 'success', NULL, '2025-07-07 06:29:09'),
(14, NULL, NULL, NULL, 'login', 'User admin logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0', 'success', NULL, '2025-07-07 06:29:15'),
(15, NULL, NULL, NULL, 'login', 'User admin logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0', 'success', NULL, '2025-07-07 06:29:18'),
(16, NULL, NULL, NULL, 'login', 'User admin logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1', 'success', NULL, '2025-07-07 06:29:44'),
(17, NULL, NULL, NULL, 'login', 'User admin logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36', 'success', NULL, '2025-07-07 06:32:43'),
(18, NULL, NULL, NULL, 'login', 'User brgy logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0', 'success', NULL, '2025-07-07 06:35:46'),
(19, NULL, NULL, NULL, 'login', 'User admin logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1', 'success', NULL, '2025-07-07 06:35:53'),
(20, NULL, NULL, NULL, 'login', 'User admin logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36', 'success', NULL, '2025-07-07 06:42:12'),
(21, NULL, NULL, NULL, 'login', 'User admin logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36', 'success', NULL, '2025-07-07 06:45:53'),
(22, NULL, NULL, NULL, 'login', 'User admin logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36', 'success', NULL, '2025-07-07 07:31:20'),
(23, NULL, NULL, NULL, 'logout', 'User admin logged out', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36', 'success', NULL, '2025-07-07 07:31:31'),
(24, 1, NULL, 'admin', 'login', 'User admin logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36', 'success', NULL, '2025-07-07 07:31:35'),
(25, NULL, NULL, NULL, 'logout', 'User admin logged out', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36', 'success', NULL, '2025-07-07 07:47:36'),
(26, 3, NULL, 'brgy', 'login', 'User brgy logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36', 'success', NULL, '2025-07-07 07:47:38'),
(27, NULL, NULL, NULL, 'login', 'User admin logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36', 'success', NULL, '2025-07-07 09:32:29'),
(28, 1, NULL, 'admin', 'login', 'User admin logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36', 'success', NULL, '2025-07-07 09:34:01'),
(29, 1, NULL, 'admin', 'login', 'User admin logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', 'success', NULL, '2025-07-09 05:27:21'),
(30, NULL, NULL, NULL, 'logout', 'User admin logged out', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', 'success', NULL, '2025-07-09 05:29:09'),
(31, 1, NULL, 'admin', 'login', 'User admin logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', 'success', NULL, '2025-07-09 05:31:16'),
(32, 1, NULL, 'admin', 'update', 'User profile updated: Admin', 'user', 'admin', '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', 'success', NULL, '2025-07-09 05:32:21'),
(33, NULL, NULL, NULL, 'logout', 'User admin logged out', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', 'success', NULL, '2025-07-09 05:34:34'),
(34, 3, NULL, 'brgy', 'login', 'User brgy logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', 'success', NULL, '2025-07-09 05:34:51'),
(35, NULL, NULL, NULL, 'logout', 'User brgy logged out', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', 'success', NULL, '2025-07-09 05:35:18'),
(36, 1, NULL, 'admin', 'login', 'User admin logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', 'success', NULL, '2025-07-09 05:35:24'),
(37, NULL, NULL, NULL, 'logout', 'User admin logged out', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', 'success', NULL, '2025-07-09 05:37:25'),
(38, 1, NULL, 'admin', 'login', 'User admin logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', 'success', NULL, '2025-07-09 05:42:43'),
(39, NULL, NULL, NULL, 'logout', 'User admin logged out', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', 'success', NULL, '2025-07-09 06:05:11'),
(40, 3, NULL, 'brgy', 'login', 'User brgy  logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', 'success', NULL, '2025-07-09 06:05:17'),
(41, NULL, NULL, NULL, 'login', 'User admin logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', 'success', NULL, '2025-07-09 06:20:13'),
(42, NULL, NULL, NULL, 'login', 'User admin logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', 'success', NULL, '2025-07-09 06:21:08'),
(43, NULL, NULL, NULL, 'login', 'User admin logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36', 'success', NULL, '2025-07-09 06:21:21'),
(44, NULL, NULL, NULL, 'login', 'User admin logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36', 'success', NULL, '2025-07-09 06:25:54'),
(45, NULL, NULL, NULL, 'logout', 'User admin logged out', 'user', NULL, '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36', 'success', NULL, '2025-07-09 06:26:19'),
(46, NULL, NULL, NULL, 'login', 'User admin logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36', 'success', NULL, '2025-07-09 06:31:34'),
(47, NULL, NULL, NULL, 'logout', 'User admin logged out', 'user', NULL, '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36', 'success', NULL, '2025-07-09 06:46:52'),
(48, NULL, NULL, NULL, 'login', 'User admin logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36', 'success', NULL, '2025-07-09 06:46:56'),
(49, NULL, NULL, NULL, 'logout', 'User admin logged out', 'user', NULL, '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36', 'success', NULL, '2025-07-09 06:47:04'),
(50, NULL, NULL, NULL, 'login', 'User admin logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36', 'success', NULL, '2025-07-09 06:47:31'),
(51, NULL, NULL, NULL, 'logout', 'User admin logged out', 'user', NULL, '::1', 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36', 'success', NULL, '2025-07-09 06:49:01'),
(52, 1, NULL, 'admin', 'login', 'User admin logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', 'success', NULL, '2025-07-09 07:06:05'),
(53, NULL, NULL, NULL, 'logout', 'User admin logged out', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', 'success', NULL, '2025-07-09 07:08:46'),
(54, 3, NULL, 'brgy', 'login', 'User brgy logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', 'success', NULL, '2025-07-09 07:08:50'),
(55, 3, NULL, 'brgy', 'login', 'User brgy logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', 'success', NULL, '2025-07-09 07:09:13'),
(56, 3, NULL, 'brgy', 'login', 'User brgy logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', 'success', NULL, '2025-07-09 07:20:53'),
(57, 1, NULL, 'admin', 'login', 'User admin logged in successfully', 'user', NULL, '::1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', 'success', NULL, '2025-07-09 07:24:04');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(100) NOT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `brgy_name` varchar(100) DEFAULT NULL,
  `contact_number` varchar(30) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','brgy') NOT NULL,
  `city` varchar(255) DEFAULT NULL,
  `province` varchar(255) DEFAULT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `full_name`, `brgy_name`, `contact_number`, `email`, `password`, `role`, `city`, `province`, `status`) VALUES
(1, 'admin', 'Admin', 'Sample Barangay', '09123456789', 'admin@example.com', '$2y$10$2keT5BCKBnfdfeinqrovuuhFUO1hO36CLQ5Ye83yBY9G.sOcxAmhy', 'admin', 'Sample City', 'Laguna', 'approved'),
(3, 'brgy', 'asdsadsad', 'Hagonoy', '09211234567', 'dsadsadsa@sgmail.com', '$2y$10$SyWSWp4jlaeejklaVIwaIO7fcN/P2G0stbuektRv2sE7oY/DpRlEm', 'brgy', 'Taguig', 'Laguna', 'approved'),
(4, 'tala', 'Krystal Maristela', 'Santa Ana', '87682637878', 'tala@gmail.com', '$2y$10$pM03mMo57qh5cBOWzsLGLu/DQdgW0eRX5AAypy5KMRQGzBdysWSwi', 'brgy', 'Cabuyao', 'Laguna', 'approved');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `barangays`
--
ALTER TABLE `barangays`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `hazards`
--
ALTER TABLE `hazards`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `incidents`
--
ALTER TABLE `incidents`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `shelters`
--
ALTER TABLE `shelters`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `system_logs`
--
ALTER TABLE `system_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_action_type` (`action_type`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_user_role` (`user_role`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `barangays`
--
ALTER TABLE `barangays`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `hazards`
--
ALTER TABLE `hazards`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `incidents`
--
ALTER TABLE `incidents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `shelters`
--
ALTER TABLE `shelters`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `system_logs`
--
ALTER TABLE `system_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=58;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
