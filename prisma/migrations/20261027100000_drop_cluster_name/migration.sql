-- Replace Filament `cluster_name` strings with real FKs.
--
-- Preflight (run on a production snapshot before migrating):
--   SELECT
--     `keys`.`cluster_name`,
--     REPLACE(REPLACE(`keys`.`cluster_name`, 'PartnerContract', 'Intermediano'), 'Partner', 'Intermediano') AS `cluster_key`,
--     `ic`.`id` AS `matched_company_id`,
--     `ic`.`name` AS `matched_company`
--   FROM (
--     SELECT DISTINCT `cluster_name` FROM `quotations` WHERE `cluster_name` IS NOT NULL
--     UNION SELECT DISTINCT `cluster_name` FROM `contracts` WHERE `cluster_name` IS NOT NULL
--     UNION SELECT DISTINCT `cluster_name` FROM `invoices` WHERE `cluster_name` IS NOT NULL
--   ) AS `keys`
--   LEFT JOIN `intermediano_companies` AS `ic`
--     ON LOWER(REPLACE(REPLACE(REPLACE(`ic`.`name`, ' ', ''), '.', ''), ',', ''))
--      = LOWER(REPLACE(REPLACE(`keys`.`cluster_name`, 'PartnerContract', 'Intermediano'), 'Partner', 'Intermediano'));
-- Fix unmatched entity names or countries before running this. One known local issue: the Mexico entity's country is set to Colombia.

-- AlterTable
ALTER TABLE `quotations`
    ADD COLUMN `intermediano_company_id` BIGINT UNSIGNED NULL,
    ADD COLUMN `is_partner` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `partner_id` BIGINT UNSIGNED NULL;

-- AlterTable
ALTER TABLE `invoices`
    ADD COLUMN `intermediano_company_id` BIGINT UNSIGNED NULL;

