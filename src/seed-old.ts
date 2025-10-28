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
  const roleNames = ['Chancellor', 'Vice Chancellor', 'Dean', 'HOD', 'Lecturer', 'Bursar', 'Registrar', 'Student'];
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

  // Students (20)
  const firstNames = ['Aisha', 'Brian', 'Cynthia', 'David', 'Eunice', 'Felix', 'Grace', 'Hassan', 'Irene', 'John', 'Kevin', 'Linda', 'Mary', 'Noah', 'Olivia', 'Peter', 'Queen', 'Ryan', 'Sarah', 'Thomas'];
  const lastNames = ['Omondi', 'Kamau', 'Wanjiru', 'Otieno', 'Mwangi', 'Wambui', 'Njeri', 'Kipruto', 'Mutua', 'Ouma'];
  const genders = ['Male', 'Female'];
  const semesters = ['2025-1', '2025-2'];
  const hostels = ['Harmony Hall', 'Victory Hostel', 'Grace Hostel', 'Faith Hall', 'Pioneer Hostel'];

  const deptValues = Object.values(deptIds);

  for (let i = 1; i <= 20; i++) {
    const firstName = firstNames[(i - 1) % firstNames.length];
    const lastName = rand(lastNames);
    const gender = rand(genders);
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

    // Residence info
    const isOnCampus = Math.random() > 0.3; // 70% on campus
    if (isOnCampus) {
      await db.insert(tables.residences).values({
        studentId: stu[0].id,
        residenceType: 'on-campus',
        hostelName: rand(hostels),
        roomNumber: `${randint(1, 5)}${String.fromCharCode(65 + randint(0, 4))}${randint(1, 30)}`,
        offCampusAddress: null
      });
    } else {
      await db.insert(tables.residences).values({
        studentId: stu[0].id,
        residenceType: 'off-campus',
        hostelName: null,
        roomNumber: null,
        offCampusAddress: `Plot ${randint(1, 200)}, ${rand(['Kapsoya', 'Pioneer', 'Elgon View', 'West Indies'])} Estate, Eldoret`
      });
    }

    // Enroll 3 random courses from same department
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

  // Metadata
  await db.insert(tables.metadata).values({
    key: 'university_name',
    value: 'University of Eastern Africa, Baraton'
  }).onConflictDoNothing();

  console.log('Seed complete - created 20 students with UEAB emails');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});