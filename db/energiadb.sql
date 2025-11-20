-- phpMyAdmin SQL Dump
-- version 5.2.1deb3
-- https://www.phpmyadmin.net/
--
-- Servidor: localhost:3306
-- Tiempo de generación: 20-11-2025 a las 08:34:39
-- Versión del servidor: 10.11.13-MariaDB-0ubuntu0.24.04.1
-- Versión de PHP: 8.3.6

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `energiadb`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `alertas`
--

CREATE TABLE `alertas` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `dispositivo_id` bigint(20) UNSIGNED NOT NULL,
  `tipo` enum('offline','bajo_rendimiento','alto_consumo','voltaje_anormal','factor_potencia_bajo','otro') NOT NULL,
  `nivel` enum('info','warning','error','critical') NOT NULL DEFAULT 'warning',
  `titulo` varchar(255) NOT NULL,
  `descripcion` text NOT NULL,
  `valor_medido` decimal(10,2) DEFAULT NULL,
  `valor_umbral` decimal(10,2) DEFAULT NULL,
  `fecha_alerta` timestamp NOT NULL,
  `fecha_resolucion` timestamp NULL DEFAULT NULL,
  `resuelta` tinyint(1) NOT NULL DEFAULT 0,
  `notas` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cache`
--

CREATE TABLE `cache` (
  `key` varchar(255) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cache_locks`
--

