CREATE TABLE "companies" (
	"company_id" varchar(100) PRIMARY KEY NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"commercial_reg" varchar(100),
	"contract_no" varchar(100),
	"details" text,
	"logo_url" text,
	"client_since" date,
	"vat_no" varchar(100),
	"cr_file" text,
	"vat_file" text,
	"national_address_file" text,
	"main_location_url" text,
	"billing_address" text,
	"contact_name" varchar(255),
	"contact_phone" varchar(50),
	"contact_email" varchar(255),
	"website_url" text,
	"user_id" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"project_id" varchar(100) PRIMARY KEY NOT NULL,
	"project_name" varchar(255) NOT NULL,
	"company_id" varchar(100),
	"location" text,
	"map_url" text,
	"po_number" varchar(100),
	"po_file" text,
	"details" text,
	"logo_url" text,
	"start_date" date,
	"end_date" date,
	"budget" numeric(15, 2),
	"total_quantities" numeric(15, 2),
	"assets_large_containers" integer,
	"assets_small_containers" integer,
	"assets_compactors" integer,
	"assets_other" integer,
	"status" varchar(50),
	"user_id" varchar(100)
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "company_id" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "project_id" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "supplier_id" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferences" text;