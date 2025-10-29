import { Router, type Router as RouterType } from 'express';
import { db, tables } from '../db/client';
import { eq, and } from 'drizzle-orm';

const router: RouterType = Router();

// ============= RESIDENCE ALLOCATION =============

/**
 * @swagger
 * /api/residences:
 *   get:
 *     tags: [Residences]
 *     summary: Get all residence allocations
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
 *         description: List of residence allocations
 */
router.get('/', async (req, res) => {
  try {
    const { residenceType, hostelId } = req.query;
    const where = [] as any[];
    
    if (residenceType) where.push(eq(tables.residences.residenceType, residenceType as string));
    if (hostelId) where.push(eq(tables.residences.hostelId, Number(hostelId)));
    
    const items = where.length
      ? await db.select().from(tables.residences).where(and(...where))
      : await db.select().from(tables.residences);
    
    res.json(items);
  } catch (error) {
    console.error('Error fetching residences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/residences/{studentId}:
 *   get:
 *     tags: [Residences]
 *     summary: Get residence allocation for a specific student
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
    const { studentId, residenceType, hostelId, roomId, bedNumber, offCampusAddress, offCampusArea } = req.body;
    
    if (!studentId || !residenceType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [newResidence] = await db.insert(tables.residences).values({
      studentId,
      residenceType,
      hostelId: hostelId ?? null,
      roomId: roomId ?? null,
      bedNumber: bedNumber ?? null,
      offCampusAddress: offCampusAddress ?? null,
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
    const { studentId, requestedHostel, requestedRoom, requestedArea, note } = req.body;
    
    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' });
    }

    const [booking] = await db.insert(tables.roomBookings).values({
      studentId,
      requestedHostel,
      requestedRoom,
      requestedArea,
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

export default router;
