ALTER TABLE "chat_sessions" ALTER COLUMN "status" SET DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "employee_profiles" ALTER COLUMN "years_of_service" DROP NOT NULL;