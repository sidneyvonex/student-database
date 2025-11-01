CREATE TABLE "appointment_attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"appointment_id" integer NOT NULL,
	"student_id" integer NOT NULL,
	"status" text NOT NULL,
	"marked_by" integer,
	"marked_at" timestamp DEFAULT now(),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"appointment_type" text NOT NULL,
	"date" timestamp NOT NULL,
	"venue" text,
	"description" text,
	"mandatory" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"credits" integer NOT NULL,
	"department_id" integer NOT NULL,
	"lecturer_id" integer,
	CONSTRAINT "courses_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"school_id" integer NOT NULL,
	"hod_id" integer
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	"semester" text NOT NULL,
	"status" text NOT NULL,
	"grade" text
);
--> statement-breakpoint
CREATE TABLE "fees" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"semester" text NOT NULL,
	"amount_billed" numeric(10, 2) NOT NULL,
	"amount_paid" numeric(10, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hostels" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"gender" text NOT NULL,
	"total_rooms" integer NOT NULL,
	"description" text,
	"location" text,
	"warden_id" integer,
	CONSTRAINT "hostels_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "metadata" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "residence_attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"date" timestamp NOT NULL,
	"status" text NOT NULL,
	"officer_id" integer,
	"hostel_name" text,
	"room_number" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "residences" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"residence_type" text NOT NULL,
	"hostel_id" integer,
	"room_id" integer,
	"bed_number" text,
	"off_campus_hostel_name" text,
	"off_campus_room_number" text,
	"off_campus_area" text,
	"allocated" boolean DEFAULT true NOT NULL,
	"allocated_at" timestamp DEFAULT now(),
	CONSTRAINT "residences_student_id_unique" UNIQUE("student_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "room_bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"request_type" text DEFAULT 'new' NOT NULL,
	"current_room_id" integer,
	"requested_hostel_id" integer,
	"requested_room_id" integer,
	"requested_bed" text,
	"requested_off_campus_hostel" text,
	"requested_off_campus_room" text,
	"requested_off_campus_area" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp DEFAULT now(),
	"approved_by" integer,
	"approved_at" timestamp,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"hostel_id" integer NOT NULL,
	"room_number" text NOT NULL,
	"floor" integer,
	"capacity" integer DEFAULT 4 NOT NULL,
	"current_occupancy" integer DEFAULT 0 NOT NULL,
	"room_type" text,
	"amenities" text,
	"status" text DEFAULT 'available' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"dean_id" integer,
	CONSTRAINT "schools_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"role_id" integer NOT NULL,
	"school_id" integer,
	"department_id" integer,
	CONSTRAINT "staff_staff_id_unique" UNIQUE("staff_id"),
	CONSTRAINT "staff_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"gender" text,
	"dob" text,
	"email" text NOT NULL,
	"phone" text,
	"address" text,
	"school_id" integer,
	"department_id" integer,
	"year_of_study" integer,
	"year_joined" integer,
	"work_study" boolean DEFAULT false NOT NULL,
	"current_semester" text,
	CONSTRAINT "students_student_id_unique" UNIQUE("student_id"),
	CONSTRAINT "students_email_unique" UNIQUE("email")
);