CREATE TABLE `cache_locks` (
  `key` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `expiration` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `calculos`
--

CREATE TABLE `calculos` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `nave_id` bigint(20) UNSIGNED NOT NULL,
  `fecha_calculo` timestamp NOT NULL,
  `produccion_solar_kw` decimal(10,3) NOT NULL DEFAULT 0.000,
  `consumo_nave_kw` decimal(10,3) NOT NULL DEFAULT 0.000,
  `vertido_red_kw` decimal(10,3) NOT NULL DEFAULT 0.000,
  `importacion_red_kw` decimal(10,3) NOT NULL DEFAULT 0.000,
  `autoconsumo_kw` decimal(10,3) NOT NULL DEFAULT 0.000,
  `porcentaje_autoconsumo` decimal(5,2) DEFAULT NULL,
  `porcentaje_autosuficiencia` decimal(5,2) DEFAULT NULL,
  `carga_bateria_kw` decimal(10,3) DEFAULT NULL,
  `descarga_bateria_kw` decimal(10,3) DEFAULT NULL,
  `soc_bateria_porcentaje` decimal(5,2) DEFAULT NULL,
  `co2_ahorrado_kg` decimal(10,3) DEFAULT NULL,
  `ahorro_estimado_euros` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `dispositivos`
--

CREATE TABLE `dispositivos` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `nave_id` bigint(20) UNSIGNED NOT NULL,
  `device_id` varchar(255) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `tipo` enum('produccion','consumo','red','bateria','otro') NOT NULL,
  `modelo` varchar(255) NOT NULL DEFAULT 'Shelly EM3',
  `ip_local` varchar(255) DEFAULT NULL,
  `firmware` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `configuracion` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`configuracion`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `failed_jobs`
--

CREATE TABLE `failed_jobs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `uuid` varchar(255) NOT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `jobs`
--

CREATE TABLE `jobs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` tinyint(3) UNSIGNED NOT NULL,
  `reserved_at` int(10) UNSIGNED DEFAULT NULL,
  `available_at` int(10) UNSIGNED NOT NULL,
  `created_at` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `job_batches`
--

CREATE TABLE `job_batches` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `total_jobs` int(11) NOT NULL,
  `pending_jobs` int(11) NOT NULL,
  `failed_jobs` int(11) NOT NULL,
  `failed_job_ids` longtext NOT NULL,
  `options` mediumtext DEFAULT NULL,
  `cancelled_at` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  `finished_at` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `lecturas`
--

CREATE TABLE `lecturas` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `dispositivo_id` bigint(20) UNSIGNED NOT NULL,
  `fecha_lectura` timestamp NOT NULL,
  `potencia_total_w` decimal(10,2) NOT NULL,
  `potencia_canal_1_w` decimal(10,2) DEFAULT NULL,
  `potencia_canal_2_w` decimal(10,2) DEFAULT NULL,
  `potencia_canal_3_w` decimal(10,2) DEFAULT NULL,
  `energia_total_kwh` decimal(12,3) NOT NULL,
  `energia_retornada_kwh` decimal(12,3) NOT NULL DEFAULT 0.000,
  `energia_canal_1_kwh` decimal(12,3) DEFAULT NULL,
  `energia_canal_2_kwh` decimal(12,3) DEFAULT NULL,
  `energia_canal_3_kwh` decimal(12,3) DEFAULT NULL,
  `voltaje_canal_1` decimal(6,2) DEFAULT NULL,
  `voltaje_canal_2` decimal(6,2) DEFAULT NULL,
  `voltaje_canal_3` decimal(6,2) DEFAULT NULL,
  `voltaje_promedio` decimal(6,2) DEFAULT NULL,
  `corriente_canal_1` decimal(8,3) DEFAULT NULL,
  `corriente_canal_2` decimal(8,3) DEFAULT NULL,
  `corriente_canal_3` decimal(8,3) DEFAULT NULL,
  `corriente_neutro` decimal(8,3) DEFAULT NULL,
  `pf_canal_1` decimal(4,3) DEFAULT NULL,
  `pf_canal_2` decimal(4,3) DEFAULT NULL,
  `pf_canal_3` decimal(4,3) DEFAULT NULL,
  `online` tinyint(1) NOT NULL DEFAULT 1,
  `wifi_conectado` tinyint(1) NOT NULL DEFAULT 1,
  `wifi_rssi` int(11) DEFAULT NULL,
  `cloud_conectado` tinyint(1) NOT NULL DEFAULT 1,
  `uptime_segundos` int(11) DEFAULT NULL,
  `canal_1_valido` tinyint(1) NOT NULL DEFAULT 1,
  `canal_2_valido` tinyint(1) NOT NULL DEFAULT 1,
  `canal_3_valido` tinyint(1) NOT NULL DEFAULT 1,
  `datos_raw` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`datos_raw`)),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `metricas_diarias`
--

CREATE TABLE `metricas_diarias` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `dispositivo_id` bigint(20) UNSIGNED NOT NULL,
  `fecha` date NOT NULL,
  `energia_generada_kwh` decimal(10,3) DEFAULT NULL,
  `energia_consumida_kwh` decimal(10,3) DEFAULT NULL,
  `energia_vertida_kwh` decimal(10,3) DEFAULT NULL,
  `energia_importada_kwh` decimal(10,3) DEFAULT NULL,
  `potencia_max_w` decimal(10,2) DEFAULT NULL,
  `hora_potencia_max` timestamp NULL DEFAULT NULL,
  `potencia_min_w` decimal(10,2) DEFAULT NULL,
  `hora_potencia_min` timestamp NULL DEFAULT NULL,
  `potencia_promedio_w` decimal(10,2) DEFAULT NULL,
  `voltaje_max` decimal(6,2) DEFAULT NULL,
  `voltaje_min` decimal(6,2) DEFAULT NULL,
  `voltaje_promedio` decimal(6,2) DEFAULT NULL,
  `pf_promedio` decimal(4,3) DEFAULT NULL,
  `pf_min` decimal(4,3) DEFAULT NULL,
  `minutos_online` int(11) NOT NULL DEFAULT 0,
  `minutos_offline` int(11) NOT NULL DEFAULT 0,
  `disponibilidad_porcentaje` decimal(5,2) DEFAULT NULL,
  `numero_lecturas` int(11) NOT NULL DEFAULT 0,
  `numero_alertas` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `migrations`
--

CREATE TABLE `migrations` (
  `id` int(10) UNSIGNED NOT NULL,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `naves`
--

CREATE TABLE `naves` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `ubicacion` varchar(255) DEFAULT NULL,
  `codigo` varchar(255) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `activa` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sessions`
--

CREATE TABLE `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `last_activity` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `two_factor_secret` text DEFAULT NULL,
  `two_factor_recovery_codes` text DEFAULT NULL,
  `two_factor_confirmed_at` timestamp NULL DEFAULT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `alertas`
--
ALTER TABLE `alertas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `alertas_dispositivo_id_resuelta_index` (`dispositivo_id`,`resuelta`),
  ADD KEY `alertas_fecha_alerta_index` (`fecha_alerta`);

--
-- Indices de la tabla `cache`
--
ALTER TABLE `cache`
  ADD PRIMARY KEY (`key`);

--
-- Indices de la tabla `cache_locks`
--
ALTER TABLE `cache_locks`
  ADD PRIMARY KEY (`key`);

--
-- Indices de la tabla `calculos`
--
ALTER TABLE `calculos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `calculos_nave_id_fecha_calculo_index` (`nave_id`,`fecha_calculo`),
  ADD KEY `calculos_fecha_calculo_index` (`fecha_calculo`);

--
-- Indices de la tabla `dispositivos`
--
ALTER TABLE `dispositivos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `dispositivos_device_id_unique` (`device_id`),
  ADD KEY `dispositivos_nave_id_tipo_index` (`nave_id`,`tipo`);

--
-- Indices de la tabla `failed_jobs`
--
ALTER TABLE `failed_jobs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`);

