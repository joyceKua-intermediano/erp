-- Vacations, payslips, contract templates, holidays and portal accounts get their own permissions.
-- Until now they were gated by employees, payroll, settings and users; every role keeps the access it had.

-- Ids follow lib/permissions.ts, where these resources are appended after the original sixteen.
INSERT INTO `permissions` (`id`, `name`, `description`, `created_at`, `updated_at`) VALUES
    (33, 'vacations.view', NULL, NOW(), NOW()),
    (34, 'vacations.manage', NULL, NOW(), NOW()),
    (35, 'payslips.view', NULL, NOW(), NOW()),
    (36, 'payslips.manage', NULL, NOW(), NOW()),
    (37, 'templates.view', NULL, NOW(), NOW()),
    (38, 'templates.manage', NULL, NOW(), NOW()),
    (39, 'holidays.view', NULL, NOW(), NOW()),
    (40, 'holidays.manage', NULL, NOW(), NOW()),
    (41, 'portal_accounts.view', NULL, NOW(), NOW()),
    (42, 'portal_accounts.manage', NULL, NOW(), NOW())
ON DUPLICATE KEY UPDATE `updated_at` = `updated_at`;

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT `rp`.`role_id`, `np`.`id`
FROM `role_permissions` AS `rp`
INNER JOIN `permissions` AS `op` ON `op`.`id` = `rp`.`permission_id`
INNER JOIN (
    SELECT 'employees.view' AS `old_name`, 'vacations.view' AS `new_name`
    UNION ALL SELECT 'employees.manage', 'vacations.manage'
    UNION ALL SELECT 'payroll.view', 'payslips.view'
    UNION ALL SELECT 'payroll.manage', 'payslips.manage'
    UNION ALL SELECT 'settings.view', 'templates.view'
    UNION ALL SELECT 'settings.manage', 'templates.manage'
    UNION ALL SELECT 'settings.view', 'holidays.view'
    UNION ALL SELECT 'settings.manage', 'holidays.manage'
    UNION ALL SELECT 'users.view', 'portal_accounts.view'
    UNION ALL SELECT 'users.manage', 'portal_accounts.manage'
) AS `m` ON `m`.`old_name` COLLATE utf8mb4_unicode_ci = `op`.`name` COLLATE utf8mb4_unicode_ci
INNER JOIN `permissions` AS `np` ON `np`.`name` COLLATE utf8mb4_unicode_ci = `m`.`new_name` COLLATE utf8mb4_unicode_ci;
