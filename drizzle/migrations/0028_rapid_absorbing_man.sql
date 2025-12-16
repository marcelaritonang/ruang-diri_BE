CREATE INDEX "idx_schedules_organization_id" ON "schedules" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_schedules_type" ON "schedules" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_schedules_org_type" ON "schedules" USING btree ("organization_id","type");--> statement-breakpoint
CREATE INDEX "idx_users_schedules_user_id" ON "users_schedules" USING btree ("user_id");