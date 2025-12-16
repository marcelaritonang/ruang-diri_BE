CREATE TYPE "public"."agenda_type" AS ENUM('counseling', 'class', 'seminar', 'others');--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "type" "agenda_type";