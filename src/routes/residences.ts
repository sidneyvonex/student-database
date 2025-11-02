import { Router, type Router as RouterType } from 'express';
import { db, tables } from '../db/client';
import { eq, and, desc } from 'drizzle-orm';

const router: RouterType = Router();

// ============= RESIDENCE ALLOCATION =============

/**
 * @swagger
 * /api/residences:
 *   get:
 *     tags: [Residences]
 *     summary: Get all residence allocations with hostel and room details
 *     parameters:
 *       - in: query
 *         name: residenceType
 *         schema:
 *           type: string
 *           enum: [on-campus, off-campus]
 *       - in: query
 *         name: hostelName
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of residence allocations with hostel name and room number
 */
router.get('/', async (req, res) => {
  try {
    const { residenceType, hostelId } = req.query;
    
    // Build query with joins to get hostelName and roomNumber
    let query = db.select({
      id: tables.residences.id,
      studentId: tables.residences.studentId,
      residenceType: tables.residences.residenceType,
      hostelId: tables.residences.hostelId,
      roomId: tables.residences.roomId,
      bedNumber: tables.residences.bedNumber,
      hostelName: tables.hostels.name,
      roomNumber: tables.rooms.roomNumber,
      offCampusHostelName: tables.residences.offCampusHostelName,
      offCampusRoomNumber: tables.residences.offCampusRoomNumber,
      offCampusArea: tables.residences.offCampusArea,
      allocated: tables.residences.allocated,
      allocatedAt: tables.residences.allocatedAt
    })
    .from(tables.residences)
    .leftJoin(tables.hostels, eq(tables.residences.hostelId, tables.hostels.id))
    .leftJoin(tables.rooms, eq(tables.residences.roomId, tables.rooms.id))
    .$dynamic();

    // Apply filters
    const where = [] as any[];
    if (residenceType) where.push(eq(tables.residences.residenceType, residenceType as string));
    if (hostelId) where.push(eq(tables.residences.hostelId, Number(hostelId)));

    const items = where.length ? await query.where(and(...where)) : await query;

    res.json(items);
  } catch (error) {
    console.error('Error fetching residences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/residences/student/{studentId}:
 *   get:
 *     tags: [Residences]
 *     summary: Get residence by student identifier (e.g., student001)
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Student identifier like student001, student002, etc.
 *     responses:
 *       200:
 *         description: Student residence information with full details
 *       404:
 *         description: Student or residence not found
 */
router.get('/student/:studentId', async (req, res) => {
  try {
    const studentId = req.params.studentId; // This is the string like "student001"

    // First, find the student to get their numeric ID
    const [student] = await db.select()
      .from(tables.students)
      .where(eq(tables.students.studentId, studentId));

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Then get their residence using the numeric ID with full details
    const [residence] = await db.select({
      id: tables.residences.id,
      studentId: tables.students.studentId,
      studentName: tables.students.firstName,
      studentLastName: tables.students.lastName,
      residenceType: tables.residences.residenceType,
      hostelName: tables.hostels.name,
      hostelLocation: tables.hostels.location,
      roomNumber: tables.rooms.roomNumber,
      bedNumber: tables.residences.bedNumber,
      roomCapacity: tables.rooms.capacity,
      roomOccupancy: tables.rooms.currentOccupancy,
      offCampusHostelName: tables.residences.offCampusHostelName,
      offCampusRoomNumber: tables.residences.offCampusRoomNumber,
      offCampusArea: tables.residences.offCampusArea,
      allocatedAt: tables.residences.allocatedAt
    })
      .from(tables.residences)
      .innerJoin(tables.students, eq(tables.residences.studentId, tables.students.id))
      .leftJoin(tables.hostels, eq(tables.residences.hostelId, tables.hostels.id))
      .leftJoin(tables.rooms, eq(tables.residences.roomId, tables.rooms.id))
      .where(eq(tables.students.studentId, studentId));

    if (!residence) {
      return res.status(404).json({ error: 'Residence not found for this student' });
    }

    res.json(residence);
  } catch (error) {
    console.error('Error fetching residence by studentId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/residences/roommates/{studentId}:
 *   get:
 *     tags: [Residences]
 *     summary: Get roommates for a student (only for on-campus students)
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Student identifier like student001
 *     responses:
 *       200:
 *         description: List of roommates with their details
 *       404:
 *         description: Student not found or not on-campus
 */
router.get('/roommates/:studentId', async (req, res) => {
  try {
    const studentId = req.params.studentId;

    // Get the student
    const [student] = await db.select()
      .from(tables.students)
      .where(eq(tables.students.studentId, studentId));

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get student's residence
    const [residence] = await db.select({
      residenceType: tables.residences.residenceType,
      hostelId: tables.residences.hostelId,
      roomId: tables.residences.roomId,
      hostelName: tables.hostels.name,
      roomNumber: tables.rooms.roomNumber
    })
    .from(tables.residences)
    .leftJoin(tables.hostels, eq(tables.residences.hostelId, tables.hostels.id))
    .leftJoin(tables.rooms, eq(tables.residences.roomId, tables.rooms.id))
    .where(eq(tables.residences.studentId, student.id));

    if (!residence) {
      return res.status(404).json({ error: 'Residence not found for this student' });
    }

    // Check if on-campus
    if (residence.residenceType !== 'on-campus' || !residence.roomId) {
      return res.json({
        studentId: student.studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        residenceType: residence.residenceType,
        message: 'This student is not on-campus. Roommates information is only available for on-campus students.',
        roommates: []
      });
    }

    // Get all students in the same room (excluding the requesting student)
    const roommates = await db.select({
      studentId: tables.students.studentId,
      firstName: tables.students.firstName,
      lastName: tables.students.lastName,
      gender: tables.students.gender,
      email: tables.students.email,
      phone: tables.students.phone,
      yearOfStudy: tables.students.yearOfStudy,
      bedNumber: tables.residences.bedNumber,
      departmentName: tables.departments.name,
      schoolName: tables.schools.name
    })
    .from(tables.residences)
    .innerJoin(tables.students, eq(tables.residences.studentId, tables.students.id))
    .leftJoin(tables.departments, eq(tables.students.departmentId, tables.departments.id))
    .leftJoin(tables.schools, eq(tables.students.schoolId, tables.schools.id))
    .where(
      and(
        eq(tables.residences.roomId, residence.roomId),
        eq(tables.residences.residenceType, 'on-campus')
      )
    );

    // Filter out the requesting student
    const roommatesList = roommates.filter(r => r.studentId !== studentId);

    res.json({
      studentId: student.studentId,
      studentName: `${student.firstName} ${student.lastName}`,
      residenceType: residence.residenceType,
      hostelName: residence.hostelName,
      roomNumber: residence.roomNumber,
      totalRoommates: roommatesList.length,
      roommates: roommatesList
    });
  } catch (error) {
    console.error('Error fetching roommates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/residences/{studentId}:
 *   get:
 *     tags: [Residences]
 *     summary: Get residence allocation for a specific student (by numeric ID)
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Student residence information
 *       404:
 *         description: Residence not found
 */
router.get('/:studentId', async (req, res) => {
  try {
    const studentId = Number(req.params.studentId);
    const [residence] = await db.select()
      .from(tables.residences)
      .where(eq(tables.residences.studentId, studentId));

    if (!residence) {
      return res.status(404).json({ error: 'Residence not found' });
    }

    res.json(residence);
  } catch (error) {
    console.error('Error fetching residence:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/residences:
 *   post:
 *     tags: [Residences]
 *     summary: Allocate residence to a student
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - residenceType
 *     responses:
 *       201:
 *         description: Residence allocated successfully
 */
router.post('/', async (req, res) => {
  try {
    const {
      studentId,
      residenceType,
      hostelId,
      roomId,
      bedNumber,
      offCampusHostelName,
      offCampusRoomNumber,
      offCampusArea
    } = req.body;

    if (!studentId || !residenceType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [newResidence] = await db.insert(tables.residences).values({
      studentId,
      residenceType,
      hostelId: hostelId ?? null,
      roomId: roomId ?? null,
      bedNumber: bedNumber ?? null,
      offCampusHostelName: offCampusHostelName ?? null,
      offCampusRoomNumber: offCampusRoomNumber ?? null,
      offCampusArea: offCampusArea ?? null,
      allocated: true,
      allocatedAt: new Date(),
    }).returning();

    res.status(201).json(newResidence);
  } catch (error) {
    console.error('Error creating residence:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/residences/{studentId}:
 *   put:
 *     tags: [Residences]
 *     summary: Update residence allocation
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Residence updated successfully
 */
router.put('/:studentId', async (req, res) => {
  try {
    const studentId = Number(req.params.studentId);
    const updateData = req.body;

    const [updated] = await db.update(tables.residences)
      .set(updateData)
      .where(eq(tables.residences.studentId, studentId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Residence not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating residence:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/residences/{studentId}:
 *   delete:
 *     tags: [Residences]
 *     summary: Delete residence allocation
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Residence deleted successfully
 */
router.delete('/:studentId', async (req, res) => {
  try {
    const studentId = Number(req.params.studentId);

    const [deleted] = await db.delete(tables.residences)
      .where(eq(tables.residences.studentId, studentId))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Residence not found' });
    }

    res.json({ message: 'Residence deleted successfully', residence: deleted });
  } catch (error) {
    console.error('Error deleting residence:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= ROOM BOOKING REQUESTS =============

/**
 * @swagger
 * /api/residences/bookings:
 *   get:
 *     tags: [Room Bookings]
 *     summary: Get all room booking requests
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *     responses:
 *       200:
 *         description: List of room booking requests
 */
router.get('/bookings', async (req, res) => {
  try {
    const { status } = req.query;

    const items = status
      ? await db.select().from(tables.roomBookings).where(eq(tables.roomBookings.status, status as string))
      : await db.select().from(tables.roomBookings);

    res.json(items);
  } catch (error) {
    console.error('Error fetching room bookings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/residences/bookings:
 *   post:
 *     tags: [Room Bookings]
 *     summary: Submit a room booking request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *     responses:
 *       201:
 *         description: Room booking request submitted
 */
router.post('/bookings', async (req, res) => {
  try {
    const {
      studentId,
      requestType,
      requestedHostelId,
      requestedRoomId,
      requestedBed,
      requestedOffCampusHostel,
      requestedOffCampusRoom,
      requestedOffCampusArea,
      note
    } = req.body;

    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' });
    }

    const [booking] = await db.insert(tables.roomBookings).values({
      studentId,
      requestType: requestType || 'new',
      currentRoomId: null,
      requestedHostelId: requestedHostelId ?? null,
      requestedRoomId: requestedRoomId ?? null,
      requestedBed: requestedBed ?? null,
      requestedOffCampusHostel: requestedOffCampusHostel ?? null,
      requestedOffCampusRoom: requestedOffCampusRoom ?? null,
      requestedOffCampusArea: requestedOffCampusArea ?? null,
      note,
      status: 'pending',
      requestedAt: new Date(),
    }).returning();

    res.status(201).json(booking);
  } catch (error) {
    console.error('Error creating room booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/residences/bookings/{id}:
 *   get:
 *     tags: [Room Bookings]
 *     summary: Get room booking by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Room booking details
 */
router.get('/bookings/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [booking] = await db.select().from(tables.roomBookings).where(eq(tables.roomBookings.id, id));

    if (!booking) {
      return res.status(404).json({ error: 'Room booking not found' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Error fetching room booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/residences/bookings/{id}/approve:
 *   put:
 *     tags: [Room Bookings]
 *     summary: Approve or reject a room booking request
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
 *               - status
 *               - approvedBy
 *     responses:
 *       200:
 *         description: Booking status updated
 */
router.put('/bookings/:id/approve', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, approvedBy, note } = req.body;

    if (!status || !approvedBy) {
      return res.status(400).json({ error: 'status and approvedBy are required' });
    }

    const [updated] = await db.update(tables.roomBookings)
      .set({
        status,
        approvedBy,
        approvedAt: new Date(),
        note,
      })
      .where(eq(tables.roomBookings.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Room booking not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating room booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= RESIDENCE ATTENDANCE (ROOM CHECK-INS) =============

/**
 * @swagger
 * /api/residences/attendance/student/{studentId}:
 *   get:
 *     tags: [Residences]
 *     summary: Get residence attendance history for a student by their studentId (e.g., student001)
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Student identifier like student001
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of records to return
 *     responses:
 *       200:
 *         description: List of residence attendance records
 *       404:
 *         description: Student not found
 */
router.get('/attendance/student/:studentId', async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const limit = parseInt(req.query.limit as string) || 30;

    // First, find the student to get their numeric ID
    const [student] = await db.select()
      .from(tables.students)
      .where(eq(tables.students.studentId, studentId));

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get attendance records
    const attendanceRecords = await db.select({
      id: tables.residenceAttendance.id,
      date: tables.residenceAttendance.date,
      status: tables.residenceAttendance.status,
      hostelName: tables.residenceAttendance.hostelName,
      roomNumber: tables.residenceAttendance.roomNumber,
      notes: tables.residenceAttendance.notes,
      officerName: tables.staff.firstName,
      officerLastName: tables.staff.lastName
    })
      .from(tables.residenceAttendance)
      .leftJoin(tables.staff, eq(tables.residenceAttendance.officerId, tables.staff.id))
      .where(eq(tables.residenceAttendance.studentId, student.id))
      .orderBy(desc(tables.residenceAttendance.date))
      .limit(limit);

    res.json({
      studentId: student.studentId,
      studentName: `${student.firstName} ${student.lastName}`,
      totalRecords: attendanceRecords.length,
      attendance: attendanceRecords
    });
  } catch (error) {
    console.error('Error fetching residence attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/residences/attendance/date/{date}:
 *   get:
 *     tags: [Residences]
 *     summary: Get all residence attendance for a specific date
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date in YYYY-MM-DD format
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [present, absent]
 *         description: Filter by attendance status
 *     responses:
 *       200:
 *         description: List of residence attendance records for the date
 */
router.get('/attendance/date/:date', async (req, res) => {
  try {
    const dateStr = req.params.date;
    const status = req.query.status as string;

    // Parse the date
    const targetDate = new Date(dateStr);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    // Set time to start and end of day for the query
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    let query = db.select({
      id: tables.residenceAttendance.id,
      studentId: tables.students.studentId,
      studentName: tables.students.firstName,
      studentLastName: tables.students.lastName,
      date: tables.residenceAttendance.date,
      status: tables.residenceAttendance.status,
      hostelName: tables.residenceAttendance.hostelName,
      roomNumber: tables.residenceAttendance.roomNumber,
      notes: tables.residenceAttendance.notes
    })
      .from(tables.residenceAttendance)
      .innerJoin(tables.students, eq(tables.residenceAttendance.studentId, tables.students.id))
      .$dynamic();

    // Apply filters
    if (status) {
      query = query.where(
        and(
          eq(tables.residenceAttendance.status, status)
        )
      );
    }

    const records = await query;

    // Filter by date range (since we can't easily do BETWEEN with timestamps in this query)
    const filteredRecords = records.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= startOfDay && recordDate <= endOfDay;
    });

    res.json({
      date: dateStr,
      totalRecords: filteredRecords.length,
      presentCount: filteredRecords.filter(r => r.status === 'present').length,
      absentCount: filteredRecords.filter(r => r.status === 'absent').length,
      attendance: filteredRecords
    });
  } catch (error) {
    console.error('Error fetching residence attendance by date:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
