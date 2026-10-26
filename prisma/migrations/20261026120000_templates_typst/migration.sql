-- Additive only: legacy keeps reading `body_content`; the new app renders `typst_source`.
-- AlterTable
ALTER TABLE `templates`
    ADD COLUMN `typst_source` LONGTEXT NULL,
    ADD COLUMN `intermediano_company_id` BIGINT UNSIGNED NULL,
    ADD COLUMN `contract_type` VARCHAR(50) NULL,
    ADD COLUMN `deleted_at` TIMESTAMP(0) NULL;

-- CreateIndex
CREATE INDEX `templates_intermediano_company_id_foreign` ON `templates`(`intermediano_company_id`);

-- AddForeignKey
ALTER TABLE `templates` ADD CONSTRAINT `templates_intermediano_company_id_foreign` FOREIGN KEY (`intermediano_company_id`) REFERENCES `intermediano_companies`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;
