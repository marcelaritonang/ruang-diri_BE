CREATE TYPE "public"."counseling_status_appointment" AS ENUM('scheduled', 'completed', 'cancelled');--> statement-breakpoint
ALTER TABLE "counselings" ADD COLUMN "status" "counseling_status_appointment" NOT NULL DEFAULT 'scheduled';--> statement-breakpoint
ALTER TABLE "psychologist_profiles" ADD COLUMN "address" varchar(255);--> statement-breakpoint
CREATE INDEX "idx_psychologist_address" ON "psychologist_profiles" USING btree ("address");--> statement-breakpoint
ALTER TABLE "psychologist_profiles" ADD CONSTRAINT "unique_psychologist_user_id" UNIQUE("user_id");