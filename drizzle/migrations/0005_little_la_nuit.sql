ALTER TABLE "schedules" DROP CONSTRAINT "schedules_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "schedules" DROP COLUMN "user_id";