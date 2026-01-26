CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_favour" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"post_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"create_time" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_thumb" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"post_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"create_time" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"title" text,
	"content" text,
	"tags" text,
	"thumb_num" integer DEFAULT 0 NOT NULL,
	"favour_num" integer DEFAULT 0 NOT NULL,
	"user_id" bigint NOT NULL,
	"create_time" timestamp DEFAULT now() NOT NULL,
	"update_time" timestamp DEFAULT now() NOT NULL,
	"is_delete" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_bank_question" (
	"id" serial PRIMARY KEY NOT NULL,
	"question_bank_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"create_time" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_bank" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"picture" text,
	"user_id" integer NOT NULL,
	"question_count" integer DEFAULT 0,
	"edit_time" timestamp,
	"create_time" timestamp DEFAULT now() NOT NULL,
	"update_time" timestamp DEFAULT now() NOT NULL,
	"is_delete" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"tags" text,
	"answer" text,
	"user_id" integer NOT NULL,
	"question_bank_id" integer,
	"edit_time" timestamp,
	"create_time" timestamp DEFAULT now() NOT NULL,
	"update_time" timestamp DEFAULT now() NOT NULL,
	"is_delete" boolean DEFAULT false NOT NULL,
	"embedding" vector(1536)
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_account" varchar(256) NOT NULL,
	"user_password" varchar(64) NOT NULL,
	"email" varchar(256),
	"email_verified" boolean DEFAULT false NOT NULL,
	"phone" varchar(20),
	"union_id" varchar(256),
	"mp_open_id" varchar(256),
	"user_name" varchar(256),
	"user_avatar" varchar(1024),
	"user_profile" varchar(512),
	"user_role" varchar(256) DEFAULT 'user' NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"last_login_ip" varchar(64),
	"last_login_time" timestamp,
	"create_time" timestamp DEFAULT now() NOT NULL,
	"update_time" timestamp DEFAULT now() NOT NULL,
	"is_delete" boolean DEFAULT false NOT NULL,
	CONSTRAINT "user_user_account_unique" UNIQUE("user_account"),
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_favour" ADD CONSTRAINT "post_favour_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_favour" ADD CONSTRAINT "post_favour_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_thumb" ADD CONSTRAINT "post_thumb_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_thumb" ADD CONSTRAINT "post_thumb_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_bank_question" ADD CONSTRAINT "question_bank_question_question_bank_id_question_bank_id_fk" FOREIGN KEY ("question_bank_id") REFERENCES "public"."question_bank"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_bank_question" ADD CONSTRAINT "question_bank_question_question_id_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_bank_question" ADD CONSTRAINT "question_bank_question_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question" ADD CONSTRAINT "question_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question" ADD CONSTRAINT "question_question_bank_id_question_bank_id_fk" FOREIGN KEY ("question_bank_id") REFERENCES "public"."question_bank"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_post_favour" ON "post_favour" USING btree ("post_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_post_thumb" ON "post_thumb" USING btree ("post_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_post_user_id" ON "post" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_post_create_time" ON "post" USING btree ("create_time");--> statement-breakpoint
CREATE UNIQUE INDEX "uk_qb_question" ON "question_bank_question" USING btree ("question_bank_id","question_id");--> statement-breakpoint
CREATE INDEX "idx_question_bank_user_id" ON "question_bank" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_question_user_id" ON "question" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_question_bank_id" ON "question" USING btree ("question_bank_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_account" ON "user" USING btree ("user_account");--> statement-breakpoint
CREATE INDEX "idx_user_email" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_user_phone" ON "user" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_user_role" ON "user" USING btree ("user_role");--> statement-breakpoint
CREATE INDEX "idx_user_status" ON "user" USING btree ("status");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");