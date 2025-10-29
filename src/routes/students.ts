import { Router, type Router as RouterType } from 'express';
import { db, tables } from '../db/client';
import { eq, and } from 'drizzle-orm';

const router: RouterType = Router();

/**
 * @swagger
 * /api/students:
 *   get:
 *     tags: [Students]
 *     summary: Get all students
 *     description: Retrieve a list of all students with optional filtering by department or school
 *     parameters:
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: integer
 *         description: Filter by department ID
 *       - in: query
 *         name: schoolId
 *         schema:
 *           type: integer
 *         description: Filter by school ID
 *     responses:
 *       200:
 *         description: List of students
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Student'
 */
router.get('/', async (req, res) => {
  try {
    const { departmentId, schoolId } = req.query;
    const where = [] as any[];
    if (departmentId) where.push(eq(tables.students.departmentId, Number(departmentId)));
    if (schoolId) where.push(eq(tables.students.schoolId, Number(schoolId)));
    const items = where.length
      ? await db.select().from(tables.students).where(and(...where))
      : await db.select().from(tables.students);
    res.json(items);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/students/{id}:
 *   get:
 *     tags: [Students]
 *     summary: Get student details by ID
 *     description: Retrieve detailed information about a specific student including enrollments, fees, and balance
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Student details with enrollments and fees
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StudentDetail'
 *       404:
 *         description: Student not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [student] = await db.select().from(tables.students).where(eq(tables.students.id, id));
    if (!student) return res.status(404).json({ error: 'Student not found' });
    
    const enrollments = await db.select().from(tables.enrollments).where(eq(tables.enrollments.studentId, id));
    const fees = await db.select().from(tables.fees).where(eq(tables.fees.studentId, id));
    const [residence] = await db.select().from(tables.residences).where(eq(tables.residences.studentId, id));
    const balance = fees.reduce((acc: number, f: any) => acc + (Number(f.amountBilled) - Number(f.amountPaid)), 0);
    
    res.json({ ...student, enrollments, fees, residence, balance });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/students:
 *   post:
 *     tags: [Students]
 *     summary: Create a new student
 *     description: Register a new student in the system
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - firstName
 *               - lastName
 *               - email
 *             properties:
 *               studentId:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               gender:
 *                 type: string
 *               dob:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               schoolId:
 *                 type: integer
 *               departmentId:
 *                 type: integer
 *               yearOfStudy:
 *                 type: integer
 *               yearJoined:
 *                 type: integer
 *               workStudy:
 *                 type: boolean
 *               currentSemester:
 *                 type: string
 *     responses:
 *       201:
 *         description: Student created successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res) => {
  try {
    const { studentId, firstName, lastName, email, gender, dob, phone, address, schoolId, departmentId, yearOfStudy, yearJoined, workStudy, currentSemester } = req.body;
    
    if (!studentId || !firstName || !lastName || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [newStudent] = await db.insert(tables.students).values({
      studentId,
      firstName,
      lastName,
      email,
      gender,
      dob,
      phone,
      address,
      schoolId,
      departmentId,
      yearOfStudy,
      yearJoined,
      workStudy: workStudy ?? false,
      currentSemester,
    }).returning();

    res.status(201).json(newStudent);
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/students/{id}:
 *   put:
 *     tags: [Students]
 *     summary: Update student information
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
 *         description: Student updated successfully
 *       404:
 *         description: Student not found
 */
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updateData = req.body;
    
    const [updated] = await db.update(tables.students)
      .set(updateData)
      .where(eq(tables.students.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/students/{id}:
 *   delete:
 *     tags: [Students]
 *     summary: Delete a student
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Student deleted successfully
 *       404:
 *         description: Student not found
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    const [deleted] = await db.delete(tables.students)
      .where(eq(tables.students.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ message: 'Student deleted successfully', student: deleted });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
