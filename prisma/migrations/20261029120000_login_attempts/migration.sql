-- Failed sign-in counters for the employee portal's password login (additive; nothing else reads this table).

-- CreateTable
CREATE TABLE `login_attempts` (
    `key` VARCHAR(191) NOT NULL,
    `attempts` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `window_started_at` TIMESTAMP(0) NOT NULL,
    `locked_until` TIMESTAMP(0) NULL,
    `updated_at` TIMESTAMP(0) NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
