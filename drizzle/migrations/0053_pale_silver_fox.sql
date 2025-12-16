ALTER TABLE "psychologist_profiles" ALTER COLUMN "counseling_method" SET DEFAULT '{"online":"online","offline":"offline","organization":"organization","chat":"chat"}';--> statement-breakpoint
ALTER TABLE "screenings" ALTER COLUMN "date" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "screenings" ADD COLUMN "depression_score" integer;--> statement-breakpoint
ALTER TABLE "screenings" ADD COLUMN "anxiety_score" integer;--> statement-breakpoint
ALTER TABLE "screenings" ADD COLUMN "stress_score" integer;--> statement-breakpoint
ALTER TABLE "screenings" ADD COLUMN "depression_category" text;--> statement-breakpoint
ALTER TABLE "screenings" ADD COLUMN "anxiety_category" text;--> statement-breakpoint
ALTER TABLE "screenings" ADD COLUMN "stress_category" text;--> statement-breakpoint
ALTER TABLE "screenings" ADD COLUMN "overall_risk" text;--> statement-breakpoint
ALTER TABLE "screenings" ADD COLUMN "answers" jsonb;--> statement-breakpoint
ALTER TABLE "screenings" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "screenings" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "screenings" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_screenings_overall_risk" ON "screenings" USING btree ("overall_risk");--> statement-breakpoint
CREATE INDEX "idx_screenings_created_at" ON "screenings" USING btree ("created_at");--> statement-breakpoint
DROP TYPE "public"."counseling_method";--> statement-breakpoint
CREATE TYPE "public"."counseling_method" AS ENUM('online, offline, organization, chat');