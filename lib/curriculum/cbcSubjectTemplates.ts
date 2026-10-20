import { prisma } from "@/lib/prisma"

export type CbcSubjectDefinition = {
  name: string
  code: string
  stage: "PRE-PRIMARY" | "LOWER-PRIMARY" | "UPPER-PRIMARY" | "JUNIOR-SCHOOL" | "COMMON"
}

export const KENYA_CBC_SUBJECTS: CbcSubjectDefinition[] = [
  // Common / Core
  { name: "Mathematics", code: "MATH", stage: "COMMON" },
  { name: "English", code: "ENG", stage: "COMMON" },
  { name: "Kiswahili / Kenya Sign Language", code: "KISW", stage: "COMMON" },

  // Pre-Primary & Lower Primary Activities
  { name: "Language Activities", code: "LANG_ACT", stage: "PRE-PRIMARY" },
  { name: "Mathematical Activities", code: "MATH_ACT", stage: "LOWER-PRIMARY" },
  { name: "English Activities", code: "ENG_ACT", stage: "LOWER-PRIMARY" },
  { name: "Kiswahili Activities", code: "KISW_ACT", stage: "LOWER-PRIMARY" },
  { name: "Environmental Activities", code: "ENV_ACT", stage: "LOWER-PRIMARY" },
  { name: "Creative Activities", code: "CREAT_ACT", stage: "LOWER-PRIMARY" },
  { name: "Religious Activities", code: "REL_ACT", stage: "LOWER-PRIMARY" },
  { name: "Indigenous Language Activities", code: "INDIG_LANG", stage: "LOWER-PRIMARY" },

  // Upper Primary
  { name: "Science & Technology", code: "SCI_TECH", stage: "UPPER-PRIMARY" },
  { name: "Social Studies", code: "SOC_STUD", stage: "UPPER-PRIMARY" },
  { name: "Religious Education (CRE / IRE / HRE)", code: "REL_ED", stage: "UPPER-PRIMARY" },
  { name: "Agriculture", code: "AGRIC", stage: "UPPER-PRIMARY" },
  { name: "Creative Arts", code: "CREAT_ARTS", stage: "UPPER-PRIMARY" },

  // Junior School (Grade 7 - 9)
  { name: "Integrated Science", code: "INT_SCI", stage: "JUNIOR-SCHOOL" },
  { name: "Pre-technical Studies", code: "PRE_TECH", stage: "JUNIOR-SCHOOL" },
  { name: "Agriculture & Nutrition", code: "AGRIC_NUTR", stage: "JUNIOR-SCHOOL" },
  { name: "Creative Arts & Sports", code: "CAS", stage: "JUNIOR-SCHOOL" },
]

export async function autoPopulateSchoolSubjects(schoolId: string, level?: string | null) {
  let targets = KENYA_CBC_SUBJECTS

  if (level === "PRIMARY") {
    targets = KENYA_CBC_SUBJECTS.filter((s) => s.stage !== "JUNIOR-SCHOOL")
  } else if (level === "JUNIOR") {
    targets = KENYA_CBC_SUBJECTS.filter((s) =>
      ["COMMON", "JUNIOR-SCHOOL", "UPPER-PRIMARY"].includes(s.stage)
    )
  }

  // Deduplicate by code
  const uniqueTargets = Array.from(new Map(targets.map((item) => [item.code, item])).values())

  const created = []
  for (const item of uniqueTargets) {
    const record = await prisma.subject.upsert({
      where: {
        schoolId_code: {
          schoolId,
          code: item.code,
        },
      },
      update: {
        name: item.name,
      },
      create: {
        schoolId,
        code: item.code,
        name: item.name,
      },
      select: { id: true, name: true, code: true, schoolId: true },
    })
    created.push(record)
  }

  return created
}
