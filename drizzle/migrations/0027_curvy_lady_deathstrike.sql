ALTER TABLE "schedules"
  ALTER COLUMN "location"
  SET DATA TYPE location_counseling_type
  USING location::location_counseling_type;

UPDATE "schedules"
SET "location" = (
  CASE
    WHEN random() < 0.33 THEN 'online'::location_counseling_type
    WHEN random() < 0.66 THEN 'offline'::location_counseling_type
    ELSE 'organization'::location_counseling_type
  END
);

ALTER TABLE "schedules"
  ALTER COLUMN "location" SET NOT NULL;
