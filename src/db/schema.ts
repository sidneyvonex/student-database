import { pgTable, serial, text, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // Chancellor, Vice Chancellor, Dean, HOD, Lecturer, Student, Bursar, Registrar
});

export const schools = pgTable("schools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  deanId: integer("dean_id"), // FK to staff
});

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  schoolId: integer("school_id").notNull(), // FK to schools
  hodId: integer("hod_id"), // FK to staff
});

export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  staffId: text("staff_id").notNull().unique(), // e.g., chancellor001, dean001, hod001, lecturer001
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  roleId: integer("role_id").notNull(),
  schoolId: integer("school_id"),
  departmentId: integer("department_id"),
});

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  studentId: text("student_id").notNull().unique(), // e.g., student001, student002
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  gender: text("gender"),
  dob: text("dob"),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  address: text("address"),
  schoolId: integer("school_id"),
  departmentId: integer("department_id"),
  yearOfStudy: integer("year_of_study"), // 1..4
  yearJoined: integer("year_joined"),
  workStudy: boolean("work_study").notNull().default(false),
  currentSemester: text("current_semester"), // e.g., 2025-1
});

export const hostels = pgTable("hostels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // New Men Dorm, Old Men Dorm, Box Ladies Hostel, Annex Ladies Hostel
  gender: text("gender").notNull(), // male, female
  totalRooms: integer("total_rooms").notNull(),
  description: text("description"),
  location: text("location"),
  warden: integer("warden_id"), // FK to staff
});

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  hostelId: integer("hostel_id").notNull(), // FK to hostels
  roomNumber: text("room_number").notNull(), // e.g., "1A01", "2B05"
  floor: integer("floor"),
  capacity: integer("capacity").notNull().default(2), // How many students can fit
  currentOccupancy: integer("current_occupancy").notNull().default(0), // How many currently assigned
  roomType: text("room_type"), // single, double, triple
  amenities: text("amenities"), // e.g., "Bathroom, Study Desk, Wardrobe"
  status: text("status").notNull().default("available"), // available, full, maintenance
});

export const residences = pgTable("residences", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().unique(), // FK to students.id
  residenceType: text("residence_type").notNull(), // 'on-campus' or 'off-campus'
  hostelId: integer("hostel_id"), // FK to hostels (if on-campus)
  roomId: integer("room_id"), // FK to rooms (if on-campus)
  bedNumber: text("bed_number"), // e.g., "Bed A", "Bed B"
  offCampusAddress: text("off_campus_address"), // if off-campus
  offCampusArea: text("off_campus_area"), // Chemundu, Tilalwa, Baracee, Kapasbet
  allocated: boolean("allocated").notNull().default(true),
  allocatedAt: timestamp("allocated_at").defaultNow(),
});

export const roomBookings = pgTable("room_bookings", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  requestedHostel: text("requested_hostel"),
  requestedRoom: text("requested_room"),
  requestedArea: text("requested_area"),
  status: text("status").notNull().default('pending'), // pending, approved, rejected
  requestedAt: timestamp("requested_at").defaultNow(),
  approvedBy: integer("approved_by"), // staff id
  approvedAt: timestamp("approved_at"),
  note: text("note"),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(), // e.g., "Church Service", "Assembly"
  appointmentType: text("appointment_type").notNull(), // church, assembly
  date: timestamp("date").notNull(),
  venue: text("venue"), // e.g., "Baraton Union Church(BUC)", "Auditorium", "Amphitheatre"
  description: text("description"),
  mandatory: boolean("mandatory").notNull().default(true),
  createdBy: integer("created_by"), // staff id that created appointment
  createdAt: timestamp("created_at").defaultNow(),
});

export const appointmentAttendance = pgTable("appointment_attendance", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").notNull(), // FK to appointments
  studentId: integer("student_id").notNull(),
  status: text("status").notNull(), // present, absent, excused
  markedBy: integer("marked_by"), // staff id who marked attendance
  markedAt: timestamp("marked_at").defaultNow(),
  notes: text("notes"),
});

export const residenceAttendance = pgTable("residence_attendance", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  date: timestamp("date").notNull(),
  status: text("status").notNull(), // present, absent
  officerId: integer("officer_id"), // staff id who marked
  hostelName: text("hostel_name"),
  roomNumber: text("room_number"),
  notes: text("notes"),
});

export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  credits: integer("credits").notNull(),
  departmentId: integer("department_id").notNull(),
  lecturerId: integer("lecturer_id"), // staff id
});

export const enrollments = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  courseId: integer("course_id").notNull(),
  semester: text("semester").notNull(), // 2025-1, 2025-2
  status: text("status").notNull(), // registered, dropped, completed
  grade: text("grade"),
});

export const fees = pgTable("fees", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull(),
  semester: text("semester").notNull(),
  amountBilled: numeric("amount_billed", { precision: 10, scale: 2 }).notNull(),
  amountPaid: numeric("amount_paid", { precision: 10, scale: 2 }).notNull().default("0"),
});

export const metadata = pgTable("metadata", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type Role = typeof roles.$inferSelect;
export type School = typeof schools.$inferSelect;
export type Department = typeof departments.$inferSelect;
export type Staff = typeof staff.$inferSelect;
export type Student = typeof students.$inferSelect;
export type Hostel = typeof hostels.$inferSelect;
export type Room = typeof rooms.$inferSelect;
export type Residence = typeof residences.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type AppointmentAttendance = typeof appointmentAttendance.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type Enrollment = typeof enrollments.$inferSelect;
export type Fee = typeof fees.$inferSelect;
export type ResidenceAttendance = typeof residenceAttendance.$inferSelect;
