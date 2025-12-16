ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_onboarded" boolean DEFAULT false;--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_full_name" ON "users" USING btree ("full_name");--> statement-breakpoint
CREATE INDEX "idx_users_id" ON "users" USING btree ("id");