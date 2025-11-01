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
        const capacity = 2; // All rooms are double occupancy

        const room = await db.insert(tables.rooms).values({
          hostelId,
          roomNumber,
          floor,
          capacity,
          currentOccupancy: 0,
          roomType: 'double',
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

      const notFullRooms = availableRooms.filter(r => (r.currentOccupancy ?? 0) < (r.capacity ?? 2));

      if (notFullRooms.length > 0) {
        const selectedRoom = rand(notFullRooms);
        const bedNumber = selectedRoom.currentOccupancy === 0 ? 'Bed A' : 'Bed B';

        await db.insert(tables.residences).values({
          studentId: stu[0].id,
          residenceType: 'on-campus',
          hostelId: selectedHostelId,
          roomId: selectedRoom.id,
          bedNumber,
          offCampusAddress: null,
          offCampusArea: null
        });

        // Update room occupancy
        await db.update(tables.rooms)
          .set({
            currentOccupancy: (selectedRoom.currentOccupancy ?? 0) + 1,
            status: (selectedRoom.currentOccupancy ?? 0) + 1 >= (selectedRoom.capacity ?? 2) ? 'full' : 'available'
          })
          .where(eq(tables.rooms.id, selectedRoom.id));
      }
    } else {
      // Off-campus
      await db.insert(tables.residences).values({
        studentId: stu[0].id,
        residenceType: 'off-campus',
        hostelId: null,
        roomId: null,
        bedNumber: null,
        offCampusAddress: `Plot ${randint(1, 200)}, ${rand(['Kapsoya', 'Pioneer', 'Elgon View', 'West Indies'])} Estate, Eldoret`,
        offCampusArea: rand(['Kapsoya', 'Pioneer', 'Elgon View', 'West Indies'])
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
  const weeksToGenerate = 8;
  let appointmentCount = 0;

  for (let weekOffset = weeksToGenerate - 1; weekOffset >= 0; weekOffset--) {
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

  console.log(`Created ${appointmentCount} appointments with attendance records`);

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
  console.log(`Created ${studentIds.length * appointmentCount} attendance records`);
  console.log('===========================================');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
