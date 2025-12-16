ALTER TABLE "schedules" ALTER COLUMN "organization_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "psychologist_id" uuid;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_psychologist_id_users_id_fk" FOREIGN KEY ("psychologist_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_sched_psy_time" ON "schedules" USING btree ("psychologist_id","start_date_time");--> statement-breakpoint
CREATE INDEX "idx_sched_org_time" ON "schedules" USING btree ("organization_id","start_date_time");