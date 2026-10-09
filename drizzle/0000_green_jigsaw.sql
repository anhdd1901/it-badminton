CREATE TYPE "public"."member_role" AS ENUM('admin', 'subadmin', 'member');--> statement-breakpoint
CREATE TABLE "attendances" (
	"match_day_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"recorded_by" uuid NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	CONSTRAINT "attendances_match_day_id_member_id_pk" PRIMARY KEY("match_day_id","member_id")
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone NOT NULL,
	CONSTRAINT "auth_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "draft_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_day_id" uuid NOT NULL,
	"attendee_key" text NOT NULL,
	"diagram_id" text NOT NULL,
	"assignments" jsonb NOT NULL,
	"matches" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "draft_schedules_day_key" UNIQUE("match_day_id","attendee_key")
);
--> statement-breakpoint
CREATE TABLE "elo_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"elo_tenths" integer NOT NULL,
	"adjusted_by" uuid NOT NULL,
	"at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"username" text PRIMARY KEY NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "match_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day" date NOT NULL,
	"finalized_at" timestamp with time zone,
	CONSTRAINT "match_days_day_unique" UNIQUE("day")
);
--> statement-breakpoint
CREATE TABLE "match_results" (
	"scheduled_match_id" uuid PRIMARY KEY NOT NULL,
	"score_a" integer NOT NULL,
	"score_b" integer NOT NULL,
	"entered_by" uuid NOT NULL,
	"entered_at" timestamp with time zone NOT NULL,
	"version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "member_role" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"initial_elo_tenths" integer NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "members_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "official_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_day_id" uuid NOT NULL,
	"attendee_key" text NOT NULL,
	"diagram_id" text NOT NULL,
	"assignments" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "official_schedules_match_day_id_unique" UNIQUE("match_day_id")
);
--> statement-breakpoint
CREATE TABLE "scheduled_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"official_schedule_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"a1" uuid NOT NULL,
	"a2" uuid NOT NULL,
	"b1" uuid NOT NULL,
	"b2" uuid NOT NULL,
	CONSTRAINT "scheduled_matches_schedule_number" UNIQUE("official_schedule_id","number")
);
--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_match_day_id_match_days_id_fk" FOREIGN KEY ("match_day_id") REFERENCES "public"."match_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_recorded_by_members_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_schedules" ADD CONSTRAINT "draft_schedules_match_day_id_match_days_id_fk" FOREIGN KEY ("match_day_id") REFERENCES "public"."match_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elo_adjustments" ADD CONSTRAINT "elo_adjustments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elo_adjustments" ADD CONSTRAINT "elo_adjustments_adjusted_by_members_id_fk" FOREIGN KEY ("adjusted_by") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_scheduled_match_id_scheduled_matches_id_fk" FOREIGN KEY ("scheduled_match_id") REFERENCES "public"."scheduled_matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_entered_by_members_id_fk" FOREIGN KEY ("entered_by") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "official_schedules" ADD CONSTRAINT "official_schedules_match_day_id_match_days_id_fk" FOREIGN KEY ("match_day_id") REFERENCES "public"."match_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_matches" ADD CONSTRAINT "scheduled_matches_official_schedule_id_official_schedules_id_fk" FOREIGN KEY ("official_schedule_id") REFERENCES "public"."official_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_matches" ADD CONSTRAINT "scheduled_matches_a1_members_id_fk" FOREIGN KEY ("a1") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_matches" ADD CONSTRAINT "scheduled_matches_a2_members_id_fk" FOREIGN KEY ("a2") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_matches" ADD CONSTRAINT "scheduled_matches_b1_members_id_fk" FOREIGN KEY ("b1") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_matches" ADD CONSTRAINT "scheduled_matches_b2_members_id_fk" FOREIGN KEY ("b2") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "members_single_admin" ON "members" USING btree ("role") WHERE "members"."role" = 'admin';