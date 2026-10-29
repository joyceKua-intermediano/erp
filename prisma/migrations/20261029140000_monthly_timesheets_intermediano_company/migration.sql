-- Timesheets remember the cluster they were submitted in, so moving an employee doesn't move their history.
-- Additive: the column is nullable and the app falls back to the employee's cluster where it's still null.

-- AlterTable
ALTER TABLE `monthly_timesheets` ADD COLUMN `intermediano_company_id` BIGINT UNSIGNED NULL;

-- Backfill from each employee's current cluster, the best record of where past timesheets belong.
UPDATE `monthly_timesheets` AS `t`
    INNER JOIN `employees` AS `e` ON `e`.`id` = `t`.`employee_id`
SET `t`.`intermediano_company_id` = `e`.`intermediano_company_id`
WHERE `t`.`intermediano_company_id` IS NULL;

-- CreateIndex
CREATE INDEX `monthly_timesheets_intermediano_company_id_foreign` ON `monthly_timesheets`(`intermediano_company_id`);

-- AddForeignKey
ALTER TABLE `monthly_timesheets` ADD CONSTRAINT `monthly_timesheets_intermediano_company_id_foreign` FOREIGN KEY (`intermediano_company_id`) REFERENCES `intermediano_companies`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;
