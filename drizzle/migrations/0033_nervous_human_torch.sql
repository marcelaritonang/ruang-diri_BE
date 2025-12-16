BEGIN;

-- 1) Remove any soft-deleted schedules
DELETE FROM "schedules"
WHERE "deleted_at" IS NOT NULL;

-- 2) Drop the foreign-key constraint (if it exists)
ALTER TABLE "schedules"
DROP CONSTRAINT IF EXISTS "schedules_deleted_by_users_id_fk";

-- 3) Drop the soft-delete columns
ALTER TABLE "schedules"
  DROP COLUMN IF EXISTS "deleted_at",
  DROP COLUMN IF EXISTS "deleted_by";

COMMIT;
