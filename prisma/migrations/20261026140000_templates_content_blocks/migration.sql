-- Additive only: block-editor templates are stored as JSON; legacy keeps reading `body_content`.
-- AlterTable
ALTER TABLE `templates` ADD COLUMN `content_blocks` LONGTEXT NULL;
