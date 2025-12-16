-- Add timezone columns and convert timestamp columns from timestamptz to timestamp
-- Step 1: Add original_timezone columns
ALTER TABLE "counselings" ADD COLUMN "original_timezone" varchar(50);--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "original_timezone" varchar(50);--> statement-breakpoint

-- Step 2: Set default timezone for existing records (assuming WIB/Asia/Jakarta)
UPDATE "counselings" SET "original_timezone" = 'WIB' WHERE "original_timezone" IS NULL;--> statement-breakpoint
UPDATE "schedules" SET "original_timezone" = 'WIB' WHERE "original_timezone" IS NULL;--> statement-breakpoint

-- Step 3: Make the columns NOT NULL
ALTER TABLE "counselings" ALTER COLUMN "original_timezone" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "schedules" ALTER COLUMN "original_timezone" SET NOT NULL;--> statement-breakpoint

-- Step 4: Convert timestamp columns from timestamptz to timestamp (store in UTC without timezone info)
ALTER TABLE "schedules" ALTER COLUMN "start_date_time" TYPE timestamp;--> statement-breakpoint
ALTER TABLE "schedules" ALTER COLUMN "end_date_time" TYPE timestamp;--> statement-breakpoint
ALTER TABLE "counselings" ALTER COLUMN "date" TYPE timestamp;--> statement-breakpoint
ALTER TABLE "counselings" ALTER COLUMN "end_date" TYPE timestamp;