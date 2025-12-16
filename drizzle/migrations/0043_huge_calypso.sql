CREATE TYPE "public"."counseling_method" AS ENUM('online', 'in_person', 'chat');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "psychologist_availability" (
	"id" uuid PRIMARY KEY NOT NULL,
	"psychologist_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "psychologist_counseling_quotas" (
	"id" uuid PRIMARY KEY NOT NULL,
	"psychologist_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"counseling_method" "counseling_method" DEFAULT 'in_person' NOT NULL,
	"quota" integer NOT NULL,
	"remaining_quota" integer NOT NULL,
	CONSTRAINT "uq_psychologist_org_method" UNIQUE("psychologist_id","organization_id","counseling_method"),
	CONSTRAINT "chk_remaining_quota_lte_quota" CHECK ("remaining_quota" <= "quota")
);
--> statement-breakpoint
ALTER TABLE "psychologist_availability" ADD CONSTRAINT "psychologist_availability_psychologist_id_psychologist_profiles_user_id_fk" FOREIGN KEY ("psychologist_id") REFERENCES "public"."psychologist_profiles"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "psychologist_counseling_quotas" ADD CONSTRAINT "psychologist_counseling_quotas_psychologist_id_psychologist_profiles_user_id_fk" FOREIGN KEY ("psychologist_id") REFERENCES "public"."psychologist_profiles"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "psychologist_counseling_quotas" ADD CONSTRAINT "psychologist_counseling_quotas_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_psychologist_availability_psychologist_id" ON "psychologist_availability" USING btree ("psychologist_id");--> statement-breakpoint
CREATE INDEX "idx_psychologist_availability_day_of_week" ON "psychologist_availability" USING btree ("day_of_week");--> statement-breakpoint
CREATE INDEX "idx_psychologist_availability_start_time" ON "psychologist_availability" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "idx_psychologist_availability_end_time" ON "psychologist_availability" USING btree ("end_time");--> statement-breakpoint
CREATE INDEX "idx_psychologist_counseling_quota_psychologist_id" ON "psychologist_counseling_quotas" USING btree ("psychologist_id");--> statement-breakpoint
CREATE INDEX "idx_psychologist_counseling_quota_organization_id" ON "psychologist_counseling_quotas" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_psychologist_counseling_quota_counseling_method" ON "psychologist_counseling_quotas" USING btree ("counseling_method");--> statement-breakpoint
CREATE INDEX "idx_psychologist_counseling_quota_quota" ON "psychologist_counseling_quotas" USING btree ("quota");--> statement-breakpoint
CREATE INDEX "idx_psychologist_counseling_quota_remaining_quota" ON "psychologist_counseling_quotas" USING btree ("remaining_quota");--> statement-breakpoint
CREATE INDEX "idx_psychologist_location" ON "psychologist_profiles" USING btree ("location");