ALTER TABLE "chat_messages" ADD COLUMN "attachment_url" varchar(500);--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "attachment_type" varchar(100);--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "attachment_name" varchar(255);--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "attachment_size" integer;