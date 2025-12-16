ALTER TABLE "mental_health_history" RENAME COLUMN "status" TO "screening_status";--> statement-breakpoint
DROP INDEX "idx_mental_health_history_status";--> statement-breakpoint
CREATE INDEX "idx_mental_health_history_status" ON "mental_health_history" USING btree ("screening_status");