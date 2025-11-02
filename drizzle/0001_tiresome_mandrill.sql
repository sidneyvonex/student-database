CREATE TABLE "work_study_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"academic_year" text NOT NULL,
	"semester" text NOT NULL,
	"reason" text NOT NULL,
	"financial_need" text,
	"previous_work_experience" text,
	"skills" text,
	"availability" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"applied_at" timestamp DEFAULT now(),
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"review_notes" text,
	CONSTRAINT "work_study_applications_student_id_unique" UNIQUE("student_id")
);
--> statement-breakpoint
CREATE TABLE "work_study_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"position_id" integer NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"status" text DEFAULT 'active' NOT NULL,
	"assigned_by" integer,
	"assigned_at" timestamp DEFAULT now(),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "work_study_positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"department" text NOT NULL,
	"description" text,
	"requirements" text,
	"hours_per_week" integer NOT NULL,
	"pay_rate_per_hour" numeric(10, 2) NOT NULL,
	"total_slots" integer DEFAULT 1 NOT NULL,
	"filled_slots" integer DEFAULT 0 NOT NULL,
	"supervisor_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "work_study_timesheets" (
	"id" serial PRIMARY KEY NOT NULL,
	"assignment_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"date" timestamp NOT NULL,
	"clock_in" timestamp,
	"clock_out" timestamp,
	"hours_worked" numeric(5, 2),
	"task_description" text,
	"supervisor_id" integer,
	"approved" boolean DEFAULT false,
	"approved_at" timestamp,
	"notes" text
);
