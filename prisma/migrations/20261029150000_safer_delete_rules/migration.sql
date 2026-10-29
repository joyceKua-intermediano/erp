-- Stop hard deletes from silently wiping contracts and quotations. The app only soft-deletes (deleted_at), so normal
-- behaviour is unchanged; a manual DELETE of a referenced row now fails instead of cascading.
-- Each key is dropped and re-added under the same name with only its ON DELETE rule changed.

-- DropForeignKey
ALTER TABLE `contracts` DROP FOREIGN KEY `contracts_admin_signed_by_foreign`;
ALTER TABLE `contracts` DROP FOREIGN KEY `contracts_company_id_foreign`;
ALTER TABLE `contracts` DROP FOREIGN KEY `contracts_employee_id_foreign`;
ALTER TABLE `contracts` DROP FOREIGN KEY `contracts_partner_id_foreign`;
ALTER TABLE `contracts` DROP FOREIGN KEY `contracts_quotation_id_foreign`;
ALTER TABLE `contracts` DROP FOREIGN KEY `fk_intermediano_company`;
ALTER TABLE `quotations` DROP FOREIGN KEY `quotations_company_id_foreign`;
ALTER TABLE `quotations` DROP FOREIGN KEY `quotations_consultant_id_foreign`;
ALTER TABLE `quotations` DROP FOREIGN KEY `quotations_country_id_foreign`;

-- AddForeignKey
-- Removing the admin who signed keeps the contract and only clears who signed it.
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_admin_signed_by_foreign` FOREIGN KEY (`admin_signed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_partner_id_foreign` FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_quotation_id_foreign` FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE `contracts` ADD CONSTRAINT `fk_intermediano_company` FOREIGN KEY (`intermediano_company_id`) REFERENCES `intermediano_companies`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_consultant_id_foreign` FOREIGN KEY (`consultant_id`) REFERENCES `consultants`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;
