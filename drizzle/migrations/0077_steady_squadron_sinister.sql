-- Step 1: Add a temporary column with jsonb type
ALTER TABLE "psychologist_profiles" ADD COLUMN "field_of_expertise_new" jsonb;--> statement-breakpoint

-- Step 2: Copy data, converting existing values to jsonb arrays
UPDATE "psychologist_profiles" 
SET "field_of_expertise_new" = 
  CASE 
    WHEN "field_of_expertise" IS NULL OR "field_of_expertise" = '' THEN NULL
    ELSE jsonb_build_array("field_of_expertise")
  END;--> statement-breakpoint

-- Step 3: Drop the old column
ALTER TABLE "psychologist_profiles" DROP COLUMN "field_of_expertise";--> statement-breakpoint

-- Step 4: Rename the new column
ALTER TABLE "psychologist_profiles" RENAME COLUMN "field_of_expertise_new" TO "field_of_expertise";--> statement-breakpoint

-- Step 5: Create the index
CREATE INDEX "idx_psychologist_field_of_expertise" ON "psychologist_profiles" USING btree ("field_of_expertise");