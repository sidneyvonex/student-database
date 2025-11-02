import 'dotenv/config';
import { db, tables } from './db/client';
import { eq } from 'drizzle-orm';

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randint(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function upsertRole(name: string) {
  const existing = await db.select().from(tables.roles).where(eq(tables.roles.name, name));
  if (existing[0]) return existing[0].id;
  const inserted = await db.insert(tables.roles).values({ name }).returning({ id: tables.roles.id });
  return inserted[0].id;
}

async function main() {
  console.log('Starting seed...');

  // Clear existing data
  console.log('Clearing existing data...');
  await db.delete(tables.workStudyTimesheets);
  await db.delete(tables.workStudyAssignments);
  await db.delete(tables.workStudyApplications);
  await db.delete(tables.workStudyPositions);
  await db.delete(tables.appointmentAttendance);
  await db.delete(tables.appointments);
  await db.delete(tables.residenceAttendance);
  await db.delete(tables.residences);
  await db.delete(tables.rooms);
  await db.delete(tables.hostels);
  await db.delete(tables.roomBookings);
  await db.delete(tables.fees);
  await db.delete(tables.enrollments);
  await db.delete(tables.courses);
  await db.delete(tables.students);
  await db.delete(tables.staff);
  await db.delete(tables.departments);
  await db.delete(tables.schools);
  await db.delete(tables.roles);
  await db.delete(tables.metadata);
  console.log('Data cleared!');

  // Roles
  const roleNames = ['Chancellor', 'Vice Chancellor', 'Dean', 'HOD', 'Lecturer', 'Bursar', 'Registrar', 'Student', 'Warden'];
  const roleIds: Record<string, number> = {};
  for (const r of roleNames) roleIds[r] = await upsertRole(r);

  // Schools
  const schoolNames = [
    'School of Science & Technology',
    'School of Business',
    'School of Education',
    'School of Health Sciences'
  ];
  const schoolIds: number[] = [];
  for (const name of schoolNames) {
    const inserted = await db.insert(tables.schools).values({ name }).returning({ id: tables.schools.id });
    schoolIds.push(inserted[0].id);
  }

  // Departments
  const deptMap: Record<string, { schoolIdx: number, depts: string[] }> = {
    'School of Science & Technology': { schoolIdx: 0, depts: ['Computer Science', 'Information Technology', 'Mathematics', 'Physics'] },
    'School of Business': { schoolIdx: 1, depts: ['Accounting', 'Finance', 'Marketing', 'Management'] },
    'School of Education': { schoolIdx: 2, depts: ['Curriculum', 'Educational Psychology', 'Leadership'] },
    'School of Health Sciences': { schoolIdx: 3, depts: ['Nursing', 'Public Health', 'Nutrition'] }
  };
  const deptIds: Record<string, number> = {};
  for (const [schoolName, { schoolIdx, depts }] of Object.entries(deptMap)) {
    const schoolId = schoolIds[schoolIdx];
    for (const d of depts) {
      const inserted = await db.insert(tables.departments).values({ name: d, schoolId }).returning({ id: tables.departments.id });
      deptIds[d] = inserted[0].id;
    }
  }

  // Top leadership
  await db.insert(tables.staff).values({
    staffId: 'chancellor001',
    firstName: 'Grace',
    lastName: 'Omondi',
    email: 'chancellor@ueab.ac.ke',
    roleId: roleIds['Chancellor']
  });
  await db.insert(tables.staff).values({
    staffId: 'vc001',
    firstName: 'Daniel',
    lastName: 'Mwangi',
    email: 'vc@ueab.ac.ke',
    roleId: roleIds['Vice Chancellor']
  });

  // Deans per school
  for (let i = 0; i < schoolIds.length; i++) {
    const dean = await db.insert(tables.staff).values({
      staffId: `dean${String(i + 1).padStart(3, '0')}`,
      firstName: `Dean${i + 1}`,
      lastName: 'Baraton',
      email: `dean${i + 1}@ueab.ac.ke`,
      roleId: roleIds['Dean'],
      schoolId: schoolIds[i]
    }).returning({ id: tables.staff.id });
    await db.update(tables.schools).set({ deanId: dean[0].id }).where(eq(tables.schools.id, schoolIds[i]));
  }

  // HODs and Lecturers per department
  const lecturers: number[] = [];
  let deptCounter = 1;
  for (const [deptName, deptId] of Object.entries(deptIds)) {
    const hod = await db.insert(tables.staff).values({
      staffId: `hod${String(deptCounter).padStart(3, '0')}`,
      firstName: `HOD${deptCounter}`,
      lastName: deptName.replace(/\s+/g, '_'),
      email: `hod${deptCounter}@ueab.ac.ke`,
      roleId: roleIds['HOD'],
      departmentId: deptId
    }).returning({ id: tables.staff.id });
    await db.update(tables.departments).set({ hodId: hod[0].id }).where(eq(tables.departments.id, deptId));

    // 3 lecturers per department
    for (let j = 1; j <= 3; j++) {
      const lecNum = (deptCounter - 1) * 3 + j;
      const lec = await db.insert(tables.staff).values({
        staffId: `lecturer${String(lecNum).padStart(3, '0')}`,
        firstName: `Lect${deptCounter}${j}`,
        lastName: 'UEAB',
        email: `lect${deptCounter}${j}@ueab.ac.ke`,
        roleId: roleIds['Lecturer'],
        departmentId: deptId
      }).returning({ id: tables.staff.id });
      lecturers.push(lec[0].id);
    }
    deptCounter++;
  }

  // Courses per department
  let courseSeq = 100;
  for (const [deptName, deptId] of Object.entries(deptIds)) {
    for (let i = 0; i < 4; i++) {
      const code = `${deptName.split(' ').map(w => w[0]).join('').toUpperCase()}${courseSeq++}`;
      const title = `${deptName} Course ${i + 1}`;
      const credits = randint(2, 4);
      const lecturerId = rand(lecturers);
      await db.insert(tables.courses).values({ code, title, credits, departmentId: deptId, lecturerId });
    }
  }

  // Create Hostels
  console.log('Creating hostels...');
  const menHostels = [
    { name: 'New Men Dorm', gender: 'male', totalRooms: 50, location: 'East Campus' },
    { name: 'Old Men Dorm', gender: 'male', totalRooms: 40, location: 'Main Campus' }
  ];

  const ladiesHostels = [
    { name: 'Box Ladies Hostel', gender: 'female', totalRooms: 45, location: 'West Campus' },
    { name: 'Annex Ladies Hostel', gender: 'female', totalRooms: 35, location: 'North Campus' },
    { name: 'Grace Ladies Hostel', gender: 'female', totalRooms: 30, location: 'South Campus' }
  ];

  const hostelIds: Record<string, number> = {};

  for (const h of [...menHostels, ...ladiesHostels]) {
    const warden = await db.insert(tables.staff).values({
      staffId: `warden${Object.keys(hostelIds).length + 1}`,
      firstName: `Warden${Object.keys(hostelIds).length + 1}`,
      lastName: 'UEAB',
      email: `warden${Object.keys(hostelIds).length + 1}@ueab.ac.ke`,
      roleId: roleIds['Warden']
    }).returning({ id: tables.staff.id });

    const hostel = await db.insert(tables.hostels).values({
      name: h.name,
      gender: h.gender,
      totalRooms: h.totalRooms,
      location: h.location,
      warden: warden[0].id
    }).returning({ id: tables.hostels.id });

    hostelIds[h.name] = hostel[0].id;
  }

  // Create Rooms for each hostel
  console.log('Creating rooms...');
  const roomIds: number[] = [];

  for (const [hostelName, hostelId] of Object.entries(hostelIds)) {
    const hostel = [...menHostels, ...ladiesHostels].find(h => h.name === hostelName)!;
    const floorsCount = Math.ceil(hostel.totalRooms / 10);

    for (let floor = 1; floor <= floorsCount; floor++) {
      const roomsPerFloor = Math.min(10, hostel.totalRooms - (floor - 1) * 10);

      for (let roomNum = 1; roomNum <= roomsPerFloor; roomNum++) {
        const roomNumber = `${floor}${String.fromCharCode(64 + Math.ceil(roomNum / 2))}${roomNum.toString().padStart(2, '0')}`;
        // Vary capacity: 25% single, 30% double, 30% triple, 15% quad
        const capacityRand = Math.random();
        const capacity = capacityRand < 0.25 ? 1 : capacityRand < 0.55 ? 2 : capacityRand < 0.85 ? 3 : 4;
        const roomType = capacity === 1 ? 'single' : capacity === 2 ? 'double' : capacity === 3 ? 'triple' : 'quad';

        const room = await db.insert(tables.rooms).values({
          hostelId,
          roomNumber,
          floor,
          capacity,
          currentOccupancy: 0,
          roomType,
          amenities: 'Bathroom, Study Desk, Wardrobe, Bed',
          status: 'available'
        }).returning({ id: tables.rooms.id });

        roomIds.push(room[0].id);
      }
    }
  }

  // Students (30)
  console.log('Creating students...');
  const firstNames = ['Aisha', 'Brian', 'Cynthia', 'David', 'Eunice', 'Felix', 'Grace', 'Hassan', 'Irene', 'John', 'Kevin', 'Linda', 'Mary', 'Noah', 'Olivia', 'Peter', 'Queen', 'Ryan', 'Sarah', 'Thomas', 'Ummy', 'Victor', 'Winnie', 'Xavier', 'Yvonne', 'Zach', 'Alice', 'Ben', 'Carol', 'Dennis'];
  const lastNames = ['Omondi', 'Kamau', 'Wanjiru', 'Otieno', 'Mwangi', 'Wambui', 'Njeri', 'Kipruto', 'Mutua', 'Ouma'];
  const semesters = ['2025-1', '2025-2'];

  const deptValues = Object.values(deptIds);
  const studentIds: number[] = [];

  for (let i = 1; i <= 30; i++) {
    const firstName = firstNames[(i - 1) % firstNames.length];
    const lastName = rand(lastNames);
    const gender = i % 2 === 0 ? 'Female' : 'Male';
    const studentId = `student${String(i).padStart(3, '0')}`;
    const email = `student${i}@ueab.ac.ke`;
    const phone = `07${randint(10, 99)}${randint(100000, 999999)}`;
    const address = `PO Box ${randint(100, 999)}, Eldoret`;
    const departmentId = rand(deptValues);
    const school = await db.select().from(tables.departments).where(eq(tables.departments.id, departmentId));
    const schoolId = school[0]?.schoolId ?? null;
    const yearOfStudy = randint(1, 4);
    const currentSemester = rand(semesters);

    const stu = await db.insert(tables.students).values({
      studentId,
      firstName, lastName, gender,
      dob: `200${randint(0, 6)}-${randint(1, 12).toString().padStart(2, '0')}-${randint(1, 28).toString().padStart(2, '0')}`,
      email, phone, address, schoolId, departmentId, yearOfStudy, currentSemester
    }).returning({ id: tables.students.id });

    studentIds.push(stu[0].id);

    // Allocate residence
    const isOnCampus = Math.random() > 0.2; // 80% on campus

    if (isOnCampus) {
      // Find appropriate hostel based on gender
      const appropriateHostels = gender === 'Male'
        ? ['New Men Dorm', 'Old Men Dorm']
        : ['Box Ladies Hostel', 'Annex Ladies Hostel', 'Grace Ladies Hostel'];

      const selectedHostelName = rand(appropriateHostels);
      const selectedHostelId = hostelIds[selectedHostelName];

      // Find an available room in this hostel
      const availableRooms = await db.select()
        .from(tables.rooms)
        .where(eq(tables.rooms.hostelId, selectedHostelId));

      const notFullRooms = availableRooms.filter(r => (r.currentOccupancy ?? 0) < (r.capacity ?? 4));

      if (notFullRooms.length > 0) {
        const selectedRoom = rand(notFullRooms);
        const bedNames = ['Bed A', 'Bed B', 'Bed C', 'Bed D'];
        const bedNumber = bedNames[selectedRoom.currentOccupancy ?? 0];

        await db.insert(tables.residences).values({
          studentId: stu[0].id,
          residenceType: 'on-campus',
          hostelId: selectedHostelId,
          roomId: selectedRoom.id,
          bedNumber,
          offCampusHostelName: null,
          offCampusRoomNumber: null,
          offCampusArea: null
        });

        // Update room occupancy
        await db.update(tables.rooms)
          .set({
            currentOccupancy: (selectedRoom.currentOccupancy ?? 0) + 1,
            status: (selectedRoom.currentOccupancy ?? 0) + 1 >= (selectedRoom.capacity ?? 4) ? 'full' : 'available'
          })
          .where(eq(tables.rooms.id, selectedRoom.id));
      }
    } else {
      // Off-campus - with proper area names, hostel names, and room numbers
      const offCampusAreas = ['Chemundu', 'Kapsabet', 'Tilalwa', 'Chepterit', 'Kimondi', 'Baracee', 'Kapsisiwa', 'Laviva'];
      const offCampusHostels = ['Richmond Apartments', 'Soweto Hostels', 'Twin Towers', 'Spring Valley Hostels', 'YoungMan Hostels', 'Grace Hostels', 'Paradise Inn', 'Student Plaza'];
      const roomNumberFormats = [
        () => `${String.fromCharCode(65 + randint(0, 5))}${randint(1, 20)}`, // A1, B15, etc.
        () => `Room ${randint(1, 50)}`, // Room 1, Room 25, etc.
        () => `${randint(1, 5)}${String.fromCharCode(65 + randint(0, 10))}`, // 1A, 3F, etc.
      ];

      const selectedArea = rand(offCampusAreas);
      const selectedHostel = rand(offCampusHostels);
      const roomNumber = rand(roomNumberFormats)();

      await db.insert(tables.residences).values({
        studentId: stu[0].id,
        residenceType: 'off-campus',
        hostelId: null,
        roomId: null,
        bedNumber: null,
        offCampusHostelName: selectedHostel,
        offCampusRoomNumber: roomNumber,
        offCampusArea: selectedArea
      });
    }

    // Enroll in 3 random courses from same department
    const courses = await db.select().from(tables.courses).where(eq(tables.courses.departmentId, departmentId));
    const sample = courses.sort(() => 0.5 - Math.random()).slice(0, 3);
    for (const c of sample) {
      await db.insert(tables.enrollments).values({
        studentId: stu[0].id,
        courseId: c.id,
        semester: currentSemester,
        status: 'registered'
      });
    }

    // Fees
    const amountBilled = (60000 + randint(0, 30000)).toString();
    const amountPaid = Math.max(0, 60000 + randint(0, 30000) - randint(0, 30000)).toString();
    await db.insert(tables.fees).values({
      studentId: stu[0].id,
      semester: currentSemester,
      amountBilled,
      amountPaid
    });
  }

  // Create Appointments (University Events)
  console.log('Creating appointments...');

  const creatorId = lecturers[0]; // Use first lecturer as creator
  const appointmentIds: number[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to start of today

  // Define recurring schedule
  const recurringSchedule = [
    {
      dayOfWeek: 2, // Tuesday
      title: 'Tuesday Assembly',
      type: 'assembly',
      venue: () => rand(['Auditorium', 'Amphitheatre', 'Baraton Union Church(BUC)']),
      time: { hour: 11, minute: 0 }, // 11:00 AM - 12:00 PM
      mandatory: true
    },
    {
      dayOfWeek: 3, // Wednesday
      title: 'Wednesday Evening Church Service',
      type: 'church',
      venue: () => 'Baraton Union Church(BUC)',
      time: { hour: 18, minute: 0 }, // 6:00 PM
      mandatory: true
    },
    {
      dayOfWeek: 5, // Friday
      title: 'Friday Evening Church Service',
      type: 'church',
      venue: () => 'Baraton Union Church(BUC)',
      time: { hour: 18, minute: 0 }, // 6:00 PM
      mandatory: true
    },
    {
      dayOfWeek: 6, // Saturday
      title: 'Saturday Morning Church Service',
      type: 'church',
      venue: () => 'Baraton Union Church(BUC)',
      time: { hour: 9, minute: 0 }, // 9:00 AM - 12:30 PM
      mandatory: true
    },
    {
      dayOfWeek: 6, // Saturday
      title: 'Saturday Evening Church Service',
      type: 'church',
      venue: () => 'Baraton Union Church(BUC)',
      time: { hour: 18, minute: 0 }, // 6:00 PM
      mandatory: true
    }
  ];

  // Generate appointments for the past 8 weeks (to have historical data)
  const pastWeeksToGenerate = 8;
  // Generate appointments for the next 12 weeks (3 months of upcoming events)
  const futureWeeksToGenerate = 12;
  let appointmentCount = 0;

  // Generate PAST appointments (with attendance marked)
  for (let weekOffset = pastWeeksToGenerate - 1; weekOffset >= 0; weekOffset--) {
    for (const schedule of recurringSchedule) {
      // Calculate the date for this appointment
      const appointmentDate = new Date(today);
      appointmentDate.setDate(today.getDate() - (weekOffset * 7));

      // Find the next occurrence of the target day of week
      const currentDay = appointmentDate.getDay();
      const daysUntilTarget = (schedule.dayOfWeek - currentDay + 7) % 7;
      appointmentDate.setDate(appointmentDate.getDate() + daysUntilTarget);

      // Set the time
      appointmentDate.setHours(schedule.time.hour, schedule.time.minute, 0, 0);

      // Only create if it's not in the future
      if (appointmentDate <= today) {
        const venue = typeof schedule.venue === 'function' ? schedule.venue() : schedule.venue;

        const appointment = await db.insert(tables.appointments).values({
          title: schedule.title,
          appointmentType: schedule.type,
          date: appointmentDate,
          venue: venue,
          description: `${schedule.title} - All students ${schedule.mandatory ? 'required' : 'invited'} to attend`,
          mandatory: schedule.mandatory,
          createdBy: creatorId
        }).returning({ id: tables.appointments.id });

        appointmentIds.push(appointment[0].id);
        appointmentCount++;

        // Mark attendance for past appointments only
        // Default is absent unless marked present (80% attendance rate for mandatory)
        for (const stuId of studentIds) {
          const attendanceRate = schedule.mandatory ? 0.80 : 0.40;
          const isPresent = Math.random() < attendanceRate;

          await db.insert(tables.appointmentAttendance).values({
            appointmentId: appointment[0].id,
            studentId: stuId,
            status: isPresent ? 'present' : 'absent',
            markedBy: creatorId,
            notes: isPresent ? null : (Math.random() > 0.7 ? 'Excused - Medical' : null)
          });
        }
      }
    }
  }

  // Generate FUTURE appointments (no attendance marked yet)
  for (let weekOffset = 0; weekOffset < futureWeeksToGenerate; weekOffset++) {
    for (const schedule of recurringSchedule) {
      // Calculate the date for this appointment
      const appointmentDate = new Date(today);
      appointmentDate.setDate(today.getDate() + (weekOffset * 7));

      // Find the next occurrence of the target day of week
      const currentDay = appointmentDate.getDay();
      const daysUntilTarget = (schedule.dayOfWeek - currentDay + 7) % 7;
      appointmentDate.setDate(appointmentDate.getDate() + daysUntilTarget);

      // Set the time
      appointmentDate.setHours(schedule.time.hour, schedule.time.minute, 0, 0);

      // Only create if it's in the future
      if (appointmentDate > today) {
        const venue = typeof schedule.venue === 'function' ? schedule.venue() : schedule.venue;

        const appointment = await db.insert(tables.appointments).values({
          title: schedule.title,
          appointmentType: schedule.type,
          date: appointmentDate,
          venue: venue,
          description: `${schedule.title} - All students ${schedule.mandatory ? 'required' : 'invited'} to attend`,
          mandatory: schedule.mandatory,
          createdBy: creatorId
        }).returning({ id: tables.appointments.id });

        appointmentIds.push(appointment[0].id);
        appointmentCount++;

        // No attendance records for future appointments
      }
    }
  }

  console.log(`Created ${appointmentCount} appointments with attendance records`);

  // ============================================
  // RESIDENCE ATTENDANCE (Daily Room Check-ins for On-Campus Students)
  // ============================================
  console.log('Seeding residence attendance records...');

  // Get all on-campus students with their hostel and room details
  const onCampusStudents = await db.select({
    studentId: tables.students.id,
    hostelName: tables.hostels.name,
    roomNumber: tables.rooms.roomNumber
  })
    .from(tables.residences)
    .innerJoin(tables.students, eq(tables.residences.studentId, tables.students.id))
    .innerJoin(tables.hostels, eq(tables.residences.hostelId, tables.hostels.id))
    .innerJoin(tables.rooms, eq(tables.residences.roomId, tables.rooms.id))
    .where(eq(tables.residences.residenceType, 'on-campus'));

  console.log(`Found ${onCampusStudents.length} on-campus students for daily room attendance`);

  // Generate daily attendance for the past 2 months (60 days)
  const daysToGenerate = 60;
  let residenceAttendanceCount = 0;

  for (let dayOffset = daysToGenerate - 1; dayOffset >= 0; dayOffset--) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - dayOffset);

    // Set to 10 PM (22:00) for evening room check
    checkDate.setHours(22, 0, 0, 0);

    // Only create if it's in the past (not today or future)
    if (checkDate < today) {
      for (const student of onCampusStudents) {
        // 90% attendance rate for room check-ins (students present in their rooms)
        const isPresent = Math.random() < 0.90;

        await db.insert(tables.residenceAttendance).values({
          studentId: student.studentId,
          date: checkDate,
          status: isPresent ? 'present' : 'absent',
          officerId: creatorId, // Warden or security officer
          hostelName: student.hostelName,
          roomNumber: student.roomNumber,
          notes: isPresent ? null : (Math.random() > 0.7 ? 'Out with permission' : null)
        });

        residenceAttendanceCount++;
      }
    }
  }

  console.log(`Created ${residenceAttendanceCount} residence attendance records`);

  // ============================================
  // WORK-STUDY SYSTEM
  // ============================================
  console.log('Seeding work-study system...');

  // Create work-study positions
  const workStudyPositionsData = [
    {
      title: 'Library Assistant',
      department: 'Library',
      description: 'Assist with shelving books, helping students find resources, and maintaining library order',
      requirements: 'Good organizational skills, friendly demeanor',
      hoursPerWeek: 10,
      payRatePerHour: '5.00',
      totalSlots: 4,
      filledSlots: 2
    },
    {
      title: 'IT Support Assistant',
      department: 'IT Department',
      description: 'Help students with basic computer issues, maintain computer labs',
      requirements: 'Basic computer troubleshooting skills',
      hoursPerWeek: 12,
      payRatePerHour: '6.50',
      totalSlots: 3,
      filledSlots: 2
    },
    {
      title: 'Cafeteria Staff',
      department: 'Cafeteria',
      description: 'Assist with food preparation, serving, and cleaning',
      requirements: 'Food handling certificate preferred',
      hoursPerWeek: 15,
      payRatePerHour: '4.50',
      totalSlots: 6,
      filledSlots: 4
    },
    {
      title: 'Student Center Receptionist',
      department: 'Student Affairs',
      description: 'Greet visitors, answer phones, provide information to students',
      requirements: 'Good communication skills, professional appearance',
      hoursPerWeek: 10,
      payRatePerHour: '5.50',
      totalSlots: 2,
      filledSlots: 1
    },
    {
      title: 'Grounds Maintenance Assistant',
      department: 'Facilities',
      description: 'Help maintain campus grounds, gardens, and outdoor spaces',
      requirements: 'Physical fitness, willingness to work outdoors',
      hoursPerWeek: 12,
      payRatePerHour: '4.00',
      totalSlots: 5,
      filledSlots: 3
    }
  ];

  const positionIds = [];
  for (const pos of workStudyPositionsData) {
    const [position] = await db.insert(tables.workStudyPositions).values({
      ...pos,
      supervisorId: creatorId,
      isActive: true
    }).returning({ id: tables.workStudyPositions.id });
    positionIds.push(position.id);
  }

  console.log(`Created ${positionIds.length} work-study positions`);

  // Select 5 random students for work-study (mix of approved and pending)
  const workStudyStudentIds = studentIds.slice(0, 5); // First 5 students

  let applicationCount = 0;
  let assignmentCount = 0;
  let timesheetCount = 0;

  for (let i = 0; i < workStudyStudentIds.length; i++) {
    const studentId = workStudyStudentIds[i];
    const isApproved = i < 3; // First 3 are approved, last 2 are pending

    // Create application
    const [application] = await db.insert(tables.workStudyApplications).values({
      studentId,
      academicYear: '2025-2026',
      semester: '2025-1',
      reason: 'Need financial assistance to cover tuition and living expenses',
      financialNeed: 'Family income is limited, need to support my education',
      previousWorkExperience: i % 2 === 0 ? 'Worked at local shop during holidays' : null,
      skills: ['Computer skills', 'Customer service', 'Time management'][i % 3],
      availability: i % 2 === 0 ? 'Afternoons and weekends' : 'Morning shifts preferred',
      status: isApproved ? 'approved' : 'pending',
      reviewedBy: isApproved ? creatorId : null,
      reviewedAt: isApproved ? new Date() : null,
      reviewNotes: isApproved ? 'Application approved - good academic standing' : null
    }).returning({ id: tables.workStudyApplications.id });

    applicationCount++;

    // If approved, update student workStudy flag and create assignment
    if (isApproved) {
      await db.update(tables.students)
        .set({ workStudy: true })
        .where(eq(tables.students.id, studentId));

      // Assign to a position
      const positionId = positionIds[i % positionIds.length];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Started 30 days ago

      const [assignment] = await db.insert(tables.workStudyAssignments).values({
        studentId,
        positionId,
        startDate,
        endDate: null,
        status: 'active',
        assignedBy: creatorId,
        notes: 'Initial assignment for academic year 2025-2026'
      }).returning({ id: tables.workStudyAssignments.id });

      assignmentCount++;

      // Create timesheets for the past 3 weeks (3 days per week)
      for (let week = 0; week < 3; week++) {
        for (let day = 0; day < 3; day++) {
          const workDate = new Date();
          workDate.setDate(workDate.getDate() - (week * 7 + day * 2));
          workDate.setHours(14, 0, 0, 0); // 2 PM start

          const clockInTime = new Date(workDate);
          const hoursWorked = 3 + Math.random() * 2; // 3-5 hours
          const clockOutTime = new Date(clockInTime);
          clockOutTime.setHours(clockInTime.getHours() + hoursWorked);

          const isApprovedTimesheet = week < 2; // Last 2 weeks approved, current week pending

          await db.insert(tables.workStudyTimesheets).values({
            assignmentId: assignment.id,
            studentId,
            date: workDate,
            clockIn: clockInTime,
            clockOut: clockOutTime,
            hoursWorked: hoursWorked.toFixed(2),
            taskDescription: [
              'Assisted students at reference desk',
              'Organized returned books',
              'Updated computer inventory',
              'Helped with tech support tickets',
              'Cleaned and organized workspace'
            ][Math.floor(Math.random() * 5)],
            supervisorId: creatorId,
            approved: isApprovedTimesheet,
            approvedAt: isApprovedTimesheet ? new Date() : null,
            notes: null
          });

          timesheetCount++;
        }
      }
    }
  }

  console.log(`Created ${applicationCount} work-study applications`);
  console.log(`Created ${assignmentCount} work-study assignments`);
  console.log(`Created ${timesheetCount} timesheet entries`);

  // Metadata
  await db.insert(tables.metadata).values({
    key: 'university_name',
    value: 'University of Eastern Africa, Baraton'
  }).onConflictDoNothing();

  console.log('===========================================');
  console.log('Seed complete!');
  console.log(`Created ${schoolIds.length} schools`);
  console.log(`Created ${Object.keys(deptIds).length} departments`);
  console.log(`Created ${Object.keys(hostelIds).length} hostels`);
  console.log(`Created ${roomIds.length} rooms`);
  console.log(`Created ${studentIds.length} students`);
  console.log(`Created ${appointmentCount} appointments`);
  console.log(`Created ${studentIds.length * appointmentCount} appointment attendance records`);
  console.log(`Created ${residenceAttendanceCount} residence attendance records (daily room checks)`);
  console.log(`Created ${positionIds.length} work-study positions`);
  console.log(`Created ${applicationCount} work-study applications (${assignmentCount} approved)`);
  console.log(`Created ${timesheetCount} timesheet entries`);
  console.log('===========================================');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
