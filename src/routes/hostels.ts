import { Router } from 'express';
import { db, tables } from '../db/client';
import { eq, and, sql } from 'drizzle-orm';

const router = Router();

// ============= HOSTELS =============

/**
 * @swagger
 * /api/hostels:
 *   get:
 *     tags: [Hostels]
 *     summary: Get all hostels
 *     parameters:
 *       - in: query
 *         name: gender
 *         schema:
 *           type: string
 *           enum: [male, female]
 *     responses:
 *       200:
 *         description: List of hostels with occupancy statistics
 */
router.get('/', async (req, res) => {
  try {
    const { gender } = req.query;
    const where = gender ? [eq(tables.hostels.gender, gender as string)] : [];
    
    const hostels = await db.select({
      id: tables.hostels.id,
      name: tables.hostels.name,
      gender: tables.hostels.gender,
      totalRooms: tables.hostels.totalRooms,
      location: tables.hostels.location,
      description: tables.hostels.description,
      warden: tables.hostels.warden,
      wardenName: sql<string>`${tables.staff.firstName} || ' ' || ${tables.staff.lastName}`,
      occupiedRooms: sql<number>`COUNT(DISTINCT CASE WHEN ${tables.rooms.currentOccupancy} > 0 THEN ${tables.rooms.id} END)`,
      totalCapacity: sql<number>`COALESCE(SUM(${tables.rooms.capacity}), 0)`,
      currentOccupancy: sql<number>`COALESCE(SUM(${tables.rooms.currentOccupancy}), 0)`
    })
    .from(tables.hostels)
    .leftJoin(tables.staff, eq(tables.hostels.warden, tables.staff.id))
    .leftJoin(tables.rooms, eq(tables.hostels.id, tables.rooms.hostelId))
    .where(where.length ? and(...where) : undefined)
    .groupBy(tables.hostels.id, tables.staff.firstName, tables.staff.lastName);
    
    res.json(hostels);
  } catch (error) {
    console.error('Error fetching hostels:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/hostels/{id}:
 *   get:
 *     tags: [Hostels]
 *     summary: Get hostel by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Hostel details
 */
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [hostel] = await db.select({
      id: tables.hostels.id,
      name: tables.hostels.name,
      gender: tables.hostels.gender,
      totalRooms: tables.hostels.totalRooms,
      location: tables.hostels.location,
      description: tables.hostels.description,
      warden: tables.hostels.warden,
      wardenName: sql<string>`${tables.staff.firstName} || ' ' || ${tables.staff.lastName}`,
      wardenEmail: tables.staff.email,
      occupiedRooms: sql<number>`COUNT(DISTINCT CASE WHEN ${tables.rooms.currentOccupancy} > 0 THEN ${tables.rooms.id} END)`,
      totalCapacity: sql<number>`COALESCE(SUM(${tables.rooms.capacity}), 0)`,
      currentOccupancy: sql<number>`COALESCE(SUM(${tables.rooms.currentOccupancy}), 0)`
    })
    .from(tables.hostels)
    .leftJoin(tables.staff, eq(tables.hostels.warden, tables.staff.id))
    .leftJoin(tables.rooms, eq(tables.hostels.id, tables.rooms.hostelId))
    .where(eq(tables.hostels.id, id))
    .groupBy(tables.hostels.id, tables.staff.firstName, tables.staff.lastName, tables.staff.email);
    
    if (!hostel) {
      return res.status(404).json({ error: 'Hostel not found' });
    }
    
    res.json(hostel);
  } catch (error) {
    console.error('Error fetching hostel:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/hostels:
 *   post:
 *     tags: [Hostels]
 *     summary: Create new hostel
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - gender
 *               - totalRooms
 *             properties:
 *               name:
 *                 type: string
 *               gender:
 *                 type: string
 *                 enum: [male, female]
 *               totalRooms:
 *                 type: integer
 *               location:
 *                 type: string
 *               description:
 *                 type: string
 *               warden:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Hostel created successfully
 */
router.post('/', async (req, res) => {
  try {
    const { name, gender, totalRooms, location, description, warden } = req.body;
    
    const [hostel] = await db.insert(tables.hostels).values({
      name,
      gender,
      totalRooms,
      location,
      description,
      warden
    }).returning();
    
    res.status(201).json(hostel);
  } catch (error) {
    console.error('Error creating hostel:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/hostels/{id}:
 *   put:
 *     tags: [Hostels]
 *     summary: Update hostel
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
 *         description: Hostel updated successfully
 */
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updates = req.body;
    
    const [hostel] = await db.update(tables.hostels)
      .set(updates)
      .where(eq(tables.hostels.id, id))
      .returning();
    
    if (!hostel) {
      return res.status(404).json({ error: 'Hostel not found' });
    }
    
    res.json(hostel);
  } catch (error) {
    console.error('Error updating hostel:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/hostels/{id}:
 *   delete:
 *     tags: [Hostels]
 *     summary: Delete hostel
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Hostel deleted successfully
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    const [hostel] = await db.delete(tables.hostels)
      .where(eq(tables.hostels.id, id))
      .returning();
    
    if (!hostel) {
      return res.status(404).json({ error: 'Hostel not found' });
    }
    
    res.json({ message: 'Hostel deleted successfully' });
  } catch (error) {
    console.error('Error deleting hostel:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= ROOMS =============

/**
 * @swagger
 * /api/hostels/{id}/rooms:
 *   get:
 *     tags: [Hostels]
 *     summary: Get rooms in a hostel
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [available, full, maintenance]
 *       - in: query
 *         name: floor
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of rooms in the hostel
 */
router.get('/:id/rooms', async (req, res) => {
  try {
    const hostelId = Number(req.params.id);
    const { status, floor } = req.query;
    const where = [eq(tables.rooms.hostelId, hostelId)] as any[];
    
    if (status) where.push(eq(tables.rooms.status, status as string));
    if (floor) where.push(eq(tables.rooms.floor, Number(floor)));
    
    const rooms = await db.select()
      .from(tables.rooms)
      .where(and(...where))
      .orderBy(tables.rooms.floor, tables.rooms.roomNumber);
    
    res.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/hostels/rooms/{roomId}:
 *   get:
 *     tags: [Hostels]
 *     summary: Get room details with occupants
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Room details with list of current occupants
 */
router.get('/rooms/:roomId', async (req, res) => {
  try {
    const roomId = Number(req.params.roomId);
    
    // Get room details
    const [room] = await db.select({
      id: tables.rooms.id,
      hostelId: tables.rooms.hostelId,
      hostelName: tables.hostels.name,
      roomNumber: tables.rooms.roomNumber,
      floor: tables.rooms.floor,
      capacity: tables.rooms.capacity,
      currentOccupancy: tables.rooms.currentOccupancy,
      roomType: tables.rooms.roomType,
      amenities: tables.rooms.amenities,
      status: tables.rooms.status
    })
    .from(tables.rooms)
    .leftJoin(tables.hostels, eq(tables.rooms.hostelId, tables.hostels.id))
    .where(eq(tables.rooms.id, roomId));
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    // Get occupants
    const occupants = await db.select({
      studentId: tables.students.id,
      studentNumber: tables.students.studentId,
      firstName: tables.students.firstName,
      lastName: tables.students.lastName,
      email: tables.students.email,
      phone: tables.students.phone,
      bedNumber: tables.residences.bedNumber,
      yearOfStudy: tables.students.yearOfStudy,
      department: tables.departments.name
    })
    .from(tables.residences)
    .leftJoin(tables.students, eq(tables.residences.studentId, tables.students.id))
    .leftJoin(tables.departments, eq(tables.students.departmentId, tables.departments.id))
    .where(eq(tables.residences.roomId, roomId));
    
    res.json({
      ...room,
      occupants
    });
  } catch (error) {
    console.error('Error fetching room details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/hostels/rooms:
 *   post:
 *     tags: [Hostels]
 *     summary: Create new room
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - hostelId
 *               - roomNumber
 *               - capacity
 *             properties:
 *               hostelId:
 *                 type: integer
 *               roomNumber:
 *                 type: string
 *               floor:
 *                 type: integer
 *               capacity:
 *                 type: integer
 *               roomType:
 *                 type: string
 *               amenities:
 *                 type: string
 *     responses:
 *       201:
 *         description: Room created successfully
 */
router.post('/rooms', async (req, res) => {
  try {
    const { hostelId, roomNumber, floor, capacity, roomType, amenities } = req.body;
    
    const [room] = await db.insert(tables.rooms).values({
      hostelId,
      roomNumber,
      floor,
      capacity: capacity ?? 2,
      currentOccupancy: 0,
      roomType: roomType ?? 'double',
      amenities,
      status: 'available'
    }).returning();
    
    res.status(201).json(room);
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/hostels/rooms/{roomId}:
 *   put:
 *     tags: [Hostels]
 *     summary: Update room
 *     parameters:
 *       - in: path
 *         name: roomId
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
 *         description: Room updated successfully
 */
router.put('/rooms/:roomId', async (req, res) => {
  try {
    const roomId = Number(req.params.roomId);
    const updates = req.body;
    
    const [room] = await db.update(tables.rooms)
      .set(updates)
      .where(eq(tables.rooms.id, roomId))
      .returning();
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    res.json(room);
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/hostels/rooms/{roomId}/allocate:
 *   post:
 *     tags: [Hostels]
 *     summary: Allocate student to room
 *     parameters:
 *       - in: path
 *         name: roomId
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
 *             properties:
 *               studentId:
 *                 type: integer
 *               bedNumber:
 *                 type: string
 *     responses:
 *       201:
 *         description: Student allocated successfully
 */
router.post('/rooms/:roomId/allocate', async (req, res) => {
  try {
    const roomId = Number(req.params.roomId);
    const { studentId, bedNumber } = req.body;
    
    // Check room capacity
    const [room] = await db.select()
      .from(tables.rooms)
      .where(eq(tables.rooms.id, roomId));
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if ((room.currentOccupancy ?? 0) >= (room.capacity ?? 2)) {
      return res.status(400).json({ error: 'Room is full' });
    }
    
    // Check if student already has a residence
    const [existing] = await db.select()
      .from(tables.residences)
      .where(eq(tables.residences.studentId, studentId));
    
    if (existing) {
      return res.status(400).json({ error: 'Student already has a residence allocated' });
    }
    
    // Get student gender to verify hostel match
    const [student] = await db.select()
      .from(tables.students)
      .where(eq(tables.students.id, studentId));
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const [hostel] = await db.select()
      .from(tables.hostels)
      .where(eq(tables.hostels.id, room.hostelId));
    
    if (!hostel) {
      return res.status(404).json({ error: 'Hostel not found' });
    }
    
    // Check gender match
    const studentGender = student.gender?.toLowerCase();
    if (studentGender !== hostel.gender) {
      return res.status(400).json({ 
        error: `Gender mismatch: ${hostel.name} is for ${hostel.gender} students` 
      });
    }
    
    // Allocate student
    const [residence] = await db.insert(tables.residences).values({
      studentId,
      residenceType: 'on-campus',
      hostelId: room.hostelId,
      roomId,
      bedNumber: bedNumber ?? (room.currentOccupancy === 0 ? 'Bed A' : 'Bed B'),
      offCampusAddress: null,
      offCampusArea: null
    }).returning();
    
    // Update room occupancy
    await db.update(tables.rooms)
      .set({ 
        currentOccupancy: (room.currentOccupancy ?? 0) + 1,
        status: (room.currentOccupancy ?? 0) + 1 >= (room.capacity ?? 2) ? 'full' : 'available'
      })
      .where(eq(tables.rooms.id, roomId));
    
    res.status(201).json(residence);
  } catch (error) {
    console.error('Error allocating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/hostels/rooms/{roomId}/deallocate/{studentId}:
 *   delete:
 *     tags: [Hostels]
 *     summary: Remove student from room
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Student removed successfully
 */
router.delete('/rooms/:roomId/deallocate/:studentId', async (req, res) => {
  try {
    const roomId = Number(req.params.roomId);
    const studentId = Number(req.params.studentId);
    
    const [residence] = await db.delete(tables.residences)
      .where(and(
        eq(tables.residences.roomId, roomId),
        eq(tables.residences.studentId, studentId)
      ))
      .returning();
    
    if (!residence) {
      return res.status(404).json({ error: 'Student not found in this room' });
    }
    
    // Update room occupancy
    const [room] = await db.select().from(tables.rooms).where(eq(tables.rooms.id, roomId));
    if (room) {
      await db.update(tables.rooms)
        .set({ 
          currentOccupancy: Math.max(0, (room.currentOccupancy ?? 0) - 1),
          status: 'available'
        })
        .where(eq(tables.rooms.id, roomId));
    }
    
    res.json({ message: 'Student removed from room successfully' });
  } catch (error) {
    console.error('Error deallocating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
