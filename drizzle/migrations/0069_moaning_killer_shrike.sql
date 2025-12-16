ALTER TABLE "chat_sessions" ALTER COLUMN "scheduled_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "chat_sessions" ALTER COLUMN "scheduled_at" SET NOT NULL;