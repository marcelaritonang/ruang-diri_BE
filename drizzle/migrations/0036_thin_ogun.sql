ALTER TABLE "notifications" DROP CONSTRAINT "notifications_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_updated_by_users_id_fk";
--> statement-breakpoint
DROP INDEX "idx_notifications_scheduled_at";--> statement-breakpoint
CREATE INDEX "idx_notifications_sub_type" ON "notifications" USING btree ("sub_type");--> statement-breakpoint
CREATE INDEX "idx_notifications_created_at" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_read_at" ON "notifications" USING btree ("read_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_type_sub_type" ON "notifications" USING btree ("type","sub_type");--> statement-breakpoint
CREATE INDEX "idx_notifications_status_sub_type" ON "notifications" USING btree ("status","sub_type");--> statement-breakpoint
CREATE INDEX "idx_notifications_recipient_type" ON "notifications" USING btree ("recipient_id","type");--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN "scheduled_at";--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN "sent_at";--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN "deleted_at";--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN "created_by";--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN "updated_by";--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN "updated_at";