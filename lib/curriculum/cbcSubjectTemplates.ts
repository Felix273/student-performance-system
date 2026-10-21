import { prisma } from "@/lib/prisma"

export type CbcSubjectDefinition = {
  name: string
  code: string
  stage: "PRE-PRIMARY" | "LOWER-PRIMARY" | "UPPER-PRIMARY" | "JUNIOR-SCHOOL" | "COMMON"
}

export const KENYA_CBC_SUBJECTS: CbcSubjectDefinition[] = [
  // Core
  { name: "Mathematics", code: "MATH", stage: "COMMON" },
  { name: "English", code: "ENG", stage: "COMMON" },
  { name: "Kiswahili / Kenya Sign Language", code: "KISW", stage: "COMMON" },

  // Pre-Primary Activities (PP1 & PP2)
  { name: "Language Activities", code: "LANG_ACT", stage: "PRE-PRIMARY" },
  { name: "Mathematical Activities", code: "MATH_ACT", stage: "PRE-PRIMARY" },
  { name: "Environmental Activities", code: "ENV_ACT", stage: "PRE-PRIMARY" },
  { name: "Psychomotor and Creative Activities", code: "PSYCH_ACT", stage: "PRE-PRIMARY" },
  { name: "Religious Education Activities", code: "REL_ACT", stage: "PRE-PRIMARY" },

  // Lower Primary (Grades 1 - 3)
  { name: "Indigenous Language Activities", code: "INDIG_LANG", stage: "LOWER-PRIMARY" },
  { name: "Hygiene and Nutrition Activities", code: "HYG_NUTR", stage: "LOWER-PRIMARY" },
  { name: "Creative Activities", code: "CREAT_ACT", stage: "LOWER-PRIMARY" },

  // Upper Primary (Grades 4 - 6)
  { name: "Science & Technology", code: "SCI_TECH", stage: "UPPER-PRIMARY" },
  { name: "Social Studies", code: "SOC_STUD", stage: "UPPER-PRIMARY" },
  { name: "Religious Education (CRE / IRE / HRE)", code: "REL_ED", stage: "UPPER-PRIMARY" },
  { name: "Agriculture", code: "AGRIC", stage: "UPPER-PRIMARY" },
  { name: "Creative Arts", code: "CREAT_ARTS", stage: "UPPER-PRIMARY" },
  { name: "Physical and Health Education", code: "PHE", stage: "UPPER-PRIMARY" },

  // Junior School (Grades 7 - 9)
  { name: "Integrated Science", code: "INT_SCI", stage: "JUNIOR-SCHOOL" },
  { name: "Pre-technical Studies", code: "PRE_TECH", stage: "JUNIOR-SCHOOL" },
  { name: "Agriculture & Nutrition", code: "AGRIC_NUTR", stage: "JUNIOR-SCHOOL" },
  { name: "Creative Arts & Sports", code: "CAS", stage: "JUNIOR-SCHOOL" },
  { name: "Health Education", code: "HLTH_ED", stage: "JUNIOR-SCHOOL" },
]

export async function autoPopulateSchoolSubjects(schoolId: string, level?: string | null) {
  let targets = KENYA_CBC_SUBJECTS

  if (level === "PRE_PRIMARY") {
    // Only pre-primary activity areas
    targets = KENYA_CBC_SUBJECTS.filter((s) => s.stage === "PRE-PRIMARY")
  } else if (level === "PRIMARY") {
    // Pre-Primary, Lower Primary & Upper Primary
    targets = KENYA_CBC_SUBJECTS.filter((s) => s.stage !== "JUNIOR-SCHOOL")
  } else if (level === "PRIMARY_AND_JUNIOR") {
    // All levels from Pre-Primary up to Junior School
    targets = KENYA_CBC_SUBJECTS
  } else if (level === "JUNIOR") {
    // Junior School only (Grades 7 - 9)
    targets = KENYA_CBC_SUBJECTS.filter((s) =>
      ["COMMON", "JUNIOR-SCHOOL"].includes(s.stage)
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
