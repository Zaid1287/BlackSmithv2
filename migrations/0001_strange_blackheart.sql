ALTER TABLE "journeys" ADD COLUMN "revenue" numeric(15, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "journeys" ADD COLUMN "net_profit" numeric(15, 2) DEFAULT '0';