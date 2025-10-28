import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';

// Import route modules
import studentRoutes from './routes/students';
import staffRoutes from './routes/staff';
import courseRoutes from './routes/courses';
import residenceRoutes from './routes/residences';
import appointmentRoutes from './routes/appointments';
import hostelRoutes from './routes/hostels';
import enrollmentRoutes from './routes/enrollments';
import feeRoutes from './routes/fees';
import academicRoutes from './routes/academic';

const app = express();
app.use(cors());
app.use(express.json());

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    message: 'UEAB Student and Academic Management System API',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      health: '/api/health',
      students: '/api/students',
      staff: '/api/staff',
      courses: '/api/courses',
      residences: '/api/residences',
      appointments: '/api/appointments',
      hostels: '/api/hostels',
      enrollments: '/api/enrollments',
      fees: '/api/fees',
      schools: '/api/schools',
      departments: '/api/departments',
      roles: '/api/roles',
      summary: '/api/summary'
    }
  });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

/**
 * @swagger
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Health check endpoint
 *     description: Check if the API is running
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 time:
 *                   type: string
 *                   format: date-time
 */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Mount route modules
app.use('/api/students', studentRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/residences', residenceRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/hostels', hostelRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api', academicRoutes); // schools, departments, roles, summary

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
});
