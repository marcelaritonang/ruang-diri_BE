ALTER TABLE "organizations" DROP CONSTRAINT "uq_organization_phone";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "address" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" varchar(50);--> statement-breakpoint
CREATE INDEX "idx_users_phone" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_users_address" ON "users" USING btree ("address");--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "address";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "phone";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_phone_unique" UNIQUE("phone");