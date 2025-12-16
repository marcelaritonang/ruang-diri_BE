CREATE TABLE "message_search_index" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(128) NOT NULL,
	"key_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ALTER COLUMN "message" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "message_search_index" ADD CONSTRAINT "message_search_index_message_id_chat_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."chat_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_search_index" ADD CONSTRAINT "message_search_index_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_search_index" ADD CONSTRAINT "message_search_index_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_search_user_token_key" ON "message_search_index" USING btree ("user_id","token_hash","key_version");--> statement-breakpoint
CREATE INDEX "idx_search_session_user" ON "message_search_index" USING btree ("session_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_search_message_id" ON "message_search_index" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "idx_search_user_key_version" ON "message_search_index" USING btree ("user_id","key_version");--> statement-breakpoint
CREATE INDEX "idx_search_created_at" ON "message_search_index" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_search_session_token_key" ON "message_search_index" USING btree ("session_id","token_hash","key_version");