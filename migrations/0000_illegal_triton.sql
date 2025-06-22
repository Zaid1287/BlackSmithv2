CREATE TABLE "emi_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"vehicle_id" integer,
	"amount" numeric(15, 2) NOT NULL,
	"paid_date" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "emi_reset_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"total_amount_reset" numeric(15, 2) NOT NULL,
	"reset_date" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"journey_id" integer,
	"category" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"description" text,
	"is_company_secret" boolean DEFAULT false,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "journeys" (
	"id" serial PRIMARY KEY NOT NULL,
	"driver_id" integer,
	"vehicle_id" integer,
	"license_plate" text NOT NULL,
	"destination" text NOT NULL,
	"pouch" numeric(15, 2) NOT NULL,
	"security" numeric(15, 2) DEFAULT '0',
	"status" text DEFAULT 'active' NOT NULL,
	"start_time" timestamp DEFAULT now(),
	"end_time" timestamp,
	"current_location" jsonb,
	"speed" integer DEFAULT 0,
	"distance_covered" numeric(15, 2) DEFAULT '0',
	"total_expenses" numeric(15, 2) DEFAULT '0',
	"balance" numeric(15, 2) DEFAULT '0',
	"photos" jsonb
);
--> statement-breakpoint
CREATE TABLE "salary_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"amount" numeric(15, 2) NOT NULL,
	"description" text,
	"transaction_type" text DEFAULT 'payment' NOT NULL,
	"paid_at" timestamp DEFAULT now(),
	"month" text NOT NULL,
	"year" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'driver' NOT NULL,
	"salary" numeric(10, 2) DEFAULT '9000',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" serial PRIMARY KEY NOT NULL,
	"license_plate" text NOT NULL,
	"model" text NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"monthly_emi" numeric(15, 2) DEFAULT '0',
	"added_on" timestamp DEFAULT now(),
	CONSTRAINT "vehicles_license_plate_unique" UNIQUE("license_plate")
);
--> statement-breakpoint
ALTER TABLE "emi_payments" ADD CONSTRAINT "emi_payments_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_driver_id_users_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_payments" ADD CONSTRAINT "salary_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;