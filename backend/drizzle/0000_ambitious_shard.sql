CREATE TABLE "users" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"role" varchar(64),
	"company_id" varchar(255),
	"project_id" varchar(255),
	"supplier_id" varchar(255),
	"password" text,
	"created_at" timestamp with time zone
);
