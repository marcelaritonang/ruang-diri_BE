DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'actor_type') THEN
    CREATE TYPE actor_type AS ENUM ('student', 'employee');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "counselings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"actor_type" "actor_type" NOT NULL,
	"date" timestamp NOT NULL,
	"notes" varchar(255)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "screenings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"actor_type" "actor_type" NOT NULL,
	"date" timestamp NOT NULL,
	"screening_status" "screening_type" DEFAULT 'not_screened' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "counselings" ADD CONSTRAINT "counselings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screenings" ADD CONSTRAINT "screenings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_counselings_user_id" ON "counselings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_counselings_actor_type" ON "counselings" USING btree ("actor_type");--> statement-breakpoint
CREATE INDEX "idx_counselings_date" ON "counselings" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_screenings_user_id" ON "screenings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_screenings_actor_type" ON "screenings" USING btree ("actor_type");--> statement-breakpoint
CREATE INDEX "idx_screenings_date" ON "screenings" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_screenings_status" ON "screenings" USING btree ("screening_status");