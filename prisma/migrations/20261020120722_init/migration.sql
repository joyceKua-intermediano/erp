-- CreateTable
CREATE TABLE `banking_details` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `document_id` BIGINT UNSIGNED NOT NULL,
    `bank_name` VARCHAR(255) NULL,
    `branch_name` VARCHAR(255) NULL,
    `bank_code` VARCHAR(255) NULL,
    `account_number` VARCHAR(255) NULL,
    `account_type` VARCHAR(255) NULL,
    `bank_account_currency` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `banking_details_document_id_foreign`(`document_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `banks` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `country_id` BIGINT UNSIGNED NOT NULL,
    `bank_name` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,
    `deleted_at` TIMESTAMP(0) NULL,

    INDEX `banks_country_id_foreign`(`country_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cache` (
    `key` VARCHAR(255) NOT NULL,
    `value` MEDIUMTEXT NOT NULL,
    `expiration` INTEGER NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cache_locks` (
    `key` VARCHAR(255) NOT NULL,
    `owner` VARCHAR(255) NOT NULL,
    `expiration` INTEGER NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `companies` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NULL,
    `name` VARCHAR(255) NOT NULL,
    `website` VARCHAR(255) NULL,
    `vat` VARCHAR(255) NULL,
    `tax_id` VARCHAR(255) NULL,
    `country` VARCHAR(255) NULL,
    `state` VARCHAR(255) NULL,
    `city` VARCHAR(255) NULL,
    `postal_code` VARCHAR(255) NULL,
    `address` VARCHAR(255) NULL,
    `industry_field_id` BIGINT UNSIGNED NULL,
    `number_of_employees` INTEGER NULL,
    `is_customer` BOOLEAN NOT NULL DEFAULT false,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,
    `deleted_at` TIMESTAMP(0) NULL,

    INDEX `companies_industry_field_id_foreign`(`industry_field_id`),
    INDEX `companies_user_id_foreign`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `consultants` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `country_id` BIGINT UNSIGNED NOT NULL,
    `date_of_birth` DATE NULL,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NULL,
    `mobile_number` VARCHAR(255) NULL,
    `address` TEXT NULL,
    `employeer` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,
    `deleted_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `consultants_name_unique`(`name`),
    INDEX `consultants_country_id_foreign`(`country_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contacts` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NULL,
    `company_id` BIGINT UNSIGNED NULL,
    `contact_name` VARCHAR(255) NOT NULL,
    `surname` VARCHAR(255) NULL,
    `email` VARCHAR(255) NULL,
    `linkedin` VARCHAR(255) NULL,
    `mobile` VARCHAR(255) NULL,
    `phone` VARCHAR(255) NULL,
    `position` VARCHAR(255) NULL,
    `department` VARCHAR(255) NULL,
    `is_main_contact` BOOLEAN NOT NULL DEFAULT false,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,
    `deleted_at` TIMESTAMP(0) NULL,

    INDEX `contacts_company_id_foreign`(`company_id`),
    INDEX `contacts_user_id_foreign`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contracts` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `template_id` BIGINT UNSIGNED NULL,
    `company_id` BIGINT UNSIGNED NULL,
    `partner_id` BIGINT UNSIGNED NULL,
    `intermediano_company_id` BIGINT UNSIGNED NULL,
    `employee_id` BIGINT UNSIGNED NOT NULL,
    `quotation_id` BIGINT UNSIGNED NULL,
    `country_id` BIGINT UNSIGNED NULL,
    `country_work` VARCHAR(255) NULL,
    `job_title` VARCHAR(255) NULL,
    `translated_position` VARCHAR(255) NULL,
    `start_date` DATE NULL,
    `end_date` DATE NULL,
    `gross_salary` VARCHAR(255) NULL,
    `contract_type` VARCHAR(255) NULL,
    `contract_version` VARCHAR(50) NULL,
    `job_description` TEXT NULL,
    `translated_job_description` TEXT NULL,
    `cluster_name` VARCHAR(255) NULL,
    `is_sent_to_employee` BOOLEAN NULL DEFAULT false,
    `signature` VARCHAR(255) NULL DEFAULT 'Pending Signature',
    `signed_contract` DATETIME(0) NULL,
    `admin_signature` VARCHAR(255) NULL DEFAULT 'Pending Signature',
    `admin_signed_contract` DATETIME(0) NULL,
    `admin_signed_by` BIGINT UNSIGNED NULL,
    `is_integral` BOOLEAN NULL DEFAULT false,
    `deleted_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `contracts_admin_signed_by_foreign`(`admin_signed_by`),
    INDEX `contracts_company_id_foreign`(`company_id`),
    INDEX `contracts_country_id_foreign`(`country_id`),
    INDEX `contracts_employee_id_foreign`(`employee_id`),
    INDEX `contracts_partner_id_foreign`(`partner_id`),
    INDEX `contracts_quotation_id_foreign`(`quotation_id`),
    INDEX `fk_intermediano_company`(`intermediano_company_id`),
    INDEX `template_id`(`template_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `countries` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `income_tax_rate` DECIMAL(5, 2) NULL,
    `use_real_time_conversion` BOOLEAN NOT NULL DEFAULT false,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,
    `deleted_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `countries_name_unique`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `country_annual_setups` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `country_id` BIGINT UNSIGNED NOT NULL,
    `year` VARCHAR(255) NOT NULL,
    `uvt_amount` DECIMAL(15, 2) NULL,
    `capped_amount` DECIMAL(15, 2) NULL,
    `deleted_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `country_year_unique`(`country_id`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `currencies` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `country_id` BIGINT UNSIGNED NOT NULL,
    `currency_name` VARCHAR(255) NULL,
    `currency_quota` DECIMAL(10, 2) NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,
    `deleted_at` TIMESTAMP(0) NULL,
    `converted_currency_quota` DECIMAL(10, 2) NULL DEFAULT 0.00,

    INDEX `currencies_country_id_foreign`(`country_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` BIGINT UNSIGNED NULL,
    `partner_id` BIGINT UNSIGNED NULL,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `deleted_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `customers_email_unique`(`email`),
    INDEX `customers_company_id_foreign`(`company_id`),
    INDEX `fk_partner_id`(`partner_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dependents` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `personal_information_id` BIGINT UNSIGNED NOT NULL,
    `full_name` VARCHAR(255) NULL,
    `relationship` VARCHAR(255) NULL,
    `date_of_birth` DATE NULL,
    `tax_id` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `dependents_personal_information_id_foreign`(`personal_information_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documents` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `employee_id` BIGINT UNSIGNED NOT NULL,
    `personal_id` VARCHAR(255) NULL,
    `organism` VARCHAR(255) NULL,
    `tax_id` VARCHAR(255) NULL,
    `expiration` DATE NULL,
    `other` VARCHAR(255) NULL,
    `is_driver_license` BOOLEAN NOT NULL DEFAULT false,
    `has_insurance` BOOLEAN NOT NULL DEFAULT false,
    `category` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `documents_employee_id_foreign`(`employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emergency_contacts` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `personal_information_id` BIGINT UNSIGNED NOT NULL,
    `emergency_contact_name` VARCHAR(255) NULL,
    `relationship` VARCHAR(255) NULL,
    `mobile_number` VARCHAR(255) NULL,
    `email` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `emergency_contacts_personal_information_id_foreign`(`personal_information_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_expenses` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `employee_id` BIGINT UNSIGNED NOT NULL,
    `company_id` BIGINT UNSIGNED NOT NULL,
    `expenses` LONGTEXT NOT NULL,
    `status` VARCHAR(255) NOT NULL DEFAULT 'pending',
    `type` VARCHAR(255) NULL,
    `cost_center` VARCHAR(255) NULL,
    `currency_name` VARCHAR(255) NULL,
    `created_by` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `employee_expenses_company_id_foreign`(`company_id`),
    INDEX `employee_expenses_employee_id_foreign`(`employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_files` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `document_id` BIGINT UNSIGNED NOT NULL,
    `document_type` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(255) NOT NULL,
    `original_file_name` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `employee_files_document_id_foreign`(`document_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employees` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `consultant_id` BIGINT UNSIGNED NULL,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `company` VARCHAR(255) NOT NULL,
    `deleted_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `employees_email_unique`(`email`),
    INDEX `employees_consultant_id_foreign`(`consultant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `failed_jobs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(255) NOT NULL,
    `connection` TEXT NOT NULL,
    `queue` TEXT NOT NULL,
    `payload` LONGTEXT NOT NULL,
    `exception` LONGTEXT NOT NULL,
    `failed_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `failed_jobs_uuid_unique`(`uuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `holidays` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `country_id` BIGINT UNSIGNED NOT NULL,
    `year` YEAR NOT NULL,
    `holidays` LONGTEXT NOT NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,
    `deleted_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `holidays_country_id_year_unique`(`country_id`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `industry_fields` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NULL,
    `name` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,
    `deleted_at` TIMESTAMP(0) NULL,

    INDEX `industry_fields_user_id_foreign`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `intermediano_companies` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `contact_name` VARCHAR(255) NOT NULL,
    `mobile_number` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `address` VARCHAR(255) NOT NULL,
    `tax_id` VARCHAR(255) NOT NULL,
    `country_id` BIGINT UNSIGNED NOT NULL,
    `deleted_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `intermediano_companies_country_id_foreign`(`country_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `investments` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `bank_id` BIGINT UNSIGNED NOT NULL,
    `currency_id` BIGINT UNSIGNED NOT NULL,
    `capital` DECIMAL(13, 2) NOT NULL,
    `rate_type` VARCHAR(255) NOT NULL,
    `interest_rate` DECIMAL(10, 2) NOT NULL,
    `deposit_date` DATE NOT NULL,
    `withdrawal_period` SMALLINT NOT NULL,
    `year` SMALLINT NOT NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `investments_bank_id_foreign`(`bank_id`),
    INDEX `investments_currency_id_foreign`(`currency_id`),
    INDEX `investments_year_index`(`year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_details` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` BIGINT UNSIGNED NOT NULL,
    `contact_person` VARCHAR(255) NULL,
    `email` VARCHAR(255) NULL,
    `mobile_number` VARCHAR(255) NULL,
    `invoice_number` VARCHAR(255) NULL,
    `invoice_cycle` VARCHAR(255) NULL,
    `invoice_deadline` VARCHAR(255) NULL,
    `currency_payment` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `invoice_details_company_id_foreign`(`company_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `employee_id` BIGINT UNSIGNED NOT NULL,
    `company_id` BIGINT UNSIGNED NOT NULL,
    `invoice_date` DATE NOT NULL,
    `invoice_items` LONGTEXT NOT NULL,
    `cluster_name` VARCHAR(255) NOT NULL,
    `deleted_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `invoices_company_id_foreign`(`company_id`),
    INDEX `invoices_employee_id_foreign`(`employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_batches` (
    `id` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `total_jobs` INTEGER NOT NULL,
    `pending_jobs` INTEGER NOT NULL,
    `failed_jobs` INTEGER NOT NULL,
    `failed_job_ids` LONGTEXT NOT NULL,
    `options` MEDIUMTEXT NULL,
    `cancelled_at` INTEGER NULL,
    `created_at` INTEGER NOT NULL,
    `finished_at` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jobs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `queue` VARCHAR(255) NOT NULL,
    `payload` LONGTEXT NOT NULL,
    `attempts` TINYINT UNSIGNED NOT NULL,
    `reserved_at` INTEGER UNSIGNED NULL,
    `available_at` INTEGER UNSIGNED NOT NULL,
    `created_at` INTEGER UNSIGNED NOT NULL,

    INDEX `jobs_queue_index`(`queue`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leads` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NULL,
    `opportunity_owner` BIGINT UNSIGNED NULL,
    `company_id` BIGINT UNSIGNED NULL,
    `lead` VARCHAR(255) NOT NULL,
    `opportunity_name` VARCHAR(255) NULL,
    `country` VARCHAR(255) NULL,
    `opportunity_type` VARCHAR(255) NULL,
    `a2t` BOOLEAN NULL,
    `lead_source` VARCHAR(255) NULL,
    `lead_status` VARCHAR(255) NULL,
    `close_reason` TEXT NULL,
    `number_of_contractors` INTEGER NULL,
    `estimated_tender_value` DECIMAL(10, 2) NULL,
    `estimated_close_date` DATE NULL,
    `contact_id` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,
    `deleted_at` TIMESTAMP(0) NULL,

    INDEX `leads_company_id_foreign`(`company_id`),
    INDEX `leads_contact_id_foreign`(`contact_id`),
    INDEX `leads_opportunity_owner_foreign`(`opportunity_owner`),
    INDEX `leads_user_id_foreign`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `migrations` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `migration` VARCHAR(255) NOT NULL,
    `batch` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `model_has_permissions` (
    `permission_id` BIGINT UNSIGNED NOT NULL,
    `model_type` VARCHAR(255) NOT NULL,
    `model_id` BIGINT UNSIGNED NOT NULL,

    INDEX `model_has_permissions_model_id_model_type_index`(`model_id`, `model_type`),
    PRIMARY KEY (`permission_id`, `model_id`, `model_type`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `model_has_roles` (
    `role_id` BIGINT UNSIGNED NOT NULL,
    `model_type` VARCHAR(255) NOT NULL,
    `model_id` BIGINT UNSIGNED NOT NULL,

    INDEX `model_has_roles_model_id_model_type_index`(`model_id`, `model_type`),
    PRIMARY KEY (`role_id`, `model_id`, `model_type`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monthly_timesheets` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `employee_id` BIGINT UNSIGNED NOT NULL,
    `company_id` BIGINT UNSIGNED NULL,
    `year` INTEGER NOT NULL,
    `month` INTEGER NOT NULL,
    `days` LONGTEXT NOT NULL,
    `total_hours` DECIMAL(8, 2) NOT NULL,
    `status` VARCHAR(255) NULL DEFAULT 'pending',
    `comment` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `monthly_timesheets_company_id_foreign`(`company_id`),
    UNIQUE INDEX `monthly_timesheets_employee_id_year_month_unique`(`employee_id`, `year`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `msp_payroll_company` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `msp_payroll_id` BIGINT UNSIGNED NOT NULL,
    `company_id` BIGINT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `company_id`(`company_id`),
    INDEX `msp_payroll_id`(`msp_payroll_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `msp_payrolls` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `fee` DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    `bank_fee` DECIMAL(15, 4) NOT NULL DEFAULT 0.0000,
    `data` LONGTEXT NULL,
    `deleted_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `partners` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `country_id` BIGINT UNSIGNED NOT NULL,
    `partner_type` VARCHAR(255) NULL,
    `partner_name` VARCHAR(255) NULL,
    `contact_name` VARCHAR(255) NULL,
    `mobile_number` VARCHAR(255) NOT NULL,
    `tax_id` VARCHAR(255) NULL,
    `email` VARCHAR(255) NOT NULL,
    `address` TEXT NOT NULL,
    `deleted_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `password_reset_tokens` (
    `email` VARCHAR(255) NOT NULL,
    `token` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_provisions` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `quotation_id` BIGINT UNSIGNED NOT NULL,
    `provision_type_id` BIGINT UNSIGNED NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `fk_payment_provisions_provision_type`(`provision_type_id`),
    INDEX `fk_payment_provisions_quotation`(`quotation_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payroll_costs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `quotation_id` BIGINT UNSIGNED NOT NULL,
    `medical_insurance` DECIMAL(15, 6) NOT NULL DEFAULT 0.000000,
    `deleted_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,
    `meal` DECIMAL(15, 6) NULL DEFAULT 0.000000,
    `transportation` DECIMAL(15, 6) NULL DEFAULT 0.000000,
    `uf_month` DECIMAL(15, 6) NULL DEFAULT 0.000000,
    `eps` DECIMAL(15, 6) NULL DEFAULT 0.000000,
    `notice` DECIMAL(15, 6) NULL DEFAULT 0.000000,
    `unemployment` DECIMAL(15, 6) NULL DEFAULT 0.000000,
    `operational_costs` DECIMAL(15, 6) NULL DEFAULT 0.000000,

    INDEX `payroll_costs_quotation_id_foreign`(`quotation_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payslips` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `employee_id` BIGINT UNSIGNED NOT NULL,
    `payslip_period` VARCHAR(255) NOT NULL,
    `cluster` VARCHAR(255) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `file_path`(`file_path`),
    INDEX `fk_payslips_employee`(`employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `guard_name` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `permissions_name_guard_name_unique`(`name`, `guard_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `personal_information` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `employee_id` BIGINT UNSIGNED NOT NULL,
    `gender` VARCHAR(10) NULL,
    `civil_status` VARCHAR(255) NULL,
    `date_of_birth` DATE NULL,
    `is_local` BOOLEAN NOT NULL DEFAULT true,
    `passport_number` VARCHAR(255) NULL,
    `work_visa` VARCHAR(255) NULL,
    `nationality` VARCHAR(255) NULL,
    `city` VARCHAR(255) NULL,
    `country` VARCHAR(255) NULL,
    `state` VARCHAR(255) NULL,
    `address` VARCHAR(255) NULL,
    `postal_code` VARCHAR(255) NULL,
    `phone` VARCHAR(255) NULL,
    `mobile` VARCHAR(255) NULL,
    `education_attainment` VARCHAR(255) NULL,
    `education_status` VARCHAR(255) NULL,
    `number_of_dependents` INTEGER NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `personal_information_employee_id_foreign`(`employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `provinces` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `country_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,
    `deleted_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `provinces_country_id_name_unique`(`country_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `provision_types` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotations` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `company_id` BIGINT UNSIGNED NOT NULL,
    `country_id` BIGINT UNSIGNED NOT NULL,
    `province_id` BIGINT UNSIGNED NULL,
    `consultant_id` BIGINT UNSIGNED NULL,
    `currency_name` VARCHAR(255) NOT NULL,
    `exchange_rate` DECIMAL(10, 6) NOT NULL,
    `exchange_acronym` VARCHAR(255) NOT NULL,
    `gross_salary` DECIMAL(15, 2) NOT NULL,
    `is_fix_fee` BOOLEAN NOT NULL DEFAULT false,
    `fee` DECIMAL(15, 4) NOT NULL,
    `bank_fee` DECIMAL(15, 4) NOT NULL,
    `bonus` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `home_allowance` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `transport_allowance` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `medical_allowance` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `internet_allowance` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `family_allowance` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `food_allowance` DECIMAL(15, 2) NULL DEFAULT 0.00,
    `legal_grafication` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `uvt_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `capped_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `dependent` BOOLEAN NOT NULL DEFAULT false,
    `is_freelance` BOOLEAN NULL DEFAULT false,
    `is_payroll` BOOLEAN NOT NULL DEFAULT false,
    `is_integral` BOOLEAN NOT NULL DEFAULT false,
    `cluster_name` VARCHAR(255) NOT NULL,
    `deleted_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `quotations_company_id_foreign`(`company_id`),
    INDEX `quotations_consultant_id_foreign`(`consultant_id`),
    INDEX `quotations_country_id_foreign`(`country_id`),
    INDEX `quotations_province_id_foreign`(`province_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_has_permissions` (
    `permission_id` BIGINT UNSIGNED NOT NULL,
    `role_id` BIGINT UNSIGNED NOT NULL,

    INDEX `role_has_permissions_role_id_foreign`(`role_id`),
    PRIMARY KEY (`permission_id`, `role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `guard_name` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `roles_name_guard_name_unique`(`name`, `guard_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` VARCHAR(255) NOT NULL,
    `user_id` BIGINT UNSIGNED NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `payload` LONGTEXT NOT NULL,
    `last_activity` INTEGER NOT NULL,

    INDEX `sessions_last_activity_index`(`last_activity`),
    INDEX `sessions_user_id_index`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `social_security_infos` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `document_id` BIGINT UNSIGNED NOT NULL,
    `health_fund` VARCHAR(255) NULL,
    `pension_fund` VARCHAR(255) NULL,
    `severance_fund` VARCHAR(255) NULL,
    `curp` VARCHAR(255) NULL,
    `social_security_number` VARCHAR(255) NULL,
    `voter_id` VARCHAR(255) NULL,
    `health_fund_file` VARCHAR(255) NULL,
    `pension_fund_file` VARCHAR(255) NULL,
    `severance_fund_file` VARCHAR(255) NULL,
    `curp_file` VARCHAR(255) NULL,
    `social_security_file` VARCHAR(255) NULL,
    `voter_id_file` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `social_security_infos_document_id_foreign`(`document_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `staff_trackers` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `consultant_id` BIGINT UNSIGNED NOT NULL,
    `industry_field_id` BIGINT UNSIGNED NULL,
    `intermediano_company_id` BIGINT UNSIGNED NOT NULL,
    `company_id` BIGINT UNSIGNED NOT NULL,
    `partner_id` BIGINT UNSIGNED NULL,
    `position` VARCHAR(255) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NULL,
    `status` BOOLEAN NOT NULL,
    `deleted_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `staff_trackers_company_id_foreign`(`company_id`),
    INDEX `staff_trackers_consultant_id_foreign`(`consultant_id`),
    INDEX `staff_trackers_industry_field_id_foreign`(`industry_field_id`),
    INDEX `staff_trackers_intermediano_company_id_foreign`(`intermediano_company_id`),
    INDEX `staff_trackers_partner_id_foreign`(`partner_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplementary_contract_details` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `contract_id` BIGINT UNSIGNED NOT NULL,
    `standard_working_hours` VARCHAR(255) NULL,
    `shift_schedule` VARCHAR(255) NULL,
    `notice_period` VARCHAR(255) NULL,
    `payment_terms` VARCHAR(255) NULL,
    `billing_currency` VARCHAR(255) NULL,
    `payment_currency` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `supplementary_contract_details_contract_id_foreign`(`contract_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `templates` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `country_id` BIGINT UNSIGNED NULL,
    `view_path` VARCHAR(255) NULL,
    `body_content` LONGTEXT NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `templates_country_id_foreign`(`country_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `email_verified_at` TIMESTAMP(0) NULL,
    `password` VARCHAR(255) NOT NULL,
    `remember_token` VARCHAR(100) NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,
    `custom_fields` LONGTEXT NULL,
    `avatar_url` VARCHAR(255) NULL,
    `welcome_valid_until` TIMESTAMP(0) NULL,

    UNIQUE INDEX `users_email_unique`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vacancies` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `company_id` BIGINT UNSIGNED NULL,
    `contact_id` BIGINT UNSIGNED NULL,
    `job_title` VARCHAR(255) NOT NULL,
    `number_of_openings` INTEGER NOT NULL,
    `work_type` ENUM('On-Site', 'Hybrid', 'Home Office') NULL,
    `location` VARCHAR(255) NULL,
    `salary` INTEGER NULL,
    `contract_model` ENUM('Indefinite Period', 'Temporary Contract') NULL,
    `work_schedule` TEXT NULL,
    `target_start_date` DATE NULL,
    `summary` TEXT NULL,
    `education` VARCHAR(255) NULL,
    `profile` TEXT NULL,
    `english_level` VARCHAR(255) NULL,
    `other_info` TEXT NULL,
    `status` ENUM('Open', 'In Progress', 'Waiting', 'Cancelled', 'Finalized') NOT NULL DEFAULT 'Open',
    `published_on_website` BOOLEAN NOT NULL DEFAULT false,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,
    `deleted_at` TIMESTAMP(0) NULL,

    INDEX `vacancies_company_id_foreign`(`company_id`),
    INDEX `vacancies_contact_id_foreign`(`contact_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vacancy_allowances` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `vacancy_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,
    `deleted_at` TIMESTAMP(0) NULL,

    INDEX `vacancy_allowances_vacancy_id_foreign`(`vacancy_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vacancy_languages` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `vacancy_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `level` VARCHAR(255) NULL,
    `mandatory` BOOLEAN NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,
    `deleted_at` TIMESTAMP(0) NULL,

    INDEX `vacancy_languages_vacancy_id_foreign`(`vacancy_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vacancy_skills` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `vacancy_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `mandatory` BOOLEAN NULL,
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,
    `deleted_at` TIMESTAMP(0) NULL,

    INDEX `vacancy_skills_vacancy_id_foreign`(`vacancy_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vacation_requests` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `employee_id` BIGINT UNSIGNED NOT NULL,
    `company_id` BIGINT UNSIGNED NOT NULL,
    `start_date` DATE NULL,
    `end_date` DATE NULL,
    `number_of_days` VARCHAR(255) NULL,
    `status` VARCHAR(255) NOT NULL DEFAULT 'pending',
    `created_at` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    INDEX `vacation_requests_company_id_foreign`(`company_id`),
    INDEX `vacation_requests_employee_id_foreign`(`employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `banking_details` ADD CONSTRAINT `banking_details_document_id_foreign` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `banks` ADD CONSTRAINT `banks_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `companies` ADD CONSTRAINT `companies_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `companies` ADD CONSTRAINT `companies_industry_field_id_foreign` FOREIGN KEY (`industry_field_id`) REFERENCES `industry_fields`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `consultants` ADD CONSTRAINT `consultants_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_admin_signed_by_foreign` FOREIGN KEY (`admin_signed_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_partner_id_foreign` FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_quotation_id_foreign` FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `contracts` ADD CONSTRAINT `fk_intermediano_company` FOREIGN KEY (`intermediano_company_id`) REFERENCES `intermediano_companies`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `country_annual_setups` ADD CONSTRAINT `country_annual_setups_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `currencies` ADD CONSTRAINT `currencies_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `fk_partner_id` FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `dependents` ADD CONSTRAINT `dependents_personal_information_id_foreign` FOREIGN KEY (`personal_information_id`) REFERENCES `personal_information`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `emergency_contacts` ADD CONSTRAINT `emergency_contacts_personal_information_id_foreign` FOREIGN KEY (`personal_information_id`) REFERENCES `personal_information`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `employee_expenses` ADD CONSTRAINT `employee_expenses_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `employee_expenses` ADD CONSTRAINT `employee_expenses_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `employee_files` ADD CONSTRAINT `employee_files_document_id_foreign` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_consultant_id_foreign` FOREIGN KEY (`consultant_id`) REFERENCES `consultants`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `holidays` ADD CONSTRAINT `holidays_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `industry_fields` ADD CONSTRAINT `industry_fields_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `intermediano_companies` ADD CONSTRAINT `intermediano_companies_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `investments` ADD CONSTRAINT `investments_bank_id_foreign` FOREIGN KEY (`bank_id`) REFERENCES `banks`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `investments` ADD CONSTRAINT `investments_currency_id_foreign` FOREIGN KEY (`currency_id`) REFERENCES `currencies`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `invoice_details` ADD CONSTRAINT `invoice_details_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `leads_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `leads_contact_id_foreign` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `leads_opportunity_owner_foreign` FOREIGN KEY (`opportunity_owner`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `leads_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `model_has_permissions` ADD CONSTRAINT `model_has_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `model_has_roles` ADD CONSTRAINT `model_has_roles_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `monthly_timesheets` ADD CONSTRAINT `monthly_timesheets_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `monthly_timesheets` ADD CONSTRAINT `monthly_timesheets_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `msp_payroll_company` ADD CONSTRAINT `msp_payroll_company_ibfk_1` FOREIGN KEY (`msp_payroll_id`) REFERENCES `msp_payrolls`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `msp_payroll_company` ADD CONSTRAINT `msp_payroll_company_ibfk_2` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `payment_provisions` ADD CONSTRAINT `fk_payment_provisions_provision_type` FOREIGN KEY (`provision_type_id`) REFERENCES `provision_types`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `payment_provisions` ADD CONSTRAINT `fk_payment_provisions_quotation` FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `payroll_costs` ADD CONSTRAINT `payroll_costs_quotation_id_foreign` FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `payslips` ADD CONSTRAINT `fk_payslips_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `personal_information` ADD CONSTRAINT `personal_information_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `provinces` ADD CONSTRAINT `provinces_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_consultant_id_foreign` FOREIGN KEY (`consultant_id`) REFERENCES `consultants`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_province_id_foreign` FOREIGN KEY (`province_id`) REFERENCES `provinces`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `role_has_permissions` ADD CONSTRAINT `role_has_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `role_has_permissions` ADD CONSTRAINT `role_has_permissions_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `social_security_infos` ADD CONSTRAINT `social_security_infos_document_id_foreign` FOREIGN KEY (`document_id`) REFERENCES `documents`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `staff_trackers` ADD CONSTRAINT `staff_trackers_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `staff_trackers` ADD CONSTRAINT `staff_trackers_consultant_id_foreign` FOREIGN KEY (`consultant_id`) REFERENCES `consultants`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `staff_trackers` ADD CONSTRAINT `staff_trackers_industry_field_id_foreign` FOREIGN KEY (`industry_field_id`) REFERENCES `industry_fields`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `staff_trackers` ADD CONSTRAINT `staff_trackers_intermediano_company_id_foreign` FOREIGN KEY (`intermediano_company_id`) REFERENCES `intermediano_companies`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `staff_trackers` ADD CONSTRAINT `staff_trackers_partner_id_foreign` FOREIGN KEY (`partner_id`) REFERENCES `partners`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `supplementary_contract_details` ADD CONSTRAINT `supplementary_contract_details_contract_id_foreign` FOREIGN KEY (`contract_id`) REFERENCES `contracts`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `templates` ADD CONSTRAINT `templates_country_id_foreign` FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `vacancies` ADD CONSTRAINT `vacancies_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `vacancies` ADD CONSTRAINT `vacancies_contact_id_foreign` FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `vacancy_allowances` ADD CONSTRAINT `vacancy_allowances_vacancy_id_foreign` FOREIGN KEY (`vacancy_id`) REFERENCES `vacancies`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `vacancy_languages` ADD CONSTRAINT `vacancy_languages_vacancy_id_foreign` FOREIGN KEY (`vacancy_id`) REFERENCES `vacancies`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `vacancy_skills` ADD CONSTRAINT `vacancy_skills_vacancy_id_foreign` FOREIGN KEY (`vacancy_id`) REFERENCES `vacancies`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `vacation_requests` ADD CONSTRAINT `vacation_requests_company_id_foreign` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `vacation_requests` ADD CONSTRAINT `vacation_requests_employee_id_foreign` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;
