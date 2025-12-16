ALTER TABLE "organization_schedule" RENAME TO "schedules";--> statement-breakpoint
ALTER TABLE "schedules" DROP CONSTRAINT "organization_schedule_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;