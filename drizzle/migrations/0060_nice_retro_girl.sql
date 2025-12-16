ALTER TABLE "psychologist_availability" ALTER COLUMN "day_of_week" DROP NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_psychologist_day" ON "psychologist_availability" USING btree ("psychologist_id","day_of_week");--> statement-breakpoint
CREATE INDEX "idx_psychologist_availability_day_start_end" ON "psychologist_availability" USING btree ("day_of_week","start_time","end_time");--> statement-breakpoint
ALTER TABLE "psychologist_availability" ADD CONSTRAINT "uniq_psychologist_day_start_end" UNIQUE("psychologist_id","day_of_week","start_time","end_time");