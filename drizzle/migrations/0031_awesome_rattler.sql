CREATE TABLE "schedule_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"file_url" varchar(1024) NOT NULL,
	"file_type" varchar(100) NOT NULL,
	"original_name" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "schedule_attachments" ADD CONSTRAINT "schedule_attachments_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_schedule_attachments_schedule_id" ON "schedule_attachments" USING btree ("schedule_id");