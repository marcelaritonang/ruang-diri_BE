ALTER TABLE "psychologist_profiles" ADD COLUMN "license_valid_until" timestamp;--> statement-breakpoint
ALTER TABLE "psychologist_profiles" ADD COLUMN "practice_start_date" timestamp;--> statement-breakpoint
ALTER TABLE "psychologist_profiles" ADD COLUMN "price_per_session" integer DEFAULT 0;--> statement-breakpoint
CREATE INDEX "idx_psychologist_license_valid_until" ON "psychologist_profiles" USING btree ("license_valid_until");--> statement-breakpoint
CREATE INDEX "idx_psychologist_practice_start_date" ON "psychologist_profiles" USING btree ("practice_start_date");