-- Distinct Filament keys, with Partner / PartnerContract prefixes rewritten to Intermediano.
-- Match the app tables' collation so LOWER()/REPLACE() joins don't mix utf8mb4_0900_ai_ci with unicode_ci.
CREATE TABLE `_legacy_clusters` (
    `cluster_key` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `intermediano_company_id` BIGINT UNSIGNED NULL,
    PRIMARY KEY (`cluster_key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO `_legacy_clusters` (`cluster_key`)
SELECT REPLACE(REPLACE(`cluster_name`, 'PartnerContract', 'Intermediano'), 'Partner', 'Intermediano')
FROM `quotations`
WHERE `cluster_name` IS NOT NULL AND `cluster_name` != '';

INSERT IGNORE INTO `_legacy_clusters` (`cluster_key`)
SELECT REPLACE(REPLACE(`cluster_name`, 'PartnerContract', 'Intermediano'), 'Partner', 'Intermediano')
FROM `contracts`
WHERE `cluster_name` IS NOT NULL AND `cluster_name` != '';

INSERT IGNORE INTO `_legacy_clusters` (`cluster_key`)
SELECT REPLACE(REPLACE(`cluster_name`, 'PartnerContract', 'Intermediano'), 'Partner', 'Intermediano')
FROM `invoices`
WHERE `cluster_name` IS NOT NULL AND `cluster_name` != '';

DELETE FROM `_legacy_clusters` WHERE `cluster_key` = '';

-- 1. Match "Intermediano do Brasil Ltda" to IntermedianoDoBrasilLtda (spaces, dots and commas stripped).
UPDATE `_legacy_clusters` AS `k`
INNER JOIN `intermediano_companies` AS `ic`
    ON LOWER(REPLACE(REPLACE(REPLACE(`ic`.`name`, ' ', ''), '.', ''), ',', '')) COLLATE utf8mb4_unicode_ci
     = LOWER(`k`.`cluster_key`) COLLATE utf8mb4_unicode_ci
SET `k`.`intermediano_company_id` = `ic`.`id`
WHERE `k`.`intermediano_company_id` IS NULL;

-- 2. Country fallback, only when that country has exactly one Intermediano entity.
--    Brasil / Global Services are omitted because Brazil has two entities.
CREATE TABLE `_legacy_cluster_countries` (
    `cluster_key` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    `country_name` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
    PRIMARY KEY (`cluster_key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `_legacy_cluster_countries` (`cluster_key`, `country_name`) VALUES
    ('IntermedianoCanada', 'Canada'),
    ('IntermedianoChileSPA', 'Chile'),
    ('IntermedianoColombiaSAS', 'Colombia'),
    ('IntermedianoCostaRica', 'Costa Rica'),
    ('IntermedianoEcuadorSAS', 'Ecuador'),
    ('IntermedianoHongkong', 'Hong Kong'),
    ('IntermedianoMexicoSC', 'Mexico'),
    ('IntermedianoPeruSAC', 'Peru'),
    ('IntermedianoUruguay', 'Uruguay');

UPDATE `_legacy_clusters` AS `k`
INNER JOIN `_legacy_cluster_countries` AS `map` ON `map`.`cluster_key` = `k`.`cluster_key`
INNER JOIN `countries` AS `c`
    ON LOWER(REPLACE(`c`.`name`, ' ', '')) COLLATE utf8mb4_unicode_ci
     = LOWER(REPLACE(`map`.`country_name`, ' ', '')) COLLATE utf8mb4_unicode_ci
INNER JOIN (
    SELECT `country_id`, MIN(`id`) AS `id`
    FROM `intermediano_companies`
    GROUP BY `country_id`
    HAVING COUNT(*) = 1
) AS `only` ON `only`.`country_id` = `c`.`id`
SET `k`.`intermediano_company_id` = `only`.`id`
WHERE `k`.`intermediano_company_id` IS NULL;

-- Backfill quotations.
UPDATE `quotations` AS `q`
INNER JOIN `_legacy_clusters` AS `k`
    ON `k`.`cluster_key` = REPLACE(REPLACE(`q`.`cluster_name`, 'PartnerContract', 'Intermediano'), 'Partner', 'Intermediano') COLLATE utf8mb4_unicode_ci
SET `q`.`intermediano_company_id` = `k`.`intermediano_company_id`,
    `q`.`is_partner` = (`q`.`cluster_name` LIKE 'Partner%')
WHERE `k`.`intermediano_company_id` IS NOT NULL;

-- Backfill invoices.
UPDATE `invoices` AS `i`
INNER JOIN `_legacy_clusters` AS `k`
    ON `k`.`cluster_key` = REPLACE(REPLACE(`i`.`cluster_name`, 'PartnerContract', 'Intermediano'), 'Partner', 'Intermediano') COLLATE utf8mb4_unicode_ci
SET `i`.`intermediano_company_id` = `k`.`intermediano_company_id`
WHERE `k`.`intermediano_company_id` IS NOT NULL;

-- Backfill contracts that were only tagged by cluster_name.
UPDATE `contracts` AS `c`
INNER JOIN `_legacy_clusters` AS `k`
    ON `k`.`cluster_key` = REPLACE(REPLACE(`c`.`cluster_name`, 'PartnerContract', 'Intermediano'), 'Partner', 'Intermediano') COLLATE utf8mb4_unicode_ci
SET `c`.`intermediano_company_id` = `k`.`intermediano_company_id`
WHERE `c`.`intermediano_company_id` IS NULL AND `k`.`intermediano_company_id` IS NOT NULL;

-- Partner on a quotation is known only when exactly one partner contract points at it.
UPDATE `quotations` AS `q`
INNER JOIN (
    SELECT `quotation_id`, MIN(`partner_id`) AS `partner_id`
    FROM `contracts`
    WHERE `quotation_id` IS NOT NULL AND `partner_id` IS NOT NULL
    GROUP BY `quotation_id`
    HAVING COUNT(DISTINCT `partner_id`) = 1
) AS `linked` ON `linked`.`quotation_id` = `q`.`id`
SET `q`.`partner_id` = `linked`.`partner_id`;

-- Safety guard: fails (and keeps cluster_name) if any quotation or invoice did not resolve.
ALTER TABLE `quotations` MODIFY `intermediano_company_id` BIGINT UNSIGNED NOT NULL;
ALTER TABLE `invoices` MODIFY `intermediano_company_id` BIGINT UNSIGNED NOT NULL;

-- AlterTable
ALTER TABLE `quotations` DROP COLUMN `cluster_name`;
ALTER TABLE `invoices` DROP COLUMN `cluster_name`;
ALTER TABLE `contracts` DROP COLUMN `cluster_name`;

-- CreateIndex
CREATE INDEX `quotations_intermediano_company_id_foreign` ON `quotations`(`intermediano_company_id`);
CREATE INDEX `quotations_partner_id_foreign` ON `quotations`(`partner_id`);
CREATE INDEX `invoices_intermediano_company_id_foreign` ON `invoices`(`intermediano_company_id`);

-- AddForeignKey
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_intermediano_company_id_foreign` FOREIGN KEY (`intermediano_company_id`) REFERENCES `intermediano_companies`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_partner_id_foreign` FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_intermediano_company_id_foreign` FOREIGN KEY (`intermediano_company_id`) REFERENCES `intermediano_companies`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

DROP TABLE `_legacy_cluster_countries`;
DROP TABLE `_legacy_clusters`;
