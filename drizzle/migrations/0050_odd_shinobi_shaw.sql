ALTER TABLE "organizations" ADD COLUMN "total_quota" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "remaining_quota" integer DEFAULT 0 NOT NULL;