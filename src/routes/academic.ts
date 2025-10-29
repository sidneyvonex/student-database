import { Router, type Router as RouterType } from 'express';
import { db, tables } from '../db/client';
import { eq, count } from 'drizzle-orm';

const router: RouterType = Router();

// ============= SCHOOLS =============

/**
 * @swagger
 * /api/schools:
 *   get:
 *     tags: [Schools]
 *     summary: Get all schools
 *     description: Retrieve a list of all schools (Science & Technology, Business, Education, Health Sciences)
 *     responses:
 *       200:
 *         description: List of schools
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/School'
 */
router.get('/schools', async (_req, res) => {
  try {
    const items = await db.select().from(tables.schools);
    res.json(items);
  } catch (error) {
    console.error('Error fetching schools:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/schools/{id}:
 *   get:
 *     tags: [Schools]
 *     summary: Get school by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: School details
 */
router.get('/schools/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [school] = await db.select().from(tables.schools).where(eq(tables.schools.id, id));
    
    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }
    
    res.json(school);
  } catch (error) {
    console.error('Error fetching school:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/schools:
 *   post:
 *     tags: [Schools]
 *     summary: Create new school
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *     responses:
 *       201:
 *         description: School created
 */
router.post('/schools', async (req, res) => {
  try {
    const { name, deanId } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'School name is required' });
    }

    const [newSchool] = await db.insert(tables.schools).values({
      name,
      deanId,
    }).returning();

    res.status(201).json(newSchool);
  } catch (error) {
    console.error('Error creating school:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/schools/{id}:
 *   put:
 *     tags: [Schools]
 *     summary: Update school
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: School updated
 */
router.put('/schools/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updateData = req.body;
    
    const [updated] = await db.update(tables.schools)
      .set(updateData)
      .where(eq(tables.schools.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'School not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating school:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/schools/{id}:
 *   delete:
 *     tags: [Schools]
 *     summary: Delete school
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: School deleted
 */
router.delete('/schools/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    const [deleted] = await db.delete(tables.schools)
      .where(eq(tables.schools.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'School not found' });
    }

    res.json({ message: 'School deleted successfully', school: deleted });
  } catch (error) {
    console.error('Error deleting school:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= DEPARTMENTS =============

/**
 * @swagger
 * /api/departments:
 *   get:
 *     tags: [Departments]
 *     summary: Get all departments
 *     description: Retrieve a list of all departments across all schools
 *     responses:
 *       200:
 *         description: List of departments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Department'
 */
router.get('/departments', async (_req, res) => {
  try {
    const items = await db.select().from(tables.departments);
    res.json(items);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/departments/{id}:
 *   get:
 *     tags: [Departments]
 *     summary: Get department by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Department details
 */
router.get('/departments/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [department] = await db.select().from(tables.departments).where(eq(tables.departments.id, id));
    
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    res.json(department);
  } catch (error) {
    console.error('Error fetching department:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/departments:
 *   post:
 *     tags: [Departments]
 *     summary: Create new department
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - schoolId
 *     responses:
 *       201:
 *         description: Department created
 */
router.post('/departments', async (req, res) => {
  try {
    const { name, schoolId, hodId } = req.body;
    
    if (!name || !schoolId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [newDepartment] = await db.insert(tables.departments).values({
      name,
      schoolId,
      hodId,
    }).returning();

    res.status(201).json(newDepartment);
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/departments/{id}:
 *   put:
 *     tags: [Departments]
 *     summary: Update department
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Department updated
 */
router.put('/departments/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updateData = req.body;
    
    const [updated] = await db.update(tables.departments)
      .set(updateData)
      .where(eq(tables.departments.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/departments/{id}:
 *   delete:
 *     tags: [Departments]
 *     summary: Delete department
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Department deleted
 */
router.delete('/departments/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    const [deleted] = await db.delete(tables.departments)
      .where(eq(tables.departments.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json({ message: 'Department deleted successfully', department: deleted });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= ROLES =============

/**
 * @swagger
 * /api/roles:
 *   get:
 *     tags: [Roles]
 *     summary: Get all roles
 *     description: Retrieve a list of all roles in the system (Chancellor, Vice Chancellor, Dean, HOD, Lecturer, etc.)
 *     responses:
 *       200:
 *         description: List of roles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Role'
 */
router.get('/roles', async (_req, res) => {
  try {
    const items = await db.select().from(tables.roles);
    res.json(items);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/roles/{id}:
 *   get:
 *     tags: [Roles]
 *     summary: Get role by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Role details
 */
router.get('/roles/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [role] = await db.select().from(tables.roles).where(eq(tables.roles.id, id));
    
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    res.json(role);
  } catch (error) {
    console.error('Error fetching role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/roles:
 *   post:
 *     tags: [Roles]
 *     summary: Create new role
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *     responses:
 *       201:
 *         description: Role created
 */
router.post('/roles', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    const [newRole] = await db.insert(tables.roles).values({
      name,
    }).returning();

    res.status(201).json(newRole);
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/roles/{id}:
 *   put:
 *     tags: [Roles]
 *     summary: Update role
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Role updated
 */
router.put('/roles/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updateData = req.body;
    
    const [updated] = await db.update(tables.roles)
      .set(updateData)
      .where(eq(tables.roles.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/roles/{id}:
 *   delete:
 *     tags: [Roles]
 *     summary: Delete role
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Role deleted
 */
router.delete('/roles/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    const [deleted] = await db.delete(tables.roles)
      .where(eq(tables.roles.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json({ message: 'Role deleted successfully', role: deleted });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============= SUMMARY =============

/**
 * @swagger
 * /api/summary:
 *   get:
 *     tags: [Summary]
 *     summary: Get system summary statistics
 *     description: Retrieve summary statistics including total students count and available roles
 *     responses:
 *       200:
 *         description: System summary with statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 students:
 *                   type: integer
 *                   example: 20
 *                 roles:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Role'
 */
router.get('/summary', async (_req, res) => {
  try {
    const [studentsCount] = await db.select({ c: count() }).from(tables.students);
    const roles = await db.select().from(tables.roles);
    res.json({ students: studentsCount?.c ?? 0, roles });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
