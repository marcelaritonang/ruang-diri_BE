CREATE TABLE "chat_user_presence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar(10) DEFAULT 'present' NOT NULL,
	"last_seen" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_user_presence" ADD CONSTRAINT "chat_user_presence_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_user_presence" ADD CONSTRAINT "chat_user_presence_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_chat_user_presence_session_id" ON "chat_user_presence" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_chat_user_presence_user_id" ON "chat_user_presence" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_chat_user_presence_session_user" ON "chat_user_presence" USING btree ("session_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_chat_user_presence_status" ON "chat_user_presence" USING btree ("status");