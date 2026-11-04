-- View/Manage per module becomes List, Show, Create, Edit and Delete, limited to the actions each module has.
-- Every role keeps the access it had: view grants list and show, manage grants create, edit and delete.
-- The old `*.view` / `*.manage` rows stay until a later cleanup migration, so a running older build keeps working.

INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`) VALUES
    ('quotations.list', NULL, NOW(), NOW()),
    ('quotations.show', NULL, NOW(), NOW()),
    ('quotations.create', NULL, NOW(), NOW()),
    ('quotations.edit', NULL, NOW(), NOW()),
    ('quotations.delete', NULL, NOW(), NOW()),
    ('employees.list', NULL, NOW(), NOW()),
    ('employees.show', NULL, NOW(), NOW()),
    ('employees.create', NULL, NOW(), NOW()),
    ('employees.edit', NULL, NOW(), NOW()),
    ('employees.delete', NULL, NOW(), NOW()),
    ('contracts.list', NULL, NOW(), NOW()),
    ('contracts.show', NULL, NOW(), NOW()),
    ('contracts.create', NULL, NOW(), NOW()),
    ('contracts.edit', NULL, NOW(), NOW()),
    ('contracts.delete', NULL, NOW(), NOW()),
    ('timesheets.list', NULL, NOW(), NOW()),
    ('timesheets.show', NULL, NOW(), NOW()),
    ('timesheets.edit', NULL, NOW(), NOW()),
    ('expenses.list', NULL, NOW(), NOW()),
    ('expenses.show', NULL, NOW(), NOW()),
    ('expenses.edit', NULL, NOW(), NOW()),
    ('payroll.list', NULL, NOW(), NOW()),
    ('payroll.show', NULL, NOW(), NOW()),
    ('payroll.create', NULL, NOW(), NOW()),
    ('payroll.edit', NULL, NOW(), NOW()),
    ('payroll.delete', NULL, NOW(), NOW()),
    ('leads.list', NULL, NOW(), NOW()),
    ('leads.show', NULL, NOW(), NOW()),
    ('leads.create', NULL, NOW(), NOW()),
    ('leads.edit', NULL, NOW(), NOW()),
    ('leads.delete', NULL, NOW(), NOW()),
    ('companies.list', NULL, NOW(), NOW()),
    ('companies.show', NULL, NOW(), NOW()),
    ('companies.create', NULL, NOW(), NOW()),
    ('companies.edit', NULL, NOW(), NOW()),
    ('companies.delete', NULL, NOW(), NOW()),
    ('contacts.list', NULL, NOW(), NOW()),
    ('contacts.create', NULL, NOW(), NOW()),
    ('contacts.edit', NULL, NOW(), NOW()),
    ('contacts.delete', NULL, NOW(), NOW()),
    ('partners.list', NULL, NOW(), NOW()),
    ('partners.show', NULL, NOW(), NOW()),
    ('partners.create', NULL, NOW(), NOW()),
    ('partners.edit', NULL, NOW(), NOW()),
    ('partners.delete', NULL, NOW(), NOW()),
    ('vacancies.list', NULL, NOW(), NOW()),
    ('vacancies.show', NULL, NOW(), NOW()),
    ('vacancies.create', NULL, NOW(), NOW()),
    ('vacancies.edit', NULL, NOW(), NOW()),
    ('vacancies.delete', NULL, NOW(), NOW()),
    ('consultants.list', NULL, NOW(), NOW()),
    ('consultants.show', NULL, NOW(), NOW()),
    ('consultants.create', NULL, NOW(), NOW()),
    ('consultants.edit', NULL, NOW(), NOW()),
    ('consultants.delete', NULL, NOW(), NOW()),
    ('investments.list', NULL, NOW(), NOW()),
    ('investments.show', NULL, NOW(), NOW()),
    ('investments.create', NULL, NOW(), NOW()),
    ('investments.edit', NULL, NOW(), NOW()),
    ('investments.delete', NULL, NOW(), NOW()),
    ('users.list', NULL, NOW(), NOW()),
    ('users.create', NULL, NOW(), NOW()),
    ('users.edit', NULL, NOW(), NOW()),
    ('users.delete', NULL, NOW(), NOW()),
    ('settings.list', NULL, NOW(), NOW()),
    ('settings.edit', NULL, NOW(), NOW()),
    ('intermediano_companies.list', NULL, NOW(), NOW()),
    ('intermediano_companies.show', NULL, NOW(), NOW()),
    ('intermediano_companies.create', NULL, NOW(), NOW()),
    ('intermediano_companies.edit', NULL, NOW(), NOW()),
    ('intermediano_companies.delete', NULL, NOW(), NOW()),
    ('vacations.list', NULL, NOW(), NOW()),
    ('vacations.edit', NULL, NOW(), NOW()),
    ('payslips.list', NULL, NOW(), NOW()),
    ('payslips.show', NULL, NOW(), NOW()),
    ('payslips.create', NULL, NOW(), NOW()),
    ('payslips.delete', NULL, NOW(), NOW()),
    ('templates.list', NULL, NOW(), NOW()),
    ('templates.show', NULL, NOW(), NOW()),
    ('templates.create', NULL, NOW(), NOW()),
    ('templates.edit', NULL, NOW(), NOW()),
    ('templates.delete', NULL, NOW(), NOW()),
    ('holidays.list', NULL, NOW(), NOW()),
    ('holidays.create', NULL, NOW(), NOW()),
    ('holidays.edit', NULL, NOW(), NOW()),
    ('holidays.delete', NULL, NOW(), NOW()),
    ('portal_accounts.list', NULL, NOW(), NOW()),
    ('portal_accounts.create', NULL, NOW(), NOW()),
    ('portal_accounts.edit', NULL, NOW(), NOW()),
    ('portal_accounts.delete', NULL, NOW(), NOW())
ON DUPLICATE KEY UPDATE `updated_at` = `updated_at`;

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT `rp`.`role_id`, `np`.`id`
FROM `role_permissions` AS `rp`
INNER JOIN `permissions` AS `op` ON `op`.`id` = `rp`.`permission_id`
INNER JOIN (
    SELECT 'quotations.view' AS `old_name`, 'quotations.list' AS `new_name`
    UNION ALL SELECT 'quotations.view', 'quotations.show'
    UNION ALL SELECT 'quotations.manage', 'quotations.create'
    UNION ALL SELECT 'quotations.manage', 'quotations.edit'
    UNION ALL SELECT 'quotations.manage', 'quotations.delete'
    UNION ALL SELECT 'employees.view', 'employees.list'
    UNION ALL SELECT 'employees.view', 'employees.show'
    UNION ALL SELECT 'employees.manage', 'employees.create'
    UNION ALL SELECT 'employees.manage', 'employees.edit'
    UNION ALL SELECT 'employees.manage', 'employees.delete'
    UNION ALL SELECT 'contracts.view', 'contracts.list'
    UNION ALL SELECT 'contracts.view', 'contracts.show'
    UNION ALL SELECT 'contracts.manage', 'contracts.create'
    UNION ALL SELECT 'contracts.manage', 'contracts.edit'
    UNION ALL SELECT 'contracts.manage', 'contracts.delete'
    UNION ALL SELECT 'timesheets.view', 'timesheets.list'
    UNION ALL SELECT 'timesheets.view', 'timesheets.show'
    UNION ALL SELECT 'timesheets.manage', 'timesheets.edit'
    UNION ALL SELECT 'expenses.view', 'expenses.list'
    UNION ALL SELECT 'expenses.view', 'expenses.show'
    UNION ALL SELECT 'expenses.manage', 'expenses.edit'
    UNION ALL SELECT 'payroll.view', 'payroll.list'
    UNION ALL SELECT 'payroll.view', 'payroll.show'
    UNION ALL SELECT 'payroll.manage', 'payroll.create'
    UNION ALL SELECT 'payroll.manage', 'payroll.edit'
    UNION ALL SELECT 'payroll.manage', 'payroll.delete'
    UNION ALL SELECT 'leads.view', 'leads.list'
    UNION ALL SELECT 'leads.view', 'leads.show'
    UNION ALL SELECT 'leads.manage', 'leads.create'
    UNION ALL SELECT 'leads.manage', 'leads.edit'
    UNION ALL SELECT 'leads.manage', 'leads.delete'
    UNION ALL SELECT 'companies.view', 'companies.list'
    UNION ALL SELECT 'companies.view', 'companies.show'
    UNION ALL SELECT 'companies.manage', 'companies.create'
    UNION ALL SELECT 'companies.manage', 'companies.edit'
    UNION ALL SELECT 'companies.manage', 'companies.delete'
    UNION ALL SELECT 'contacts.view', 'contacts.list'
    UNION ALL SELECT 'contacts.manage', 'contacts.create'
    UNION ALL SELECT 'contacts.manage', 'contacts.edit'
    UNION ALL SELECT 'contacts.manage', 'contacts.delete'
    UNION ALL SELECT 'partners.view', 'partners.list'
    UNION ALL SELECT 'partners.view', 'partners.show'
    UNION ALL SELECT 'partners.manage', 'partners.create'
    UNION ALL SELECT 'partners.manage', 'partners.edit'
    UNION ALL SELECT 'partners.manage', 'partners.delete'
    UNION ALL SELECT 'vacancies.view', 'vacancies.list'
    UNION ALL SELECT 'vacancies.view', 'vacancies.show'
    UNION ALL SELECT 'vacancies.manage', 'vacancies.create'
    UNION ALL SELECT 'vacancies.manage', 'vacancies.edit'
    UNION ALL SELECT 'vacancies.manage', 'vacancies.delete'
    UNION ALL SELECT 'consultants.view', 'consultants.list'
    UNION ALL SELECT 'consultants.view', 'consultants.show'
    UNION ALL SELECT 'consultants.manage', 'consultants.create'
    UNION ALL SELECT 'consultants.manage', 'consultants.edit'
    UNION ALL SELECT 'consultants.manage', 'consultants.delete'
    UNION ALL SELECT 'investments.view', 'investments.list'
    UNION ALL SELECT 'investments.view', 'investments.show'
    UNION ALL SELECT 'investments.manage', 'investments.create'
    UNION ALL SELECT 'investments.manage', 'investments.edit'
    UNION ALL SELECT 'investments.manage', 'investments.delete'
    UNION ALL SELECT 'users.view', 'users.list'
    UNION ALL SELECT 'users.manage', 'users.create'
    UNION ALL SELECT 'users.manage', 'users.edit'
    UNION ALL SELECT 'users.manage', 'users.delete'
    UNION ALL SELECT 'settings.view', 'settings.list'
    UNION ALL SELECT 'settings.manage', 'settings.edit'
    UNION ALL SELECT 'intermediano_companies.view', 'intermediano_companies.list'
    UNION ALL SELECT 'intermediano_companies.view', 'intermediano_companies.show'
    UNION ALL SELECT 'intermediano_companies.manage', 'intermediano_companies.create'
    UNION ALL SELECT 'intermediano_companies.manage', 'intermediano_companies.edit'
    UNION ALL SELECT 'intermediano_companies.manage', 'intermediano_companies.delete'
    UNION ALL SELECT 'vacations.view', 'vacations.list'
    UNION ALL SELECT 'vacations.manage', 'vacations.edit'
    UNION ALL SELECT 'payslips.view', 'payslips.list'
    UNION ALL SELECT 'payslips.view', 'payslips.show'
    UNION ALL SELECT 'payslips.manage', 'payslips.create'
    UNION ALL SELECT 'payslips.manage', 'payslips.delete'
    UNION ALL SELECT 'templates.view', 'templates.list'
    UNION ALL SELECT 'templates.view', 'templates.show'
    UNION ALL SELECT 'templates.manage', 'templates.create'
    UNION ALL SELECT 'templates.manage', 'templates.edit'
    UNION ALL SELECT 'templates.manage', 'templates.delete'
    UNION ALL SELECT 'holidays.view', 'holidays.list'
    UNION ALL SELECT 'holidays.manage', 'holidays.create'
    UNION ALL SELECT 'holidays.manage', 'holidays.edit'
    UNION ALL SELECT 'holidays.manage', 'holidays.delete'
    UNION ALL SELECT 'portal_accounts.view', 'portal_accounts.list'
    UNION ALL SELECT 'portal_accounts.manage', 'portal_accounts.create'
    UNION ALL SELECT 'portal_accounts.manage', 'portal_accounts.edit'
    UNION ALL SELECT 'portal_accounts.manage', 'portal_accounts.delete'
) AS `m` ON `m`.`old_name` COLLATE utf8mb4_unicode_ci = `op`.`name` COLLATE utf8mb4_unicode_ci
INNER JOIN `permissions` AS `np` ON `np`.`name` COLLATE utf8mb4_unicode_ci = `m`.`new_name` COLLATE utf8mb4_unicode_ci;
