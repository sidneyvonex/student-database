import { Router, type Router as RouterType } from 'express';
import { db, tables } from '../db/client';
import { eq, and } from 'drizzle-orm';

const router: RouterType = Router();

/**
 * @swagger
 * /api/fees:
 *   get:
 *     tags: [Fees]
 *     summary: Get fee records
 *     parameters:
 *       - in: query
 *         name: studentId
 *         schema:
 *           type: string
 *         description: Student ID (e.g., student001, student002)
 *       - in: query
 *         name: semester
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of fee records
 */
router.get('/', async (req, res) => {
  try {
    const { studentId, semester } = req.query;
    const where = [] as any[];

    // If studentId is provided, lookup the numeric ID first
    if (studentId) {
      const [student] = await db.select()
        .from(tables.students)
        .where(eq(tables.students.studentId, studentId as string));

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      where.push(eq(tables.fees.studentId, student.id));
    }

    if (semester) where.push(eq(tables.fees.semester, semester as string));

    const items = where.length
      ? await db.select().from(tables.fees).where(and(...where))
      : await db.select().from(tables.fees);

    res.json(items);
  } catch (error) {
    console.error('Error fetching fees:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/fees/{id}:
 *   get:
 *     tags: [Fees]
 *     summary: Get fee record by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Fee record details
 */
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [fee] = await db.select().from(tables.fees).where(eq(tables.fees.id, id));

    if (!fee) {
      return res.status(404).json({ error: 'Fee record not found' });
    }

    res.json(fee);
  } catch (error) {
    console.error('Error fetching fee record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/fees:
 *   post:
 *     tags: [Fees]
 *     summary: Create fee record
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - semester
 *               - amountBilled
 *     responses:
 *       201:
 *         description: Fee record created
 */
router.post('/', async (req, res) => {
  try {
    const { studentId, semester, amountBilled, amountPaid } = req.body;

    if (!studentId || !semester || !amountBilled) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [fee] = await db.insert(tables.fees).values({
      studentId,
      semester,
      amountBilled,
      amountPaid: amountPaid || '0',
    }).returning();

    res.status(201).json(fee);
  } catch (error) {
    console.error('Error creating fee record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/fees/{id}:
 *   put:
 *     tags: [Fees]
 *     summary: Update fee record (payment)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Fee record updated
 */
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updateData = req.body;

    const [updated] = await db.update(tables.fees)
      .set(updateData)
      .where(eq(tables.fees.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Fee record not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating fee record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/fees/{id}:
 *   delete:
 *     tags: [Fees]
 *     summary: Delete fee record
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Fee record deleted
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    const [deleted] = await db.delete(tables.fees)
      .where(eq(tables.fees.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Fee record not found' });
    }

    res.json({ message: 'Fee record deleted successfully', fee: deleted });
  } catch (error) {
    console.error('Error deleting fee record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/fees/balance/{studentId}:
 *   get:
 *     tags: [Fees]
 *     summary: Get student's fee balance
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID (e.g., student001, student002)
 *     responses:
 *       200:
 *         description: Student balance information
 *       404:
 *         description: Student not found
 */
router.get('/balance/:studentId', async (req, res) => {
  try {
    const studentId = req.params.studentId;

    // Lookup student by string studentId
    const [student] = await db.select()
      .from(tables.students)
      .where(eq(tables.students.studentId, studentId));

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const fees = await db.select().from(tables.fees).where(eq(tables.fees.studentId, student.id));

    const totalBilled = fees.reduce((sum, f) => sum + Number(f.amountBilled), 0);
    const totalPaid = fees.reduce((sum, f) => sum + Number(f.amountPaid), 0);
    const balance = totalBilled - totalPaid;

    res.json({
      studentId: student.studentId,
      studentName: `${student.firstName} ${student.lastName}`,
      totalBilled,
      totalPaid,
      balance,
      fees,
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
