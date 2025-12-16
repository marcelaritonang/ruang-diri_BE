ALTER TABLE "organizations" ALTER COLUMN "total_quota" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "total_quota" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "remaining_quota" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "remaining_quota" DROP NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_organization_type" ON "organizations" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_organization_remaining_quota" ON "organizations" USING btree ("remaining_quota");--> statement-breakpoint
CREATE INDEX "idx_organization_total_quota" ON "organizations" USING btree ("total_quota");--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "uq_organization_phone" UNIQUE("phone");