ALTER TABLE "schedules" ALTER COLUMN "start_date_time" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "schedules" ALTER COLUMN "end_date_time" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "timezone" varchar(50) DEFAULT 'UTC';--> statement-breakpoint
CREATE INDEX "idx_users_timezone" ON "users" USING btree ("timezone");