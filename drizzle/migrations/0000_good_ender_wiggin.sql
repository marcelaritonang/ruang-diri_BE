DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'actor_type') THEN
        CREATE TYPE "public"."actor_type" AS ENUM('student', 'employee');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender_type') THEN
        CREATE TYPE "public"."gender_type" AS ENUM('female', 'male');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employee_screening_type') THEN
        CREATE TYPE "public"."employee_screening_type" AS ENUM('stable', 'at_risk', 'monitored', 'not_screened');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'iq_category') THEN
        CREATE TYPE "public"."iq_category" AS ENUM('very_below_average', 'below_average', 'average', 'above_average', 'very_above_average');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organization_type') THEN
        CREATE TYPE "public"."organization_type" AS ENUM('school', 'company');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'screening_type') THEN
        CREATE TYPE "public"."screening_type" AS ENUM('stable', 'at_risk', 'monitored', 'not_screened');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE "public"."user_role" AS ENUM('super_admin', 'organization', 'psychologist', 'client', 'student', 'employee');
    END IF;
END$$; --> statement breakpoint

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'client_profiles_user_id_users_id_fk'
    ) THEN
        ALTER TABLE "client_profiles"
        ADD CONSTRAINT "client_profiles_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'employee_profiles_user_id_users_id_fk'
    ) THEN
        ALTER TABLE "employee_profiles"
        ADD CONSTRAINT "employee_profiles_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'mental_health_history_user_id_users_id_fk'
    ) THEN
        ALTER TABLE "mental_health_history"
        ADD CONSTRAINT "mental_health_history_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'psychologist_profiles_user_id_users_id_fk'
    ) THEN
        ALTER TABLE "psychologist_profiles"
        ADD CONSTRAINT "psychologist_profiles_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'student_profiles_user_id_users_id_fk'
    ) THEN
        ALTER TABLE "student_profiles"
        ADD CONSTRAINT "student_profiles_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_organization_id_organizations_id_fk'
    ) THEN
        ALTER TABLE "users"
        ADD CONSTRAINT "users_organization_id_organizations_id_fk"
        FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;
END$$; --> statement breakpoint

DO $$
BEGIN
    -- Foreign Keys
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'client_profiles_user_id_users_id_fk'
    ) THEN
        ALTER TABLE "client_profiles"
        ADD CONSTRAINT "client_profiles_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'employee_profiles_user_id_users_id_fk'
    ) THEN
        ALTER TABLE "employee_profiles"
        ADD CONSTRAINT "employee_profiles_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'mental_health_history_user_id_users_id_fk'
    ) THEN
        ALTER TABLE "mental_health_history"
        ADD CONSTRAINT "mental_health_history_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'psychologist_profiles_user_id_users_id_fk'
    ) THEN
        ALTER TABLE "psychologist_profiles"
        ADD CONSTRAINT "psychologist_profiles_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'student_profiles_user_id_users_id_fk'
    ) THEN
        ALTER TABLE "student_profiles"
        ADD CONSTRAINT "student_profiles_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_organization_id_organizations_id_fk'
    ) THEN
        ALTER TABLE "users"
        ADD CONSTRAINT "users_organization_id_organizations_id_fk"
        FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION;
    END IF;

    -- Indexes
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_employee_department'
    ) THEN
        CREATE INDEX "idx_employee_department" ON "employee_profiles" USING btree ("department");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_employee_position'
    ) THEN
        CREATE INDEX "idx_employee_position" ON "employee_profiles" USING btree ("position");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_employee_gender'
    ) THEN
        CREATE INDEX "idx_employee_gender" ON "employee_profiles" USING btree ("gender");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_employee_age'
    ) THEN
        CREATE INDEX "idx_employee_age" ON "employee_profiles" USING btree ("age");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_employee_years_of_service'
    ) THEN
        CREATE INDEX "idx_employee_years_of_service" ON "employee_profiles" USING btree ("years_of_service");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_mental_health_history_user_id'
    ) THEN
        CREATE INDEX "idx_mental_health_history_user_id" ON "mental_health_history" USING btree ("user_id");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_mental_health_history_actor_type'
    ) THEN
        CREATE INDEX "idx_mental_health_history_actor_type" ON "mental_health_history" USING btree ("actor_type");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_mental_health_history_status'
    ) THEN
        CREATE INDEX "idx_mental_health_history_status" ON "mental_health_history" USING btree ("status");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_mental_health_history_date'
    ) THEN
        CREATE INDEX "idx_mental_health_history_date" ON "mental_health_history" USING btree ("date");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_mental_health_history_user_id_date'
    ) THEN
        CREATE INDEX "idx_mental_health_history_user_id_date" ON "mental_health_history" USING btree ("user_id", "date");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_mental_health_history_has_counseled'
    ) THEN
        CREATE INDEX "idx_mental_health_history_has_counseled" ON "mental_health_history" USING btree ("has_counseled");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_psychologist_specialization'
    ) THEN
        CREATE INDEX "idx_psychologist_specialization" ON "psychologist_profiles" USING btree ("specialization");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_psychologist_is_external'
    ) THEN
        CREATE INDEX "idx_psychologist_is_external" ON "psychologist_profiles" USING btree ("is_external");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_student_classroom'
    ) THEN
        CREATE INDEX "idx_student_classroom" ON "student_profiles" USING btree ("classroom");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_student_gender'
    ) THEN
        CREATE INDEX "idx_student_gender" ON "student_profiles" USING btree ("gender");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_student_nis'
    ) THEN
        CREATE INDEX "idx_student_nis" ON "student_profiles" USING btree ("nis");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_student_grade'
    ) THEN
        CREATE INDEX "idx_student_grade" ON "student_profiles" USING btree ("grade");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_student_iqScore'
    ) THEN
        CREATE INDEX "idx_student_iq_score" ON "student_profiles" USING btree ("iq_score");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_organization_id'
    ) THEN
        CREATE INDEX "idx_users_organization_id" ON "users" USING btree ("organization_id");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_role'
    ) THEN
        CREATE INDEX "idx_users_role" ON "users" USING btree ("role");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_org_role'
    ) THEN
        CREATE INDEX "idx_users_org_role" ON "users" USING btree ("organization_id", "role");
    END IF;
