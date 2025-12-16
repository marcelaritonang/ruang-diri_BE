ALTER TABLE "counselings" ADD COLUMN "end_date" timestamp with time zone NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_counselings_end_date" ON "counselings" USING btree ("end_date");