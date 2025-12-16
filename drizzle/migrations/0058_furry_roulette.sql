ALTER TABLE "counselings" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "counselings" ALTER COLUMN "status" DROP NOT NULL;