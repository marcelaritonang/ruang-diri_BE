CREATE TABLE IF NOT EXISTS "organization_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"agenda" varchar(255) NOT NULL,
	"date" timestamp NOT NULL,
	"location" varchar(255),
	"description" varchar(255),
	"category" "screening_type" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_schedule" ADD CONSTRAINT "organization_schedule_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;