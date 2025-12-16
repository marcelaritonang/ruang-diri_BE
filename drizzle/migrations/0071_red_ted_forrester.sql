ALTER TABLE "psychologist_profiles" ADD COLUMN "sipp_number" varchar(100);--> statement-breakpoint
ALTER TABLE "psychologist_profiles" ADD COLUMN "registration_number" varchar(100);--> statement-breakpoint
ALTER TABLE "psychologist_profiles" ADD COLUMN "type_of_practice" varchar(100);--> statement-breakpoint
ALTER TABLE "psychologist_profiles" ADD COLUMN "field_of_expertise" varchar(255);--> statement-breakpoint
CREATE INDEX "idx_psychologist_counseling_method" ON "psychologist_profiles" USING btree ("counseling_method");--> statement-breakpoint
CREATE INDEX "idx_psychologist_created_at" ON "psychologist_profiles" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "psychologist_profiles" DROP COLUMN "license_number";