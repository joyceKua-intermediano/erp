-- Scope roles to specific Intermediano companies (clusters).
-- Existing roles default to all_clusters = true, so current access is unchanged.

-- AlterTable
ALTER TABLE `roles` ADD COLUMN `all_clusters` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `role_clusters` (
    `role_id` BIGINT UNSIGNED NOT NULL,
    `intermediano_company_id` BIGINT UNSIGNED NOT NULL,

    INDEX `role_clusters_intermediano_company_id_foreign`(`intermediano_company_id`),
    PRIMARY KEY (`role_id`, `intermediano_company_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `role_clusters` ADD CONSTRAINT `role_clusters_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `role_clusters` ADD CONSTRAINT `role_clusters_intermediano_company_id_foreign` FOREIGN KEY (`intermediano_company_id`) REFERENCES `intermediano_companies`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
