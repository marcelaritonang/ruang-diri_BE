ALTER TABLE "account_keys" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chat_e2e_envelopes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "e2e_file_manifests" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "e2e_session_chains" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "training_export_jobs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "account_keys" CASCADE;--> statement-breakpoint
DROP TABLE "chat_e2e_envelopes" CASCADE;--> statement-breakpoint
DROP TABLE "e2e_file_manifests" CASCADE;--> statement-breakpoint
DROP TABLE "e2e_session_chains" CASCADE;--> statement-breakpoint
DROP TABLE "training_export_jobs" CASCADE;--> statement-breakpoint
ALTER TABLE "schedules" ALTER COLUMN "start_date_time" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "schedules" ALTER COLUMN "end_date_time" SET DATA TYPE timestamp;