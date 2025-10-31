import { Router, type Router as RouterType } from 'express';
import { db, tables } from '../db/client';
import { eq, and, sql } from 'drizzle-orm';

const router: RouterType = Router();

// ============= APPOINTMENTS =============

/**
 * @swagger
 * /api/appointments:
 *   get:
 *     tags: [Appointments]
 *     summary: Get appointments
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [church, assembly]
 *       - in: query
 *         name: mandatory
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of appointments
 */
router.get('/', async (req, res) => {
  try {
    const { type, mandatory } = req.query;
    const where = [] as any[];

    if (type) where.push(eq(tables.appointments.appointmentType, type as string));
    if (mandatory !== undefined) where.push(eq(tables.appointments.mandatory, mandatory === 'true'));

    const items = where.length
      ? await db.select().from(tables.appointments).where(and(...where))
      : await db.select().from(tables.appointments);

    res.json(items);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/appointments/attendance/summary:
 *   get:
 *     tags: [Appointments]
 *     summary: Get attendance summary for all students
 *     responses:
 *       200:
 *         description: List of all students with their attendance summaries
 */
router.get('/attendance/summary', async (req, res) => {
  try {
    const summaries = await db.select({
      studentId: tables.students.id,
      studentName: sql<string>`${tables.students.firstName} || ' ' || ${tables.students.lastName}`,
      studentNumber: tables.students.studentId,
      totalAppointments: sql<number>`COUNT(${tables.appointmentAttendance.id})`,
      attended: sql<number>`COUNT(CASE WHEN ${tables.appointmentAttendance.status} = 'present' THEN 1 END)`,
      absent: sql<number>`COUNT(CASE WHEN ${tables.appointmentAttendance.status} = 'absent' THEN 1 END)`,
      excused: sql<number>`COUNT(CASE WHEN ${tables.appointmentAttendance.status} = 'excused' THEN 1 END)`,
      attendanceRate: sql<number>`ROUND(COALESCE(COUNT(CASE WHEN ${tables.appointmentAttendance.status} = 'present' THEN 1 END)::numeric * 100 / NULLIF(COUNT(${tables.appointmentAttendance.id}), 0), 0), 2)`
    })
      .from(tables.students)
      .leftJoin(tables.appointmentAttendance, eq(tables.students.id, tables.appointmentAttendance.studentId))
      .groupBy(tables.students.id, tables.students.firstName, tables.students.lastName, tables.students.studentId)
      .orderBy(tables.students.lastName, tables.students.firstName);

    res.json(summaries);
  } catch (error) {
    console.error('Error fetching attendance summaries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/appointments/attendance/student/{studentId}:
 *   get:
 *     tags: [Appointments]
 *     summary: Get attendance summary for a student by student ID or student number
 *     description: |
 *       Retrieve attendance summary for a student using either:
 *       - Numeric ID (internal database ID, e.g., 1, 2, 3)
 *       - Student ID string (e.g., student001, student002)
 *       
 *       **Returns:**
 *       - Total appointments attended
 *       - Number of appointments attended, absent, and excused
 *       - Overall attendance rate percentage
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID (e.g., student001) or numeric ID (e.g., 1)
 *         example: student001
 *     responses:
 *       200:
 *         description: Student attendance summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AttendanceSummary'
 *             example:
 *               studentId: student001
 *               totalAppointments: 40
 *               attended: 35
 *               absent: 3
 *               excused: 2
 *               attendanceRate: 87.5
 *       404:
 *         description: Student not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/attendance/student/:studentId', async (req, res) => {
  try {
    const studentIdParam = req.params.studentId;

    // First, try to find the student by studentId (string) or by numeric ID
    let student;

    // Check if it's a numeric ID
    if (!isNaN(Number(studentIdParam))) {
      const numericId = Number(studentIdParam);
      [student] = await db.select().from(tables.students).where(eq(tables.students.id, numericId));
    } else {
      // It's a string studentId like "student001"
      [student] = await db.select().from(tables.students).where(eq(tables.students.studentId, studentIdParam));
    }

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Now get the attendance summary using the student's internal ID
    const summary = await db.select({
      studentId: tables.appointmentAttendance.studentId,
      studentNumber: tables.students.studentId,
      studentName: sql<string>`${tables.students.firstName} || ' ' || ${tables.students.lastName}`,
      totalAppointments: sql<number>`COUNT(*)`,
      attended: sql<number>`COUNT(CASE WHEN ${tables.appointmentAttendance.status} = 'present' THEN 1 END)`,
      absent: sql<number>`COUNT(CASE WHEN ${tables.appointmentAttendance.status} = 'absent' THEN 1 END)`,
      excused: sql<number>`COUNT(CASE WHEN ${tables.appointmentAttendance.status} = 'excused' THEN 1 END)`,
      attendanceRate: sql<number>`ROUND(COUNT(CASE WHEN ${tables.appointmentAttendance.status} = 'present' THEN 1 END)::numeric * 100 / COUNT(*), 2)`
    })
      .from(tables.appointmentAttendance)
      .innerJoin(tables.students, eq(tables.appointmentAttendance.studentId, tables.students.id))
      .where(eq(tables.appointmentAttendance.studentId, student.id))
      .groupBy(tables.appointmentAttendance.studentId, tables.students.studentId, tables.students.firstName, tables.students.lastName);

    if (summary.length === 0) {
      return res.json({
        studentId: student.id,
        studentNumber: student.studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        totalAppointments: 0,
        attended: 0,
        absent: 0,
        excused: 0,
        attendanceRate: 0
      });
    }

    res.json(summary[0]);
  } catch (error) {
    console.error('Error fetching student attendance summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/appointments/student/{studentId}/with-attendance:
 *   get:
 *     tags: [Appointments]
 *     summary: Get all appointments with attendance status for a specific student
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID (e.g., student001) or numeric ID
 *     responses:
 *       200:
 *         description: List of appointments with attendance status
 */
router.get('/student/:studentId/with-attendance', async (req, res) => {
  try {
    const studentIdParam = req.params.studentId;

    // Find the student
    let student;
    if (!isNaN(Number(studentIdParam))) {
      const numericId = Number(studentIdParam);
      [student] = await db.select().from(tables.students).where(eq(tables.students.id, numericId));
    } else {
      [student] = await db.select().from(tables.students).where(eq(tables.students.studentId, studentIdParam));
    }

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get all appointments with attendance status for this student
    const appointmentsWithAttendance = await db.select({
      id: tables.appointments.id,
      title: tables.appointments.title,
      appointmentType: tables.appointments.appointmentType,
      date: tables.appointments.date,
      venue: tables.appointments.venue,
      description: tables.appointments.description,
      mandatory: tables.appointments.mandatory,
      attendanceId: tables.appointmentAttendance.id,
      attendanceStatus: tables.appointmentAttendance.status,
      attendanceNotes: tables.appointmentAttendance.notes,
      markedAt: tables.appointmentAttendance.markedAt
    })
      .from(tables.appointments)
      .leftJoin(
        tables.appointmentAttendance,
        and(
          eq(tables.appointments.id, tables.appointmentAttendance.appointmentId),
          eq(tables.appointmentAttendance.studentId, student.id)
        )
      )
      .orderBy(tables.appointments.date);

    res.json(appointmentsWithAttendance);
  } catch (error) {
    console.error('Error fetching appointments with attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/appointments/student/{studentId}/missed:
 *   get:
 *     tags: [Appointments]
 *     summary: Get missed appointments breakdown for a student
 *     description: Returns count of missed church and assembly appointments
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID (e.g., student001) or numeric ID
 *     responses:
 *       200:
 *         description: Missed appointments breakdown
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 studentId:
 *                   type: string
 *                 studentName:
 *                   type: string
 *                 church:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     attended:
 *                       type: integer
 *                     missed:
 *                       type: integer
 *                     missedRate:
 *                       type: number
 *                 assembly:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     attended:
 *                       type: integer
 *                     missed:
 *                       type: integer
 *                     missedRate:
 *                       type: number
 */
router.get('/student/:studentId/missed', async (req, res) => {
  try {
    const studentIdParam = req.params.studentId;

    // Find the student
    let student;
    if (!isNaN(Number(studentIdParam))) {
      const numericId = Number(studentIdParam);
      [student] = await db.select().from(tables.students).where(eq(tables.students.id, numericId));
    } else {
      [student] = await db.select().from(tables.students).where(eq(tables.students.studentId, studentIdParam));
    }

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get church appointments with attendance
    const churchStats = await db.select({
      total: sql<number>`COUNT(DISTINCT ${tables.appointments.id})`,
      attended: sql<number>`COUNT(CASE WHEN ${tables.appointmentAttendance.status} = 'present' THEN 1 END)`,
      absent: sql<number>`COUNT(CASE WHEN ${tables.appointmentAttendance.status} = 'absent' THEN 1 END)`,
      excused: sql<number>`COUNT(CASE WHEN ${tables.appointmentAttendance.status} = 'excused' THEN 1 END)`
    })
      .from(tables.appointments)
      .leftJoin(
        tables.appointmentAttendance,
        and(
          eq(tables.appointments.id, tables.appointmentAttendance.appointmentId),
          eq(tables.appointmentAttendance.studentId, student.id)
        )
      )
      .where(eq(tables.appointments.appointmentType, 'church'));

    // Get assembly appointments with attendance
    const assemblyStats = await db.select({
      total: sql<number>`COUNT(DISTINCT ${tables.appointments.id})`,
      attended: sql<number>`COUNT(CASE WHEN ${tables.appointmentAttendance.status} = 'present' THEN 1 END)`,
      absent: sql<number>`COUNT(CASE WHEN ${tables.appointmentAttendance.status} = 'absent' THEN 1 END)`,
      excused: sql<number>`COUNT(CASE WHEN ${tables.appointmentAttendance.status} = 'excused' THEN 1 END)`
    })
      .from(tables.appointments)
      .leftJoin(
        tables.appointmentAttendance,
        and(
          eq(tables.appointments.id, tables.appointmentAttendance.appointmentId),
          eq(tables.appointmentAttendance.studentId, student.id)
        )
      )
      .where(eq(tables.appointments.appointmentType, 'assembly'));

    const churchData = churchStats[0];
    const assemblyData = assemblyStats[0];

    const churchMissed = Number(churchData.total) - Number(churchData.attended);
    const assemblyMissed = Number(assemblyData.total) - Number(assemblyData.attended);

    const result = {
      studentId: student.studentId,
      studentName: `${student.firstName} ${student.lastName}`,
      church: {
        total: Number(churchData.total),
        attended: Number(churchData.attended),
        missed: churchMissed,
        absent: Number(churchData.absent),
        excused: Number(churchData.excused),
        missedRate: Number(churchData.total) > 0 ? Number(((churchMissed / Number(churchData.total)) * 100).toFixed(2)) : 0
      },
      assembly: {
        total: Number(assemblyData.total),
        attended: Number(assemblyData.attended),
        missed: assemblyMissed,
        absent: Number(assemblyData.absent),
        excused: Number(assemblyData.excused),
        missedRate: Number(assemblyData.total) > 0 ? Number(((assemblyMissed / Number(assemblyData.total)) * 100).toFixed(2)) : 0
      }
    };

    res.json(result);
  } catch (error) {
    console.error('Error fetching missed appointments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/appointments/attendance/dashboard:
 *   get:
 *     tags: [Appointments]
 *     summary: Get overall attendance dashboard stats
 *     description: Returns attendance statistics for all students, grouped by church and assembly
 *     responses:
 *       200:
 *         description: Dashboard statistics
 */
router.get('/attendance/dashboard', async (req, res) => {
  try {
    // Overall church statistics
    const churchStats = await db.select({
      totalAppointments: sql<number>`COUNT(DISTINCT ${tables.appointments.id})`,
      totalAttendanceRecords: sql<number>`COUNT(${tables.appointmentAttendance.id})`,
      totalPresent: sql<number>`COUNT(CASE WHEN ${tables.appointmentAttendance.status} = 'present' THEN 1 END)`,
      totalAbsent: sql<number>`COUNT(CASE WHEN ${tables.appointmentAttendance.status} = 'absent' THEN 1 END)`,
      totalExcused: sql<number>`COUNT(CASE WHEN ${tables.appointmentAttendance.status} = 'excused' THEN 1 END)`
    })
      .from(tables.appointments)
      .leftJoin(tables.appointmentAttendance, eq(tables.appointments.id, tables.appointmentAttendance.appointmentId))
      .where(eq(tables.appointments.appointmentType, 'church'));

    // Overall assembly statistics
    const assemblyStats = await db.select({
      totalAppointments: sql<number>`COUNT(DISTINCT ${tables.appointments.id})`,
      totalAttendanceRecords: sql<number>`COUNT(${tables.appointmentAttendance.id})`,
      totalPresent: sql<number>`COUNT(CASE WHEN ${tables.appointmentAttendance.status} = 'present' THEN 1 END)`,
      totalAbsent: sql<number>`COUNT(CASE WHEN ${tables.appointmentAttendance.status} = 'absent' THEN 1 END)`,
      totalExcused: sql<number>`COUNT(CASE WHEN ${tables.appointmentAttendance.status} = 'excused' THEN 1 END)`
    })
      .from(tables.appointments)
      .leftJoin(tables.appointmentAttendance, eq(tables.appointments.id, tables.appointmentAttendance.appointmentId))
      .where(eq(tables.appointments.appointmentType, 'assembly'));

    // Total students
    const studentCount = await db.select({
      count: sql<number>`COUNT(*)`
    }).from(tables.students);

    const churchData = churchStats[0];
    const assemblyData = assemblyStats[0];

    const result = {
      totalStudents: Number(studentCount[0].count),
      church: {
        totalAppointments: Number(churchData.totalAppointments),
        totalRecords: Number(churchData.totalAttendanceRecords),
        present: Number(churchData.totalPresent),
        absent: Number(churchData.totalAbsent),
        excused: Number(churchData.totalExcused),
        attendanceRate: Number(churchData.totalAttendanceRecords) > 0
          ? Number(((Number(churchData.totalPresent) / Number(churchData.totalAttendanceRecords)) * 100).toFixed(2))
          : 0
      },
      assembly: {
        totalAppointments: Number(assemblyData.totalAppointments),
        totalRecords: Number(assemblyData.totalAttendanceRecords),
        present: Number(assemblyData.totalPresent),
        absent: Number(assemblyData.totalAbsent),
        excused: Number(assemblyData.totalExcused),
        attendanceRate: Number(assemblyData.totalAttendanceRecords) > 0
          ? Number(((Number(assemblyData.totalPresent) / Number(assemblyData.totalAttendanceRecords)) * 100).toFixed(2))
          : 0
      }
    };

    res.json(result);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/appointments/{id}:
 *   get:
 *     tags: [Appointments]
 *     summary: Get appointment by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Appointment details
 */
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [record] = await db.select().from(tables.appointments).where(eq(tables.appointments.id, id));

    if (!record) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(record);
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/appointments:
 *   post:
 *     tags: [Appointments]
 *     summary: Create new appointment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - appointmentType
 *               - date
 *               - venue
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Sunday Morning Service"
 *               appointmentType:
 *                 type: string
 *                 enum: [church, assembly]
 *                 description: Only church and assembly appointments are allowed
 *               date:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-11-03T09:00:00.000Z"
 *               venue:
 *                 type: string
 *                 example: "Baraton Union Church(BUC)"
 *               description:
 *                 type: string
 *               mandatory:
 *                 type: boolean
 *                 default: true
 *               createdBy:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Appointment created successfully
 *       400:
 *         description: Invalid appointment type (only church and assembly allowed)
 */
router.post('/', async (req, res) => {
  try {
    const { title, appointmentType, date, venue, description, mandatory, createdBy } = req.body;

    // Validate appointment type
    if (!['church', 'assembly'].includes(appointmentType)) {
      return res.status(400).json({
        error: 'Invalid appointment type. Only "church" and "assembly" are allowed.'
      });
    }

    // Validate required fields
    if (!title || !appointmentType || !date || !venue) {
      return res.status(400).json({
        error: 'Missing required fields: title, appointmentType, date, and venue are required.'
      });
    }

    const [record] = await db.insert(tables.appointments).values({
      title,
      appointmentType,
      date: new Date(date),
      venue,
      description,
      mandatory: mandatory ?? true,
      createdBy
    }).returning();

    res.status(201).json(record);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/appointments/{id}:
 *   put:
 *     tags: [Appointments]
 *     summary: Update appointment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Appointment updated successfully
 */
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updates = req.body;

    if (updates.date) {
      updates.date = new Date(updates.date);
    }

    const [record] = await db.update(tables.appointments)
      .set(updates)
      .where(eq(tables.appointments.id, id))
      .returning();

    if (!record) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(record);
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/appointments/{id}:
 *   delete:
 *     tags: [Appointments]
 *     summary: Delete appointment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Appointment deleted successfully
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    // Delete attendance records first
    await db.delete(tables.appointmentAttendance).where(eq(tables.appointmentAttendance.appointmentId, id));

    const [record] = await db.delete(tables.appointments)
      .where(eq(tables.appointments.id, id))
      .returning();

    if (!record) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= APPOINTMENT ATTENDANCE =============

/**
 * @swagger
 * /api/appointments/{id}/attendance:
 *   get:
 *     tags: [Appointments]
 *     summary: Get attendance for an appointment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of attendance records for the appointment
 */
router.get('/:id/attendance', async (req, res) => {
  try {
    const appointmentId = Number(req.params.id);

    const records = await db.select({
      id: tables.appointmentAttendance.id,
      studentId: tables.appointmentAttendance.studentId,
      studentName: sql<string>`${tables.students.firstName} || ' ' || ${tables.students.lastName}`,
      status: tables.appointmentAttendance.status,
      notes: tables.appointmentAttendance.notes,
      markedAt: tables.appointmentAttendance.markedAt
    })
      .from(tables.appointmentAttendance)
      .leftJoin(tables.students, eq(tables.appointmentAttendance.studentId, tables.students.id))
      .where(eq(tables.appointmentAttendance.appointmentId, appointmentId));

    res.json(records);
  } catch (error) {
    console.error('Error fetching appointment attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/appointments/{id}/attendance:
 *   post:
 *     tags: [Appointments]
 *     summary: Mark attendance for an appointment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - status
 *               - markedBy
 *             properties:
 *               studentId:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [present, absent, excused]
 *               markedBy:
 *                 type: integer
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Attendance marked successfully
 */
router.post('/:id/attendance', async (req, res) => {
  try {
    const appointmentId = Number(req.params.id);
    const { studentId, status, markedBy, notes } = req.body;

    const [record] = await db.insert(tables.appointmentAttendance).values({
      appointmentId,
      studentId,
      status,
      markedBy,
      notes
    }).returning();

    res.status(201).json(record);
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
