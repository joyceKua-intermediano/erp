-- Saved payroll breakdowns (additive and nullable; rows without one are still calculated live).

-- AlterTable
ALTER TABLE `quotations` ADD COLUMN `breakdown_snapshot` LONGTEXT NULL;
