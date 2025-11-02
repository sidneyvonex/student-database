import { Router, type Router as RouterType } from 'express';
import { db, tables } from '../db/client';
import { eq, and, desc, sql } from 'drizzle-orm';

const router: RouterType = Router();

// ============= WORK-STUDY APPLICATION =============

/**
 * @swagger
 * /api/work-study/application/{studentId}:
 *   get:
 *     tags: [Work-Study]
 *     summary: Get work-study application status for a student
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Student identifier like student001
 *     responses:
 *       200:
 *         description: Work-study application status and details
 */
router.get('/application/:studentId', async (req, res) => {
    try {
        const studentId = req.params.studentId;

        // Get student
        const [student] = await db.select()
            .from(tables.students)
            .where(eq(tables.students.studentId, studentId));

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Check if they have an application
        const [application] = await db.select({
            id: tables.workStudyApplications.id,
            academicYear: tables.workStudyApplications.academicYear,
            semester: tables.workStudyApplications.semester,
            reason: tables.workStudyApplications.reason,
            financialNeed: tables.workStudyApplications.financialNeed,
            previousWorkExperience: tables.workStudyApplications.previousWorkExperience,
            skills: tables.workStudyApplications.skills,
            availability: tables.workStudyApplications.availability,
            status: tables.workStudyApplications.status,
            appliedAt: tables.workStudyApplications.appliedAt,
            reviewedAt: tables.workStudyApplications.reviewedAt,
            reviewNotes: tables.workStudyApplications.reviewNotes,
            reviewerName: tables.staff.firstName,
            reviewerLastName: tables.staff.lastName
        })
            .from(tables.workStudyApplications)
            .leftJoin(tables.staff, eq(tables.workStudyApplications.reviewedBy, tables.staff.id))
            .where(eq(tables.workStudyApplications.studentId, student.id));

        res.json({
            studentId: student.studentId,
            studentName: `${student.firstName} ${student.lastName}`,
            workStudyStatus: student.workStudy,
            hasApplication: !!application,
            application: application || null
        });
    } catch (error) {
        console.error('Error fetching work-study application:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /api/work-study/application:
 *   post:
 *     tags: [Work-Study]
 *     summary: Submit a work-study application
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - academicYear
 *               - semester
 *               - reason
 *     responses:
 *       201:
 *         description: Application submitted successfully
 */
router.post('/application', async (req, res) => {
    try {
        const {
            studentId,
            academicYear,
            semester,
            reason,
            financialNeed,
            previousWorkExperience,
            skills,
            availability
        } = req.body;

        if (!studentId || !academicYear || !semester || !reason) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get student numeric ID
        const [student] = await db.select()
            .from(tables.students)
            .where(eq(tables.students.studentId, studentId));

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Check if application already exists
        const [existing] = await db.select()
            .from(tables.workStudyApplications)
            .where(eq(tables.workStudyApplications.studentId, student.id));

        if (existing) {
            return res.status(400).json({ error: 'Application already exists for this student' });
        }

        const [application] = await db.insert(tables.workStudyApplications).values({
            studentId: student.id,
            academicYear,
            semester,
            reason,
            financialNeed: financialNeed || null,
            previousWorkExperience: previousWorkExperience || null,
            skills: skills || null,
            availability: availability || null,
            status: 'pending'
        }).returning();

        res.status(201).json(application);
    } catch (error) {
        console.error('Error creating work-study application:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============= WORK-STUDY DASHBOARD =============

/**
 * @swagger
 * /api/work-study/dashboard/{studentId}:
 *   get:
 *     tags: [Work-Study]
 *     summary: Get complete work-study dashboard for a student
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Student identifier like student001
 *     responses:
 *       200:
 *         description: Complete dashboard with application status, assignments, timesheets, and earnings
 */
router.get('/dashboard/:studentId', async (req, res) => {
    try {
        const studentId = req.params.studentId;

        // Get student
        const [student] = await db.select()
            .from(tables.students)
            .where(eq(tables.students.studentId, studentId));

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Get application if exists
        const [application] = await db.select({
            id: tables.workStudyApplications.id,
            academicYear: tables.workStudyApplications.academicYear,
            semester: tables.workStudyApplications.semester,
            status: tables.workStudyApplications.status,
            appliedAt: tables.workStudyApplications.appliedAt,
            reviewedAt: tables.workStudyApplications.reviewedAt,
            reviewNotes: tables.workStudyApplications.reviewNotes,
            reviewerName: tables.staff.firstName,
            reviewerLastName: tables.staff.lastName
        })
            .from(tables.workStudyApplications)
            .leftJoin(tables.staff, eq(tables.workStudyApplications.reviewedBy, tables.staff.id))
            .where(eq(tables.workStudyApplications.studentId, student.id));

        // If work-study is false, return application status only
        if (!student.workStudy) {
            return res.json({
                studentId: student.studentId,
                studentName: `${student.firstName} ${student.lastName}`,
                workStudyActive: false,
                applicationStatus: application ? application.status : 'not_applied',
                message: application
                    ? `Your application is ${application.status}. ${application.status === 'approved' ? 'Work-study will be activated soon.' : application.status === 'pending' ? 'Your application is under review.' : 'Your application was not approved.'}`
                    : 'You have not applied for work-study yet. Please submit an application.',
                application: application || null
            });
        }

        // If work-study is true, get full dashboard
        // Get current assignment
        const [currentAssignment] = await db.select({
            assignmentId: tables.workStudyAssignments.id,
            positionTitle: tables.workStudyPositions.title,
            department: tables.workStudyPositions.department,
            description: tables.workStudyPositions.description,
            hoursPerWeek: tables.workStudyPositions.hoursPerWeek,
            payRatePerHour: tables.workStudyPositions.payRatePerHour,
            startDate: tables.workStudyAssignments.startDate,
            status: tables.workStudyAssignments.status,
            supervisorName: tables.staff.firstName,
            supervisorLastName: tables.staff.lastName,
            supervisorEmail: tables.staff.email
        })
            .from(tables.workStudyAssignments)
            .innerJoin(tables.workStudyPositions, eq(tables.workStudyAssignments.positionId, tables.workStudyPositions.id))
            .leftJoin(tables.staff, eq(tables.workStudyPositions.supervisorId, tables.staff.id))
            .where(and(
                eq(tables.workStudyAssignments.studentId, student.id),
                eq(tables.workStudyAssignments.status, 'active')
            ));

        // Get timesheets (last 30 days)
        const timesheets = await db.select({
            id: tables.workStudyTimesheets.id,
            date: tables.workStudyTimesheets.date,
            clockIn: tables.workStudyTimesheets.clockIn,
            clockOut: tables.workStudyTimesheets.clockOut,
            hoursWorked: tables.workStudyTimesheets.hoursWorked,
            taskDescription: tables.workStudyTimesheets.taskDescription,
            approved: tables.workStudyTimesheets.approved,
            approvedAt: tables.workStudyTimesheets.approvedAt,
            notes: tables.workStudyTimesheets.notes
        })
            .from(tables.workStudyTimesheets)
            .where(eq(tables.workStudyTimesheets.studentId, student.id))
            .orderBy(desc(tables.workStudyTimesheets.date))
            .limit(30);

        // Calculate earnings
        const totalHoursWorked = timesheets
            .filter(t => t.approved && t.hoursWorked)
            .reduce((sum, t) => sum + parseFloat(t.hoursWorked as any), 0);

        const payRate = currentAssignment ? parseFloat(currentAssignment.payRatePerHour as any) : 0;
        const totalEarnings = totalHoursWorked * payRate;

        const pendingHours = timesheets
            .filter(t => !t.approved && t.hoursWorked)
            .reduce((sum, t) => sum + parseFloat(t.hoursWorked as any), 0);

        const pendingEarnings = pendingHours * payRate;

        res.json({
            studentId: student.studentId,
            studentName: `${student.firstName} ${student.lastName}`,
            workStudyActive: true,
            application: application,
            currentAssignment: currentAssignment || null,
            earnings: {
                totalHoursWorked: totalHoursWorked.toFixed(2),
                totalEarnings: totalEarnings.toFixed(2),
                pendingHours: pendingHours.toFixed(2),
                pendingEarnings: pendingEarnings.toFixed(2),
                payRatePerHour: payRate.toFixed(2)
            },
            recentTimesheets: timesheets,
            summary: {
                totalTimesheets: timesheets.length,
                approvedTimesheets: timesheets.filter(t => t.approved).length,
                pendingTimesheets: timesheets.filter(t => !t.approved).length
            }
        });
    } catch (error) {
        console.error('Error fetching work-study dashboard:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============= WORK-STUDY POSITIONS =============

/**
 * @swagger
 * /api/work-study/positions:
 *   get:
 *     tags: [Work-Study]
 *     summary: Get all available work-study positions
 *     responses:
 *       200:
 *         description: List of available positions
 */
router.get('/positions', async (req, res) => {
    try {
        const positions = await db.select({
            id: tables.workStudyPositions.id,
            title: tables.workStudyPositions.title,
            department: tables.workStudyPositions.department,
            description: tables.workStudyPositions.description,
            requirements: tables.workStudyPositions.requirements,
            hoursPerWeek: tables.workStudyPositions.hoursPerWeek,
            payRatePerHour: tables.workStudyPositions.payRatePerHour,
            totalSlots: tables.workStudyPositions.totalSlots,
            filledSlots: tables.workStudyPositions.filledSlots,
            availableSlots: sql<number>`${tables.workStudyPositions.totalSlots} - ${tables.workStudyPositions.filledSlots}`,
            supervisorName: tables.staff.firstName,
            supervisorLastName: tables.staff.lastName
        })
            .from(tables.workStudyPositions)
            .leftJoin(tables.staff, eq(tables.workStudyPositions.supervisorId, tables.staff.id))
            .where(eq(tables.workStudyPositions.isActive, true));

        res.json(positions);
    } catch (error) {
        console.error('Error fetching positions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============= TIMESHEETS =============

/**
 * @swagger
 * /api/work-study/timesheet:
 *   post:
 *     tags: [Work-Study]
 *     summary: Submit a timesheet entry
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - date
 *               - clockIn
 *               - clockOut
 *     responses:
 *       201:
 *         description: Timesheet submitted successfully
 */
router.post('/timesheet', async (req, res) => {
    try {
        const {
            studentId,
            date,
            clockIn,
            clockOut,
            taskDescription
        } = req.body;

        if (!studentId || !date || !clockIn || !clockOut) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get student
        const [student] = await db.select()
            .from(tables.students)
            .where(eq(tables.students.studentId, studentId));

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        if (!student.workStudy) {
            return res.status(403).json({ error: 'Student is not enrolled in work-study' });
        }

        // Get current assignment
        const [assignment] = await db.select()
            .from(tables.workStudyAssignments)
            .where(and(
                eq(tables.workStudyAssignments.studentId, student.id),
                eq(tables.workStudyAssignments.status, 'active')
            ));

        if (!assignment) {
            return res.status(404).json({ error: 'No active work-study assignment found' });
        }

        // Calculate hours worked
        const clockInTime = new Date(clockIn);
        const clockOutTime = new Date(clockOut);
        const hoursWorked = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);

        const [timesheet] = await db.insert(tables.workStudyTimesheets).values({
            assignmentId: assignment.id,
            studentId: student.id,
            date: new Date(date),
            clockIn: clockInTime,
            clockOut: clockOutTime,
            hoursWorked: hoursWorked.toFixed(2),
            taskDescription: taskDescription || null,
            supervisorId: assignment.assignedBy,
            approved: false
        }).returning();

        res.status(201).json(timesheet);
    } catch (error) {
        console.error('Error creating timesheet:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