--
-- Indices de la tabla `jobs`
--
ALTER TABLE `jobs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `jobs_queue_index` (`queue`);

--
-- Indices de la tabla `job_batches`
--
ALTER TABLE `job_batches`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `lecturas`
--
ALTER TABLE `lecturas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `lecturas_dispositivo_id_fecha_lectura_index` (`dispositivo_id`,`fecha_lectura`);

--
-- Indices de la tabla `metricas_diarias`
--
ALTER TABLE `metricas_diarias`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `metricas_diarias_dispositivo_id_fecha_unique` (`dispositivo_id`,`fecha`),
  ADD KEY `metricas_diarias_fecha_index` (`fecha`);

--
-- Indices de la tabla `migrations`
--
ALTER TABLE `migrations`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `naves`
--
ALTER TABLE `naves`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `naves_codigo_unique` (`codigo`);

--
-- Indices de la tabla `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`email`);

--
-- Indices de la tabla `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sessions_user_id_index` (`user_id`),
  ADD KEY `sessions_last_activity_index` (`last_activity`);

--
-- Indices de la tabla `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_email_unique` (`email`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `alertas`
--
ALTER TABLE `alertas`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `calculos`
--
ALTER TABLE `calculos`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `dispositivos`
--
ALTER TABLE `dispositivos`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `failed_jobs`
--
ALTER TABLE `failed_jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `jobs`
--
ALTER TABLE `jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `lecturas`
--
ALTER TABLE `lecturas`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `metricas_diarias`
--
ALTER TABLE `metricas_diarias`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `migrations`
--
ALTER TABLE `migrations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `naves`
--
ALTER TABLE `naves`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `alertas`
--
ALTER TABLE `alertas`
  ADD CONSTRAINT `alertas_dispositivo_id_foreign` FOREIGN KEY (`dispositivo_id`) REFERENCES `dispositivos` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `calculos`
--
ALTER TABLE `calculos`
  ADD CONSTRAINT `calculos_nave_id_foreign` FOREIGN KEY (`nave_id`) REFERENCES `naves` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `dispositivos`
--
ALTER TABLE `dispositivos`
  ADD CONSTRAINT `dispositivos_nave_id_foreign` FOREIGN KEY (`nave_id`) REFERENCES `naves` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `lecturas`
--
ALTER TABLE `lecturas`
  ADD CONSTRAINT `lecturas_dispositivo_id_foreign` FOREIGN KEY (`dispositivo_id`) REFERENCES `dispositivos` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `metricas_diarias`
--
ALTER TABLE `metricas_diarias`
  ADD CONSTRAINT `metricas_diarias_dispositivo_id_foreign` FOREIGN KEY (`dispositivo_id`) REFERENCES `dispositivos` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
