-- AlterTable
ALTER TABLE `employees` ADD COLUMN `intermediano_company_id` BIGINT UNSIGNED NULL;

-- Backfill from the legacy free-text `company` column; unmatched names stay NULL.
UPDATE `employees` AS `e`
    INNER JOIN `intermediano_companies` AS `ic` ON `ic`.`name` = TRIM(`e`.`company`)
SET `e`.`intermediano_company_id` = `ic`.`id`;

-- AlterTable
ALTER TABLE `employees` DROP COLUMN `company`;

-- CreateIndex
CREATE INDEX `employees_intermediano_company_id_foreign` ON `employees`(`intermediano_company_id`);

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_intermediano_company_id_foreign` FOREIGN KEY (`intermediano_company_id`) REFERENCES `intermediano_companies`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;
