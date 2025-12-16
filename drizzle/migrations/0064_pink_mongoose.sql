ALTER TABLE "counselings" ALTER COLUMN "date" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "counselings" ALTER COLUMN "end_date" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "schedules" ALTER COLUMN "start_date_time" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "schedules" ALTER COLUMN "end_date_time" SET DATA TYPE timestamp;--> statement-breakpoint

-- Add timezone columns with default values for existing records
ALTER TABLE "counselings" ADD COLUMN "original_timezone" varchar(50);--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "original_timezone" varchar(50);--> statement-breakpoint

-- Set default timezone for existing records (assuming WIB/Asia/Jakarta)
UPDATE "counselings" SET "original_timezone" = 'WIB' WHERE "original_timezone" IS NULL;--> statement-breakpoint
UPDATE "schedules" SET "original_timezone" = 'WIB' WHERE "original_timezone" IS NULL;--> statement-breakpoint

-- Now make the columns NOT NULL
ALTER TABLE "counselings" ALTER COLUMN "original_timezone" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "schedules" ALTER COLUMN "original_timezone" SET NOT NULL;