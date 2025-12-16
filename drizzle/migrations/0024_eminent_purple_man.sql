CREATE TYPE "agenda_type" AS ENUM('counseling', 'class', 'seminar', 'others');

CREATE TABLE IF NOT EXISTS "schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "agenda" varchar(255) NOT NULL,
  "start_date_time" timestamp NOT NULL,
  "end_date_time" timestamp NOT NULL,
  "location" varchar(255),
  "description" varchar,
  "notification_offset" integer NOT NULL,
  "deleted_at" timestamp,
  "created_by" uuid NOT NULL,
  "updated_by" uuid,
  "deleted_by" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "type" "agenda_type"
);

CREATE TABLE IF NOT EXISTS "users_schedules" (
  "schedule_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "users_schedules_schedule_id_user_id_pk" PRIMARY KEY("schedule_id", "user_id")
);

ALTER TABLE "schedules" ADD CONSTRAINT "schedules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id");
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id");
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "users"("id");
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "users"("id");

ALTER TABLE "users_schedules" ADD CONSTRAINT "users_schedules_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "schedules"("id");
ALTER TABLE "users_schedules" ADD CONSTRAINT "users_schedules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id");
