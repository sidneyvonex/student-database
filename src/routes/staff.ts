import { Router } from 'express';
import { db, tables } from '../db/client';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * @swagger
 * /api/staff:
 *   get:
 *     tags: [Staff]
 *     summary: Get all staff members
 *     description: Retrieve a list of all staff members including Chancellor, Vice Chancellor, Deans, HODs, and Lecturers
 *     responses:
 *       200:
 *         description: List of staff members
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Staff'
 */
router.get('/', async (_req, res) => {
  try {
    const items = await db.select().from(tables.staff);
    res.json(items);
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/staff/{id}:
 *   get:
 *     tags: [Staff]
 *     summary: Get staff member by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Staff member details
 *       404:
 *         description: Staff member not found
 */
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [staff] = await db.select().from(tables.staff).where(eq(tables.staff.id, id));
    
    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found' });
    }
    
    res.json(staff);
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/staff:
 *   post:
 *     tags: [Staff]
 *     summary: Create new staff member
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - staffId
 *               - firstName
 *               - lastName
 *               - email
 *               - roleId
 *     responses:
 *       201:
 *         description: Staff member created
 */
router.post('/', async (req, res) => {
  try {
    const { staffId, firstName, lastName, email, roleId, schoolId, departmentId } = req.body;
    
    if (!staffId || !firstName || !lastName || !email || !roleId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [newStaff] = await db.insert(tables.staff).values({
      staffId,
      firstName,
      lastName,
      email,
      roleId,
      schoolId,
      departmentId,
    }).returning();

    res.status(201).json(newStaff);
  } catch (error) {
    console.error('Error creating staff:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/staff/{id}:
 *   put:
 *     tags: [Staff]
 *     summary: Update staff member
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Staff member updated
 */
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updateData = req.body;
    
    const [updated] = await db.update(tables.staff)
      .set(updateData)
      .where(eq(tables.staff.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating staff:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/staff/{id}:
 *   delete:
 *     tags: [Staff]
 *     summary: Delete staff member
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Staff member deleted
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    const [deleted] = await db.delete(tables.staff)
      .where(eq(tables.staff.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    res.json({ message: 'Staff member deleted successfully', staff: deleted });
  } catch (error) {
    console.error('Error deleting staff:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
