ALTER TABLE "schedules" RENAME COLUMN "time" TO "start_time";--> statement-breakpoint

ALTER TABLE "schedules" ADD COLUMN "end_time" time DEFAULT '00:00'::time;--> statement-breakpoint
UPDATE "schedules" SET "end_time" = '09:00'::time WHERE "end_time" IS NULL;--> statement-breakpoint
ALTER TABLE "schedules" ALTER COLUMN "end_time" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "schedules" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "schedules" DROP COLUMN "category";