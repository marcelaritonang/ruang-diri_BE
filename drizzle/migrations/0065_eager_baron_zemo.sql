ALTER TABLE "chat_sessions" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "chat_sessions" ALTER COLUMN "is_active" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "is_automated" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN "counseling_id" uuid;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN "is_chat_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN "scheduled_at" timestamp;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_counseling_id_counselings_id_fk" FOREIGN KEY ("counseling_id") REFERENCES "public"."counselings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_chat_sessions_counseling_id" ON "chat_sessions" USING btree ("counseling_id");--> statement-breakpoint
CREATE INDEX "idx_chat_sessions_scheduled_at" ON "chat_sessions" USING btree ("scheduled_at");