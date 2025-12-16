ALTER TABLE "schedules" ADD COLUMN "zoom_join_url" varchar(1024);--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "zoom_start_url" varchar(1024);--> statement-breakpoint
ALTER TABLE "schedule_attachments" DROP COLUMN "zoom_join_url";--> statement-breakpoint
ALTER TABLE "schedule_attachments" DROP COLUMN "zoom_start_url";