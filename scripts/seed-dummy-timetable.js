const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const school = await prisma.school.findFirst({ where: { name: { contains: "Milimani" } } });
  if (!school) throw new Error("Milimani school not found");

  const year = await prisma.academicYear.findFirst({
    where: { schoolId: school.id, isCurrent: true },
    include: { periods: { orderBy: { sequence: "asc" } } }
  });
  if (!year) throw new Error("Active academic year not found");
  const period = year.periods[0]; // Term 1

  const grade4Class = await prisma.class.findFirst({ where: { schoolId: school.id, name: "Grade 4 A" } });
  if (!grade4Class) throw new Error("Grade 4 A class not found");

  const teacher = await prisma.user.findFirst({ where: { schoolId: school.id, name: { contains: "Grade 4" } } });
  if (!teacher) throw new Error("Grade 4 Teacher not found");

  // 1. Ensure CBC subjects exist
  const cbcSubjects = [
    { name: "Mathematics", code: "MATH" },
    { name: "English", code: "ENG" },
    { name: "Kiswahili / Kenya Sign Language", code: "KISW" },
    { name: "Science & Technology", code: "SCI_TECH" },
    { name: "Agriculture", code: "AGRIC" },
    { name: "Social Studies", code: "SOC_STUD" },
    { name: "Religious Education (CRE)", code: "REL_ED" },
    { name: "Creative Arts", code: "CREAT_ARTS" },
    { name: "Physical & Health Education", code: "PHE" },
  ];

  const subjectMap = new Map();
  for (const s of cbcSubjects) {
    const record = await prisma.subject.upsert({
      where: { schoolId_code: { schoolId: school.id, code: s.code } },
      update: { name: s.name },
      create: { schoolId: school.id, name: s.name, code: s.code },
    });
    subjectMap.set(s.code, record.id);
  }

  // 2. Assign Grade 4 Teacher as Homeroom Class Teacher
  const existingAssignment = await prisma.teacherClass.findFirst({
    where: { teacherId: teacher.id, classId: grade4Class.id, subjectId: null }
  });
  if (!existingAssignment) {
    await prisma.teacherClass.create({
      data: {
        teacherId: teacher.id,
        classId: grade4Class.id,
        subjectId: null,
      }
    });
  }

  // 3. Clear existing timetable entries for Grade 4 A in this year
  await prisma.timetableEntry.deleteMany({
    where: { classId: grade4Class.id, academicYearId: year.id }
  });

  // 4. Balanced 25-Period Schedule (Monday to Friday, 5 lessons per day)
  const schedule = [
    // MONDAY
    { day: "MONDAY", startTime: "08:20", endTime: "09:00", subject: "MATH", room: "Room 4A", notes: "Number concepts: place value and addition of multi-digit numbers" },
    { day: "MONDAY", startTime: "09:00", endTime: "09:40", subject: "ENG", room: "Room 4A", notes: "Listening and speaking: fluency and vocabulary acquisition" },
    { day: "MONDAY", startTime: "09:50", endTime: "10:30", subject: "SCI_TECH", room: "Science Lab", notes: "Living things: classification of plants in the immediate environment" },
    { day: "MONDAY", startTime: "10:30", endTime: "11:10", subject: "KISW", room: "Room 4A", notes: "Kusoma kwa ufahamu na msamiati wa mazingira" },
    { day: "MONDAY", startTime: "11:40", endTime: "12:20", subject: "CREAT_ARTS", room: "Art Studio", notes: "Drawing and color mixing using local natural materials" },

    // TUESDAY
    { day: "TUESDAY", startTime: "08:20", endTime: "09:00", subject: "ENG", room: "Room 4A", notes: "Reading comprehension and sentence construction" },
    { day: "TUESDAY", startTime: "09:00", endTime: "09:40", subject: "MATH", room: "Room 4A", notes: "Multiplication and division problem solving" },
    { day: "TUESDAY", startTime: "09:50", endTime: "10:30", subject: "AGRIC", room: "School Farm", notes: "Soil conservation and organic kitchen gardening" },
    { day: "TUESDAY", startTime: "10:30", endTime: "11:10", subject: "SOC_STUD", room: "Room 4A", notes: "Physical environment and our county leadership" },
    { day: "TUESDAY", startTime: "11:40", endTime: "12:20", subject: "PHE", room: "Sports Field", notes: "Locomotor skills, spatial awareness, and teamwork games" },

    // WEDNESDAY
    { day: "WEDNESDAY", startTime: "08:20", endTime: "09:00", subject: "MATH", room: "Room 4A", notes: "Fractions: half, quarter, eighths through concrete objects" },
    { day: "WEDNESDAY", startTime: "09:00", endTime: "09:40", subject: "SCI_TECH", room: "Science Lab", notes: "Matter and energy: states of matter and sound production" },
    { day: "WEDNESDAY", startTime: "09:50", endTime: "10:30", subject: "KISW", room: "Room 4A", notes: "Kuandika: insha fupi kuhusu familia yangu" },
    { day: "WEDNESDAY", startTime: "10:30", endTime: "11:10", subject: "REL_ED", room: "Room 4A", notes: "Moral values, honesty, and community stewardship" },
    { day: "WEDNESDAY", startTime: "11:40", endTime: "12:20", subject: "ENG", room: "Room 4A", notes: "Grammar: proper nouns, pronouns, and punctuation marks" },

    // THURSDAY
    { day: "THURSDAY", startTime: "08:20", endTime: "09:00", subject: "KISW", room: "Room 4A", notes: "Sarufi: majina, vitenzi na vielezi" },
    { day: "THURSDAY", startTime: "09:00", endTime: "09:40", subject: "MATH", room: "Room 4A", notes: "Measurement: length, perimeter, and standard metric units" },
    { day: "THURSDAY", startTime: "09:50", endTime: "10:30", subject: "SOC_STUD", room: "Room 4A", notes: "Historic built environments and cultural heritage preservation" },
    { day: "THURSDAY", startTime: "10:30", endTime: "11:10", subject: "AGRIC", room: "Room 4A", notes: "Crop protection, weeding, and water conservation practices" },
    { day: "THURSDAY", startTime: "11:40", endTime: "12:20", subject: "CREAT_ARTS", room: "Music Room", notes: "Traditional Kenyan folk songs and percussion rhythms" },

    // FRIDAY
    { day: "FRIDAY", startTime: "08:20", endTime: "09:00", subject: "ENG", room: "Room 4A", notes: "Creative writing and guided storytelling presentation" },
    { day: "FRIDAY", startTime: "09:00", endTime: "09:40", subject: "MATH", room: "Room 4A", notes: "Data handling: collecting information and creating tally charts" },
    { day: "FRIDAY", startTime: "09:50", endTime: "10:30", subject: "SCI_TECH", room: "Room 4A", notes: "Digestive system basics and healthy nutrition choices" },
    { day: "FRIDAY", startTime: "10:30", endTime: "11:10", subject: "REL_ED", room: "Room 4A", notes: "Interfaith harmony, peace building, and social responsibility" },
    { day: "FRIDAY", startTime: "11:40", endTime: "12:20", subject: "PHE", room: "Sports Field", notes: "Athletics, sprint relay transitions, and cool-down drills" },
  ];

  let created = 0;
  for (const item of schedule) {
    const entry = await prisma.timetableEntry.create({
      data: {
        schoolId: school.id,
        academicYearId: year.id,
        periodId: period.id,
        classId: grade4Class.id,
        teacherId: teacher.id,
        subjectId: subjectMap.get(item.subject),
        day: item.day,
        startTime: item.startTime,
        endTime: item.endTime,
        room: item.room,
        notes: item.notes,
      }
    });

    // Create session record for tracking
    await prisma.lessonWorkspaceSession.create({
      data: {
        schoolId: school.id,
        timetableEntryId: entry.id,
        teacherId: teacher.id,
        state: "OPEN",
      }
    });

    created++;
  }

  console.log(`✓ Successfully seeded ${created} timetable lessons for Grade 4 A (Monday to Friday)!`);
  console.log(`Class: Grade 4 A | Teacher: ${teacher.name} (${teacher.email})`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
