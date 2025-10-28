import { Router } from 'express';
import { db, tables } from '../db/client';
import { eq, and } from 'drizzle-orm';

const router = Router();

// ============= CHURCH ATTENDANCE =============

/**
 * @swagger
 * /api/attendance/church:
 *   get:
 *     tags: [Church Attendance]
 *     summary: Get church attendance records
 *     parameters:
 *       - in: query
 *         name: studentId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of church attendance records
 */
router.get('/church', async (req, res) => {
  try {
    const { studentId } = req.query;
    const where = [] as any[];
    
    if (studentId) where.push(eq(tables.churchAttendance.studentId, Number(studentId)));
    
    const items = where.length
      ? await db.select().from(tables.churchAttendance).where(and(...where))
      : await db.select().from(tables.churchAttendance);
    
    res.json(items);
  } catch (error) {
    console.error('Error fetching church attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/attendance/church/{id}:
 *   get:
 *     tags: [Church Attendance]
 *     summary: Get church attendance record by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Church attendance record details
 */
router.get('/church/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [record] = await db.select().from(tables.churchAttendance).where(eq(tables.churchAttendance.id, id));
    
    if (!record) {
      return res.status(404).json({ error: 'Church attendance record not found' });
    }
    
    res.json(record);
  } catch (error) {
    console.error('Error fetching church attendance record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/attendance/church:
 *   post:
 *     tags: [Church Attendance]
 *     summary: Mark church attendance
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - date
 *               - status
 *     responses:
 *       201:
 *         description: Attendance marked successfully
 */
router.post('/church', async (req, res) => {
  try {
    const { studentId, date, status, notes, createdBy } = req.body;
    
    if (!studentId || !date || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [attendance] = await db.insert(tables.churchAttendance).values({
      studentId,
      date: new Date(date),
      status,
      notes,
      createdBy,
    }).returning();

    res.status(201).json(attendance);
  } catch (error) {
    console.error('Error marking church attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/attendance/church/{id}:
 *   put:
 *     tags: [Church Attendance]
 *     summary: Update church attendance record
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Church attendance updated successfully
 */
router.put('/church/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updateData = req.body;
    
    const [updated] = await db.update(tables.churchAttendance)
      .set(updateData)
      .where(eq(tables.churchAttendance.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Church attendance record not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating church attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/attendance/church/{id}:
 *   delete:
 *     tags: [Church Attendance]
 *     summary: Delete church attendance record
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Church attendance deleted successfully
 */
router.delete('/church/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    const [deleted] = await db.delete(tables.churchAttendance)
      .where(eq(tables.churchAttendance.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Church attendance record not found' });
    }

    res.json({ message: 'Church attendance deleted successfully', record: deleted });
  } catch (error) {
    console.error('Error deleting church attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= RESIDENCE ATTENDANCE =============

/**
 * @swagger
 * /api/attendance/residence:
 *   get:
 *     tags: [Residence Attendance]
 *     summary: Get residence attendance records
 *     parameters:
 *       - in: query
 *         name: studentId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: hostelName
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of residence attendance records
 */
router.get('/residence', async (req, res) => {
  try {
    const { studentId, hostelName } = req.query;
    const where = [] as any[];
    
    if (studentId) where.push(eq(tables.residenceAttendance.studentId, Number(studentId)));
    if (hostelName) where.push(eq(tables.residenceAttendance.hostelName, hostelName as string));
    
    const items = where.length
      ? await db.select().from(tables.residenceAttendance).where(and(...where))
      : await db.select().from(tables.residenceAttendance);
    
    res.json(items);
  } catch (error) {
    console.error('Error fetching residence attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/attendance/residence/{id}:
 *   get:
 *     tags: [Residence Attendance]
 *     summary: Get residence attendance record by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Residence attendance record details
 */
router.get('/residence/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [record] = await db.select().from(tables.residenceAttendance).where(eq(tables.residenceAttendance.id, id));
    
    if (!record) {
      return res.status(404).json({ error: 'Residence attendance record not found' });
    }
    
    res.json(record);
  } catch (error) {
    console.error('Error fetching residence attendance record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/attendance/residence:
 *   post:
 *     tags: [Residence Attendance]
 *     summary: Mark residence attendance
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - date
 *               - status
 *     responses:
 *       201:
 *         description: Attendance marked successfully
 */
router.post('/residence', async (req, res) => {
  try {
    const { studentId, date, status, officerId, hostelName, roomNumber, notes } = req.body;
    
    if (!studentId || !date || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [attendance] = await db.insert(tables.residenceAttendance).values({
      studentId,
      date: new Date(date),
      status,
      officerId,
      hostelName,
      roomNumber,
      notes,
    }).returning();

    res.status(201).json(attendance);
  } catch (error) {
    console.error('Error marking residence attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/attendance/residence/{id}:
 *   put:
 *     tags: [Residence Attendance]
 *     summary: Update residence attendance record
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Residence attendance updated successfully
 */
router.put('/residence/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updateData = req.body;
    
    const [updated] = await db.update(tables.residenceAttendance)
      .set(updateData)
      .where(eq(tables.residenceAttendance.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Residence attendance record not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating residence attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/attendance/residence/{id}:
 *   delete:
 *     tags: [Residence Attendance]
 *     summary: Delete residence attendance record
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Residence attendance deleted successfully
 */
router.delete('/residence/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    const [deleted] = await db.delete(tables.residenceAttendance)
      .where(eq(tables.residenceAttendance.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Residence attendance record not found' });
    }

    res.json({ message: 'Residence attendance deleted successfully', record: deleted });
  } catch (error) {
    console.error('Error deleting residence attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
