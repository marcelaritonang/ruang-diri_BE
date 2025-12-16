-- Drop unused index
DROP INDEX "idx_counselings_actor_type";

-- Alter date column to include timezone
ALTER TABLE "counselings" 
ALTER COLUMN "date" SET DATA TYPE timestamp with time zone;

-- Add new column
ALTER TABLE "counselings" 
ADD COLUMN "psychologist_id" uuid;

-- Delete rows where psychologist_id is null
DELETE FROM "counselings" 
WHERE "psychologist_id" IS NULL;

-- Set NOT NULL constraint after cleanup
ALTER TABLE "counselings" 
ALTER COLUMN "psychologist_id" SET NOT NULL;

-- Add method column
ALTER TABLE "counselings" 
ADD COLUMN "method" "counseling_method" NOT NULL;

-- Add foreign key constraint
ALTER TABLE "counselings"
ADD CONSTRAINT "counselings_psychologist_id_psychologist_profiles_user_id_fk"
FOREIGN KEY ("psychologist_id") 
REFERENCES "public"."psychologist_profiles"("user_id") 
ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Create indexes
CREATE INDEX "idx_counselings_psychologist_id" 
ON "counselings" USING btree ("psychologist_id");

CREATE INDEX "idx_counselings_method" 
ON "counselings" USING btree ("method");

-- Drop deprecated column
ALTER TABLE "counselings" 
DROP COLUMN "actor_type";