END$$; --> statement breakpoint

CREATE TABLE IF NOT EXISTS "client_profiles" (
  "user_id" uuid PRIMARY KEY NOT NULL,
  "address" varchar(255),
  "phone" varchar(50),
  "emergency_contact" varchar(255),
  "emergency_phone" varchar(50),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "employee_profiles" (
  "user_id" uuid PRIMARY KEY NOT NULL,
  "employee_id" varchar(50),
  "department" varchar(100),
  "position" varchar(100),
  "gender" "gender_type" NOT NULL,
  "age" integer,
  "years_of_service" integer NOT NULL,
  "guardian_name" varchar(50),
  "guardian_contact" varchar(50),
  "birth_date" timestamp,
  "birth_place" varchar(50),
  CONSTRAINT "employee_profiles_employee_id_unique" UNIQUE("employee_id")
);

CREATE TABLE IF NOT EXISTS "mental_health_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "actor_type" "actor_type" NOT NULL,
  "date" timestamp NOT NULL,
  "status" "screening_type" DEFAULT 'not_screened' NOT NULL,
  "has_counseled" boolean DEFAULT false NOT NULL,
  "notes" varchar(255)
);

CREATE TABLE IF NOT EXISTS "organizations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "type" "organization_type" NOT NULL,
  "address" varchar(255),
  "phone" varchar(50)
);

CREATE TABLE IF NOT EXISTS "partners" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "logo" varchar(255) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "psychologist_profiles" (
  "user_id" uuid PRIMARY KEY NOT NULL,
  "license_number" varchar(100),
  "specialization" varchar(255),
  "years_of_experience" integer,
  "bio" varchar(500),
  "is_external" boolean NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "student_profiles" (
  "user_id" uuid PRIMARY KEY NOT NULL,
  "grade" varchar(50),
  "classroom" varchar(50),
  "gender" "gender_type" NOT NULL,
  "nis" varchar(50),
  "iq_score" integer DEFAULT 0,
  "guardian_name" varchar(50),
  "guardian_contact" varchar(50),
  "birth_date" timestamp,
  "birth_place" varchar(50),
  "iqCategory" "iq_category"
);

CREATE TABLE IF NOT EXISTS "testimonials" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "author" varchar(255) NOT NULL,
  "quote" varchar(300) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(255) NOT NULL,
  "password" varchar(255) NOT NULL,
  "last_password" varchar(255),
  "profile_picture" varchar(255),
  "full_name" varchar(255),
  "role" "user_role" NOT NULL,
  "organization_id" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "password_changed_at" timestamp,
  "is_active" boolean DEFAULT true,
  CONSTRAINT "users_email_unique" UNIQUE("email")
);