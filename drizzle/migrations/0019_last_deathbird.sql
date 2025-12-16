ALTER TABLE "schedules" ALTER COLUMN "updated_by" DROP NOT NULL;

BEGIN;

ALTER TABLE "schedules"
ALTER COLUMN "start_date_time" TYPE timestamp
USING start_date_time::timestamp;

ALTER TABLE "schedules"
ALTER COLUMN "end_date_time" TYPE timestamp
USING end_date_time::timestamp;

COMMIT;
