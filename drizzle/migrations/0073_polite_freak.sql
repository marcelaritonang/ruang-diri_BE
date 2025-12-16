CREATE TABLE "account_keys" (
	"device_id" varchar(100) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"public_key_b64" text NOT NULL,
	"key_type" varchar(20) DEFAULT 'x25519' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_e2e_envelopes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"sender_device_id" varchar(100) NOT NULL,
	"cipher_b64" text NOT NULL,
	"aad_json" jsonb NOT NULL,
	"seq_number" bigint NOT NULL,
	"size_bytes" integer NOT NULL,
	"sent_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "e2e_file_manifests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"sender_device_id" varchar(100) NOT NULL,
	"encrypted_blob_url" text NOT NULL,
	"content_type_category" varchar(50) NOT NULL,
	"size_category" varchar(20) NOT NULL,
	"per_device_keys" jsonb NOT NULL,
	"integrity_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "e2e_session_chains" (
	"session_id" uuid NOT NULL,
	"device_id" varchar(100) NOT NULL,
	"wrapped_chain_seed_b64" text NOT NULL,
	"last_seq_number" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "e2e_session_chains_session_id_device_id_pk" PRIMARY KEY("session_id","device_id")
);
--> statement-breakpoint
CREATE TABLE "training_export_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"export_type" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"sanitization_rules" jsonb NOT NULL,
	"analytics_public_key" text NOT NULL,
	"upload_url" text,
	"exported_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN "encryption_type" varchar(20) DEFAULT 'plaintext' NOT NULL;--> statement-breakpoint
ALTER TABLE "account_keys" ADD CONSTRAINT "account_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_e2e_envelopes" ADD CONSTRAINT "chat_e2e_envelopes_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_e2e_envelopes" ADD CONSTRAINT "chat_e2e_envelopes_sender_device_id_account_keys_device_id_fk" FOREIGN KEY ("sender_device_id") REFERENCES "public"."account_keys"("device_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "e2e_file_manifests" ADD CONSTRAINT "e2e_file_manifests_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "e2e_file_manifests" ADD CONSTRAINT "e2e_file_manifests_sender_device_id_account_keys_device_id_fk" FOREIGN KEY ("sender_device_id") REFERENCES "public"."account_keys"("device_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "e2e_session_chains" ADD CONSTRAINT "e2e_session_chains_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "e2e_session_chains" ADD CONSTRAINT "e2e_session_chains_device_id_account_keys_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."account_keys"("device_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_export_jobs" ADD CONSTRAINT "training_export_jobs_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_account_keys_user_id" ON "account_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_chat_e2e_envelopes_session_id" ON "chat_e2e_envelopes" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_chat_e2e_envelopes_sender_device_id" ON "chat_e2e_envelopes" USING btree ("sender_device_id");--> statement-breakpoint
CREATE INDEX "idx_chat_e2e_envelopes_seq_number" ON "chat_e2e_envelopes" USING btree ("session_id","sender_device_id","seq_number");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_envelope_sequence" ON "chat_e2e_envelopes" USING btree ("session_id","sender_device_id","seq_number");--> statement-breakpoint
CREATE INDEX "idx_e2e_file_manifests_session_id" ON "e2e_file_manifests" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_e2e_session_chains_session_id" ON "e2e_session_chains" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_training_export_jobs_session_id" ON "training_export_jobs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_training_export_jobs_status" ON "training_export_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_chat_sessions_encryption_type" ON "chat_sessions" USING btree ("encryption_type");--> statement-breakpoint