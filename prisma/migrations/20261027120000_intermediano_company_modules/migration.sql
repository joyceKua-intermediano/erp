-- Which modules each Intermediano company (cluster) offers.
-- Legacy encoded this as one Filament resource folder per cluster; every existing company keeps the
-- six modules the sidebar shows today, then the legacy-only differences are applied.

-- CreateTable
CREATE TABLE `intermediano_company_modules` (
    `intermediano_company_id` BIGINT UNSIGNED NOT NULL,
    `module_key` VARCHAR(50) NOT NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`intermediano_company_id`, `module_key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `intermediano_company_modules` ADD CONSTRAINT `intermediano_company_modules_intermediano_company_id_foreign` FOREIGN KEY (`intermediano_company_id`) REFERENCES `intermediano_companies`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- Base modules for every company.
INSERT INTO `intermediano_company_modules` (`intermediano_company_id`, `module_key`, `created_at`, `updated_at`)
SELECT `ic`.`id`, `base`.`module_key`, NOW(), NOW()
FROM `intermediano_companies` AS `ic`
CROSS JOIN (
    SELECT 'quotations' AS `module_key`
    UNION ALL SELECT 'employees'
    UNION ALL SELECT 'contracts'
    UNION ALL SELECT 'timesheets'
    UNION ALL SELECT 'expenses'
    UNION ALL SELECT 'payroll'
) AS `base`;

-- Legacy differences, keyed by Filament cluster class. `is_enabled` = 0 removes a base module.
CREATE TABLE `_legacy_cluster_modules` (
    `cluster_key` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `country_name` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    `module_key` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `is_enabled` BOOLEAN NOT NULL,
    PRIMARY KEY (`cluster_key`, `module_key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `_legacy_cluster_modules` (`cluster_key`, `country_name`, `module_key`, `is_enabled`) VALUES
    ('IntermedianoCanada', 'Canada', 'partner', true),
    ('IntermedianoCostaRica', 'Costa Rica', 'partner', true),
    ('IntermedianoHongkong', 'Hong Kong', 'partner', true),
    ('IntermedianoUruguay', 'Uruguay', 'partner', true),
    ('IntermedianoCanada', 'Canada', 'payslips', true),
    ('IntermedianoDoBrasilLtda', NULL, 'payslips', true),
    ('IntermedianoGlobalServicesLtda', NULL, 'payslips', true),
    ('IntermedianoHongkong', 'Hong Kong', 'invoices', true),
    ('IntermedianoUruguay', 'Uruguay', 'msp_payroll', true),
    ('IntermedianoCostaRica', 'Costa Rica', 'timesheets', false),
    ('IntermedianoCostaRica', 'Costa Rica', 'expenses', false);

CREATE TABLE `_legacy_cluster_companies` (
    `cluster_key` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `country_name` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    `intermediano_company_id` BIGINT UNSIGNED NULL,
    PRIMARY KEY (`cluster_key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `_legacy_cluster_companies` (`cluster_key`, `country_name`)
SELECT `cluster_key`, MAX(`country_name`)
FROM `_legacy_cluster_modules`
GROUP BY `cluster_key`;

-- 1. Match "Intermediano do Brasil Ltda." to IntermedianoDoBrasilLtda (spaces, dots and commas stripped).
UPDATE `_legacy_cluster_companies` AS `k`
INNER JOIN `intermediano_companies` AS `ic`
    ON LOWER(REPLACE(REPLACE(REPLACE(`ic`.`name`, ' ', ''), '.', ''), ',', '')) COLLATE utf8mb4_unicode_ci
     = LOWER(`k`.`cluster_key`) COLLATE utf8mb4_unicode_ci
SET `k`.`intermediano_company_id` = `ic`.`id`
WHERE `ic`.`deleted_at` IS NULL;

-- 2. Country fallback, only when that country has exactly one active Intermediano entity.
UPDATE `_legacy_cluster_companies` AS `k`
INNER JOIN `countries` AS `c`
    ON LOWER(REPLACE(`c`.`name`, ' ', '')) COLLATE utf8mb4_unicode_ci
     = LOWER(REPLACE(`k`.`country_name`, ' ', '')) COLLATE utf8mb4_unicode_ci
INNER JOIN (
    SELECT `country_id`, MIN(`id`) AS `id`
    FROM `intermediano_companies`
    WHERE `deleted_at` IS NULL
    GROUP BY `country_id`
    HAVING COUNT(*) = 1
) AS `only` ON `only`.`country_id` = `c`.`id`
SET `k`.`intermediano_company_id` = `only`.`id`
WHERE `k`.`intermediano_company_id` IS NULL AND `k`.`country_name` IS NOT NULL;

INSERT IGNORE INTO `intermediano_company_modules` (`intermediano_company_id`, `module_key`, `created_at`, `updated_at`)
SELECT `k`.`intermediano_company_id`, `m`.`module_key`, NOW(), NOW()
FROM `_legacy_cluster_modules` AS `m`
INNER JOIN `_legacy_cluster_companies` AS `k` ON `k`.`cluster_key` = `m`.`cluster_key`
WHERE `m`.`is_enabled` = true AND `k`.`intermediano_company_id` IS NOT NULL;

DELETE `icm`
FROM `intermediano_company_modules` AS `icm`
INNER JOIN `_legacy_cluster_companies` AS `k` ON `k`.`intermediano_company_id` = `icm`.`intermediano_company_id`
INNER JOIN `_legacy_cluster_modules` AS `m`
    ON `m`.`cluster_key` = `k`.`cluster_key`
   AND `m`.`module_key` = `icm`.`module_key` COLLATE utf8mb4_unicode_ci
WHERE `m`.`is_enabled` = false;

DROP TABLE `_legacy_cluster_companies`;
DROP TABLE `_legacy_cluster_modules`;
