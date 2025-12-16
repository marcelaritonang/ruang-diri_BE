DROP INDEX "idx_counselings_method";--> statement-breakpoint
ALTER TABLE "counselings" DROP COLUMN "method";--> statement-breakpoint
DROP TYPE "public"."counseling_method";--> statement-breakpoint
CREATE TYPE "public"."counseling_method" AS ENUM('online, in_person, chat');