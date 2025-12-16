ALTER TABLE "schedules" ALTER COLUMN "location" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "custom_location" varchar(255);