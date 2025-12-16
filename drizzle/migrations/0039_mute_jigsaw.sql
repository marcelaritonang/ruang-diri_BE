ALTER TABLE "notifications" DROP CONSTRAINT "notifications_organization_id_organizations_id_fk";
--> statement-breakpoint
DROP INDEX "idx_notifications_organization_id";--> statement-breakpoint
DROP INDEX "idx_notifications_org_recipient";--> statement-breakpoint
ALTER TABLE "notifications" DROP COLUMN "organization_id";