import { Router, type Router as RouterType } from 'express';
import { db, tables } from '../db/client';
import { eq, and, sql } from 'drizzle-orm';

const router: RouterType = Router();

// ============= HOSTELS =============

// GET all hostels
router.get('/', async (req, res) => {
    try {
        const { gender } = req.query;
        const hostels = gender
            ? await db.select().from(tables.hostels).where(eq(tables.hostels.gender, gender as string))
            : await db.select().from(tables.hostels);
        res.json(hostels);
    } catch (error) {
        console.error('Error fetching hostels:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET hostel by ID with room details
router.get('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const [hostel] = await db.select().from(tables.hostels).where(eq(tables.hostels.id, id));
        if (!hostel) {
            return res.status(404).json({ error: 'Hostel not found' });
        }

        // Get all rooms in this hostel
        const rooms = await db.select().from(tables.rooms).where(eq(tables.rooms.hostelId, id));

        res.json({ ...hostel, rooms });
    } catch (error) {
        console.error('Error fetching hostel:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============= ROOMS =============

// GET all rooms (with optional filters)
router.get('/rooms/all', async (req, res) => {
    try {
        const { hostelId, status, available } = req.query;

        const conditions = [];
        if (hostelId) conditions.push(eq(tables.rooms.hostelId, Number(hostelId)));
        if (status) conditions.push(eq(tables.rooms.status, status as string));

        let rooms = conditions.length > 0
            ? await db.select().from(tables.rooms).where(and(...conditions))
            : await db.select().from(tables.rooms);

        // Filter for available beds (occupancy < capacity)
        if (available === 'true') {
            rooms = rooms.filter(r => (r.currentOccupancy ?? 0) < (r.capacity ?? 4));
        }

        res.json(rooms);
    } catch (error) {
        console.error('Error fetching rooms:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET room by ID with occupants
router.get('/rooms/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const [room] = await db.select().from(tables.rooms).where(eq(tables.rooms.id, id));

        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        // Get all students in this room
        const occupants = await db.select({
            studentId: tables.students.studentId,
            firstName: tables.students.firstName,
            lastName: tables.students.lastName,
            gender: tables.students.gender,
            bedNumber: tables.residences.bedNumber,
            allocatedAt: tables.residences.allocatedAt
        })
            .from(tables.residences)
            .innerJoin(tables.students, eq(tables.residences.studentId, tables.students.id))
            .where(eq(tables.residences.roomId, id));

        res.json({ ...room, occupants });
    } catch (error) {
        console.error('Error fetching room:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============= ROOM BOOKINGS / TRANSFERS =============

// GET all room booking requests
router.get('/bookings/all', async (req, res) => {
    try {
        const { status, requestType } = req.query;

        let bookings = status
            ? await db.select().from(tables.roomBookings).where(eq(tables.roomBookings.status, status as string))
            : await db.select().from(tables.roomBookings);

        if (requestType) {
            bookings = bookings.filter(b => b.requestType === requestType);
        }

        res.json(bookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST - Submit room booking/transfer request
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

        // Get current residence if it's a transfer
        let currentRoomId = null;
        if (requestType === 'transfer') {
            const [currentResidence] = await db.select()
                .from(tables.residences)
                .where(eq(tables.residences.studentId, studentId));
            currentRoomId = currentResidence?.roomId ?? null;
        }

        const [booking] = await db.insert(tables.roomBookings).values({
            studentId,
            requestType: requestType || 'new',
            currentRoomId,
            requestedHostelId,
            requestedRoomId,
            requestedBed,
            requestedOffCampusHostel,
            requestedOffCampusRoom,
            requestedOffCampusArea,
            note,
            status: 'pending'
        }).returning();

        res.status(201).json(booking);
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT - Approve/Reject booking request
router.put('/bookings/:id/approve', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { status, approvedBy, note } = req.body;

        if (!status || !['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'status must be "approved" or "rejected"' });
        }

        // Get the booking
        const [booking] = await db.select().from(tables.roomBookings).where(eq(tables.roomBookings.id, id));
        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Update booking status
        const [updated] = await db.update(tables.roomBookings)
            .set({
                status,
                approvedBy,
                approvedAt: new Date(),
                note: note || booking.note
            })
            .where(eq(tables.roomBookings.id, id))
            .returning();

        // If approved, update the student's residence
        if (status === 'approved') {
            const [currentResidence] = await db.select()
                .from(tables.residences)
                .where(eq(tables.residences.studentId, booking.studentId));

            if (booking.requestedRoomId) {
                // ON-CAMPUS: Update to new room
                // First, free up old room if it's a transfer
                if (booking.requestType === 'transfer' && currentResidence?.roomId) {
                    const [oldRoom] = await db.select().from(tables.rooms).where(eq(tables.rooms.id, currentResidence.roomId));
                    if (oldRoom) {
                        await db.update(tables.rooms)
                            .set({
                                currentOccupancy: Math.max(0, (oldRoom.currentOccupancy ?? 0) - 1),
                                status: (oldRoom.currentOccupancy ?? 0) - 1 < (oldRoom.capacity ?? 4) ? 'available' : oldRoom.status
                            })
                            .where(eq(tables.rooms.id, currentResidence.roomId));
                    }
                }

                // Assign to new room
                await db.update(tables.residences)
                    .set({
                        residenceType: 'on-campus',
                        hostelId: booking.requestedHostelId,
                        roomId: booking.requestedRoomId,
                        bedNumber: booking.requestedBed,
                        offCampusHostelName: null,
                        offCampusRoomNumber: null,
                        offCampusArea: null,
                        allocatedAt: new Date()
                    })
                    .where(eq(tables.residences.studentId, booking.studentId));

                // Update new room occupancy
                const [newRoom] = await db.select().from(tables.rooms).where(eq(tables.rooms.id, booking.requestedRoomId));
                if (newRoom) {
                    const newOccupancy = (newRoom.currentOccupancy ?? 0) + 1;
                    await db.update(tables.rooms)
                        .set({
                            currentOccupancy: newOccupancy,
                            status: newOccupancy >= (newRoom.capacity ?? 4) ? 'full' : 'available'
                        })
                        .where(eq(tables.rooms.id, booking.requestedRoomId));
                }
            } else {
                // OFF-CAMPUS: Update to off-campus residence
                // Free up old room if transferring from on-campus
                if (currentResidence?.roomId) {
                    const [oldRoom] = await db.select().from(tables.rooms).where(eq(tables.rooms.id, currentResidence.roomId));
                    if (oldRoom) {
                        await db.update(tables.rooms)
                            .set({
                                currentOccupancy: Math.max(0, (oldRoom.currentOccupancy ?? 0) - 1),
                                status: (oldRoom.currentOccupancy ?? 0) - 1 < (oldRoom.capacity ?? 4) ? 'available' : oldRoom.status
                            })
                            .where(eq(tables.rooms.id, currentResidence.roomId));
                    }
                }

                await db.update(tables.residences)
                    .set({
                        residenceType: 'off-campus',
                        hostelId: null,
                        roomId: null,
                        bedNumber: null,
                        offCampusHostelName: booking.requestedOffCampusHostel,
                        offCampusRoomNumber: booking.requestedOffCampusRoom,
                        offCampusArea: booking.requestedOffCampusArea,
                        allocatedAt: new Date()
                    })
                    .where(eq(tables.residences.studentId, booking.studentId));
            }
        }

        res.json(updated);
    } catch (error) {
        console.error('Error approving booking:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============= RESIDENCE QUERIES =============

// GET all residences with full details
router.get('/residences/all', async (req, res) => {
    try {
        const { residenceType, area, hostelId } = req.query;

        // Build query
        const residences = await db.select({
            id: tables.residences.id,
            studentId: tables.students.studentId,
            firstName: tables.students.firstName,
            lastName: tables.students.lastName,
            gender: tables.students.gender,
            residenceType: tables.residences.residenceType,
            hostelName: tables.hostels.name,
            roomNumber: tables.rooms.roomNumber,
            bedNumber: tables.residences.bedNumber,
            offCampusHostelName: tables.residences.offCampusHostelName,
            offCampusRoomNumber: tables.residences.offCampusRoomNumber,
            offCampusArea: tables.residences.offCampusArea,
            allocatedAt: tables.residences.allocatedAt
        })
            .from(tables.residences)
            .innerJoin(tables.students, eq(tables.residences.studentId, tables.students.id))
            .leftJoin(tables.hostels, eq(tables.residences.hostelId, tables.hostels.id))
            .leftJoin(tables.rooms, eq(tables.residences.roomId, tables.rooms.id));

        // Apply filters
        let filtered = residences;
        if (residenceType) {
            filtered = filtered.filter(r => r.residenceType === residenceType);
        }
        if (area) {
            filtered = filtered.filter(r => r.offCampusArea === area);
        }
        if (hostelId) {
            filtered = filtered.filter(r => r.hostelName === hostelId);
        }

        res.json(filtered);
    } catch (error) {
        console.error('Error fetching residences:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET students by area (for off-campus geographical grouping)
router.get('/residences/by-area', async (req, res) => {
    try {
        const areas = await db.select({
            area: tables.residences.offCampusArea,
            count: sql<number>`COUNT(*)::int`
        })
            .from(tables.residences)
            .where(eq(tables.residences.residenceType, 'off-campus'))
            .groupBy(tables.residences.offCampusArea);

        res.json(areas);
    } catch (error) {
        console.error('Error fetching areas:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET students in specific area
router.get('/residences/area/:areaName', async (req, res) => {
    try {
        const { areaName } = req.params;

        const students = await db.select({
            studentId: tables.students.studentId,
            firstName: tables.students.firstName,
            lastName: tables.students.lastName,
            gender: tables.students.gender,
            offCampusHostelName: tables.residences.offCampusHostelName,
            offCampusRoomNumber: tables.residences.offCampusRoomNumber,
            offCampusArea: tables.residences.offCampusArea
        })
            .from(tables.residences)
            .innerJoin(tables.students, eq(tables.residences.studentId, tables.students.id))
            .where(and(
                eq(tables.residences.residenceType, 'off-campus'),
                eq(tables.residences.offCampusArea, areaName)
            ));

        res.json(students);
    } catch (error) {
        console.error('Error fetching students by area:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
