ALTER TABLE "users" ADD COLUMN "os_name" varchar(50) DEFAULT 'Unknown';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "device_type" varchar(50) DEFAULT 'desktop';