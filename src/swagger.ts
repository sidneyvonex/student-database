import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'UEAB Student and Academic Management System (SAMS) API',
      version: '1.0.0',
      description: 'API for managing students, staff, schools, departments, courses, enrollments, and fees at University of Eastern Africa, Baraton',
      contact: {
        name: 'UEAB SAMS Team',
        email: 'support@ueab.ac.ke',
      },
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Local development server',
      },
      {
        url: 'https://studedatademo.azurewebsites.net',
        description: 'Production server (Azure)',
      },
    ],
    tags: [
      { name: 'Health', description: 'Health check endpoints' },
      { name: 'Students', description: 'Student management endpoints' },
      { name: 'Staff', description: 'Staff management endpoints' },
      { name: 'Schools', description: 'School management endpoints' },
      { name: 'Departments', description: 'Department management endpoints' },
      { name: 'Courses', description: 'Course management endpoints' },
      { name: 'Roles', description: 'Role management endpoints' },
      { name: 'Appointments', description: 'University appointments and attendance tracking (chapel, assemblies, WOSE meetings, seminars, conferences)' },
      { name: 'Hostels', description: 'Hostel and room management with occupancy tracking' },
      { name: 'Summary', description: 'Summary and statistics endpoints' },
    ],
    components: {
      schemas: {
        Student: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            studentId: { type: 'string', example: 'student001' },
            firstName: { type: 'string', example: 'Aisha' },
            lastName: { type: 'string', example: 'Omondi' },
            gender: { type: 'string', example: 'Female' },
            dob: { type: 'string', format: 'date', example: '2003-05-15' },
            email: { type: 'string', format: 'email', example: 'student1@ueab.ac.ke' },
            phone: { type: 'string', example: '0712345678' },
            address: { type: 'string', example: 'PO Box 123, Eldoret' },
            schoolId: { type: 'integer', example: 1 },
            departmentId: { type: 'integer', example: 1 },
            yearOfStudy: { type: 'integer', example: 2 },
            currentSemester: { type: 'string', example: '2025-1' },
          },
        },
        StudentDetail: {
          allOf: [
            { $ref: '#/components/schemas/Student' },
            {
              type: 'object',
              properties: {
                enrollments: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Enrollment' },
                },
                fees: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Fee' },
                },
                residence: { $ref: '#/components/schemas/Residence' },
                balance: { type: 'number', example: 15000.00 },
              },
            },
          ],
        },
        Residence: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            studentId: { type: 'integer', example: 1 },
            residenceType: { type: 'string', enum: ['on-campus', 'off-campus'], example: 'on-campus' },
            hostelId: { type: 'integer', nullable: true, example: 1 },
            roomId: { type: 'integer', nullable: true, example: 1 },
            bedNumber: { type: 'string', nullable: true, example: 'Bed A' },
            offCampusAddress: { type: 'string', nullable: true, example: 'Plot 45, Kapsoya Estate, Eldoret' },
            offCampusArea: { type: 'string', nullable: true, example: 'Kapsoya' },
            allocated: { type: 'boolean', example: true },
            allocatedAt: { type: 'string', format: 'date-time', example: '2025-01-15T10:00:00Z' },
          },
        },
        Appointment: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            title: { type: 'string', example: 'Sunday Chapel Service' },
            appointmentType: {
              type: 'string',
              enum: ['chapel', 'assembly', 'wose_meeting', 'seminar', 'conference'],
              example: 'chapel'
            },
            date: { type: 'string', format: 'date-time', example: '2025-10-27T10:00:00Z' },
            venue: { type: 'string', example: 'University Chapel' },
            description: { type: 'string', nullable: true, example: 'Weekly chapel service for all students' },
            mandatory: { type: 'boolean', example: true },
            createdBy: { type: 'integer', nullable: true, example: 1 },
            createdAt: { type: 'string', format: 'date-time', example: '2025-10-20T08:00:00Z' },
          },
        },
        AppointmentAttendance: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            appointmentId: { type: 'integer', example: 1 },
            studentId: { type: 'integer', example: 1 },
            status: {
              type: 'string',
              enum: ['present', 'absent', 'excused'],
              example: 'present'
            },
            markedBy: { type: 'integer', nullable: true, example: 5 },
            markedAt: { type: 'string', format: 'date-time', example: '2025-10-27T10:30:00Z' },
            notes: { type: 'string', nullable: true, example: 'Arrived late due to class' },
          },
        },
        AttendanceSummary: {
          type: 'object',
          properties: {
            studentId: { type: 'integer', example: 1 },
            studentName: { type: 'string', example: 'Aisha Omondi' },
            studentNumber: { type: 'string', example: 'student001' },
            totalAppointments: { type: 'integer', example: 40 },
            attended: { type: 'integer', example: 32 },
            absent: { type: 'integer', example: 6 },
            excused: { type: 'integer', example: 2 },
            attendanceRate: { type: 'number', format: 'float', example: 80.00 },
          },
        },
        Hostel: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'New Men Dorm' },
            gender: { type: 'string', enum: ['male', 'female'], example: 'male' },
            totalRooms: { type: 'integer', example: 50 },
            location: { type: 'string', nullable: true, example: 'East Campus' },
            description: { type: 'string', nullable: true, example: 'Modern hostel facility for male students' },
            warden: { type: 'integer', nullable: true, example: 10 },
            wardenName: { type: 'string', nullable: true, example: 'John Doe' },
            occupiedRooms: { type: 'integer', example: 35 },
            totalCapacity: { type: 'integer', example: 100 },
            currentOccupancy: { type: 'integer', example: 68 },
          },
        },
        Room: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            hostelId: { type: 'integer', example: 1 },
            hostelName: { type: 'string', example: 'New Men Dorm' },
            roomNumber: { type: 'string', example: '1A01' },
            floor: { type: 'integer', example: 1 },
            capacity: { type: 'integer', example: 2 },
            currentOccupancy: { type: 'integer', example: 2 },
            roomType: { type: 'string', nullable: true, example: 'double' },
            amenities: { type: 'string', nullable: true, example: 'Bathroom, Study Desk, Wardrobe, Bed' },
            status: {
              type: 'string',
              enum: ['available', 'full', 'maintenance'],
              example: 'full'
            },
          },
        },
        Staff: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            staffId: { type: 'string', example: 'lecturer001' },
            firstName: { type: 'string', example: 'Grace' },
            lastName: { type: 'string', example: 'Omondi' },
            email: { type: 'string', format: 'email', example: 'chancellor@ueab.ac.ke' },
            roleId: { type: 'integer', example: 1 },
            schoolId: { type: 'integer', nullable: true, example: 1 },
            departmentId: { type: 'integer', nullable: true, example: 1 },
          },
        },
        Role: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Chancellor' },
          },
        },
        School: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'School of Science & Technology' },
            deanId: { type: 'integer', nullable: true, example: 1 },
          },
        },
        Department: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Computer Science' },
            schoolId: { type: 'integer', example: 1 },
            hodId: { type: 'integer', nullable: true, example: 1 },
          },
        },
        Course: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            code: { type: 'string', example: 'CS100' },
            title: { type: 'string', example: 'Introduction to Computer Science' },
            credits: { type: 'integer', example: 3 },
            departmentId: { type: 'integer', example: 1 },
            lecturerId: { type: 'integer', nullable: true, example: 1 },
          },
        },
        Enrollment: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            studentId: { type: 'integer', example: 1 },
            courseId: { type: 'integer', example: 1 },
            semester: { type: 'string', example: '2025-1' },
            status: { type: 'string', enum: ['registered', 'dropped', 'completed'], example: 'registered' },
            grade: { type: 'string', nullable: true, example: 'A' },
          },
        },
        Fee: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            studentId: { type: 'integer', example: 1 },
            semester: { type: 'string', example: '2025-1' },
            amountBilled: { type: 'string', example: '75000.00' },
            amountPaid: { type: 'string', example: '50000.00' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Not found' },
          },
        },
      },
    },
  },
  apis: [
    './src/index.ts',
    './src/routes/*.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
