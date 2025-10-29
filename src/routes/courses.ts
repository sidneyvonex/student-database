import { Router, type Router as RouterType } from 'express';
import { db, tables } from '../db/client';
import { eq } from 'drizzle-orm';

const router: RouterType = Router();

/**
 * @swagger
 * /api/courses:
 *   get:
 *     tags: [Courses]
 *     summary: Get all courses
 *     description: Retrieve a list of all courses available across all departments
 *     responses:
 *       200:
 *         description: List of courses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Course'
 */
router.get('/', async (_req, res) => {
    try {
        const items = await db.select().from(tables.courses);
        res.json(items);
    } catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /api/courses/{id}:
 *   get:
 *     tags: [Courses]
 *     summary: Get course by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Course details
 */
router.get('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const [course] = await db.select().from(tables.courses).where(eq(tables.courses.id, id));

        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        res.json(course);
    } catch (error) {
        console.error('Error fetching course:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /api/courses:
 *   post:
 *     tags: [Courses]
 *     summary: Create new course
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - title
 *               - credits
 *               - departmentId
 *     responses:
 *       201:
 *         description: Course created
 */
router.post('/', async (req, res) => {
    try {
        const { code, title, credits, departmentId, lecturerId } = req.body;

        if (!code || !title || !credits || !departmentId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const [newCourse] = await db.insert(tables.courses).values({
            code,
            title,
            credits,
            departmentId,
            lecturerId,
        }).returning();

        res.status(201).json(newCourse);
    } catch (error) {
        console.error('Error creating course:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /api/courses/{id}:
 *   put:
 *     tags: [Courses]
 *     summary: Update course
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Course updated
 */
router.put('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const updateData = req.body;

        const [updated] = await db.update(tables.courses)
            .set(updateData)
            .where(eq(tables.courses.id, id))
            .returning();

        if (!updated) {
            return res.status(404).json({ error: 'Course not found' });
        }

        res.json(updated);
    } catch (error) {
        console.error('Error updating course:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /api/courses/{id}:
 *   delete:
 *     tags: [Courses]
 *     summary: Delete course
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Course deleted
 */
router.delete('/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);

        const [deleted] = await db.delete(tables.courses)
            .where(eq(tables.courses.id, id))
            .returning();

        if (!deleted) {
            return res.status(404).json({ error: 'Course not found' });
        }

        res.json({ message: 'Course deleted successfully', course: deleted });
    } catch (error) {
        console.error('Error deleting course:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
