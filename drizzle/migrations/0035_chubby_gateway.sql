CREATE TYPE "public"."notification_sub_type" AS ENUM('counseling', 'general');--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "sub_type" "notification_sub_type" DEFAULT 'general';