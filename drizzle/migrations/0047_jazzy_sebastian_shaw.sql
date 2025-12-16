ALTER TABLE "psychologist_counseling_quotas" DROP CONSTRAINT "uq_psychologist_org_method";--> statement-breakpoint
ALTER TABLE "psychologist_counseling_quotas" DROP CONSTRAINT "psychologist_counseling_quotas_psychologist_id_psychologist_profiles_user_id_fk";
--> statement-breakpoint
DROP INDEX "idx_psychologist_counseling_quota_psychologist_id";--> statement-breakpoint
DROP INDEX "idx_psychologist_counseling_quota_counseling_method";--> statement-breakpoint
ALTER TABLE "psychologist_profiles" ADD COLUMN "counseling_method" jsonb DEFAULT '{"online":"online","inPerson":"in_person","chat":"chat"}' NOT NULL;--> statement-breakpoint
ALTER TABLE "psychologist_counseling_quotas" DROP COLUMN "psychologist_id";--> statement-breakpoint
ALTER TABLE "psychologist_counseling_quotas" DROP COLUMN "counseling_method";--> statement-breakpoint
ALTER TABLE "psychologist_counseling_quotas" ADD CONSTRAINT "uq_psychologist_org_method" UNIQUE("organization_id");--> statement-breakpoint
ALTER TABLE "public"."counselings" ALTER COLUMN "method" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."counseling_method";--> statement-breakpoint
CREATE TYPE "public"."counseling_method" AS ENUM('online', 'in_person', 'chat');--> statement-breakpoint
ALTER TABLE "public"."counselings" ALTER COLUMN "method" SET DATA TYPE "public"."counseling_method" USING "method"::"public"."counseling_method";