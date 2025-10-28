import { Router } from 'express';
import { db, tables } from '../db/client';
import { eq, and } from 'drizzle-orm';

const router = Router();

/**
 * @swagger
 * /api/enrollments:
 *   get:
 *     tags: [Enrollments]
 *     summary: Get course enrollments
 *     parameters:
 *       - in: query
 *         name: studentId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: semester
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of enrollments
 */
router.get('/', async (req, res) => {
  try {
    const { studentId, courseId, semester } = req.query;
    const where = [] as any[];
    
    if (studentId) where.push(eq(tables.enrollments.studentId, Number(studentId)));
    if (courseId) where.push(eq(tables.enrollments.courseId, Number(courseId)));
    if (semester) where.push(eq(tables.enrollments.semester, semester as string));
    
    const items = where.length
      ? await db.select().from(tables.enrollments).where(and(...where))
      : await db.select().from(tables.enrollments);
    
    res.json(items);
  } catch (error) {
    console.error('Error fetching enrollments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/enrollments/{id}:
 *   get:
 *     tags: [Enrollments]
 *     summary: Get enrollment by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Enrollment details
 */
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [enrollment] = await db.select().from(tables.enrollments).where(eq(tables.enrollments.id, id));
    
    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    
    res.json(enrollment);
  } catch (error) {
    console.error('Error fetching enrollment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/enrollments:
 *   post:
 *     tags: [Enrollments]
 *     summary: Enroll student in a course
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - courseId
 *               - semester
 *     responses:
 *       201:
 *         description: Enrollment created successfully
 */
router.post('/', async (req, res) => {
  try {
    const { studentId, courseId, semester, status } = req.body;
    
    if (!studentId || !courseId || !semester) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [enrollment] = await db.insert(tables.enrollments).values({
      studentId,
      courseId,
      semester,
      status: status || 'registered',
    }).returning();

    res.status(201).json(enrollment);
  } catch (error) {
    console.error('Error creating enrollment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/enrollments/{id}:
 *   put:
 *     tags: [Enrollments]
 *     summary: Update enrollment (grade, status)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Enrollment updated successfully
 */
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updateData = req.body;
    
    const [updated] = await db.update(tables.enrollments)
      .set(updateData)
      .where(eq(tables.enrollments.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating enrollment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/enrollments/{id}:
 *   delete:
 *     tags: [Enrollments]
 *     summary: Delete enrollment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Enrollment deleted successfully
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    const [deleted] = await db.delete(tables.enrollments)
      .where(eq(tables.enrollments.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    res.json({ message: 'Enrollment deleted successfully', enrollment: deleted });
  } catch (error) {
    console.error('Error deleting enrollment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
