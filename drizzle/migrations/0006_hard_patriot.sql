CREATE TABLE IF NOT EXISTS "users_schedules" (
	"schedule_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "users_schedules_schedule_id_user_id_pk" PRIMARY KEY("schedule_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "users_schedules" ADD CONSTRAINT "users_schedules_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_schedules" ADD CONSTRAINT "users_schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;