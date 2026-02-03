CREATE TABLE "question_favour" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"question_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"create_time" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_practice" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"question_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"done_at" timestamp DEFAULT now() NOT NULL,
	"score" integer,
	"create_time" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "post_favour" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "post_thumb" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "post" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "question_bank_question" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "question_bank" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "question" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "user_account" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "user_password" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "question_favour" ADD CONSTRAINT "question_favour_question_id_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_favour" ADD CONSTRAINT "question_favour_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_practice" ADD CONSTRAINT "question_practice_question_id_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_practice" ADD CONSTRAINT "question_practice_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uk_question_favour" ON "question_favour" USING btree ("question_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_question_practice_user_id" ON "question_practice" USING btree ("user_id");