import { Prisma, PrismaClient } from "@prisma/client"

export type CbcReferenceNode = {
  code: string
  parentCode: string | null
  title: string
  nodeType: "PATHWAY" | "GRADE" | "LEARNING_AREA" | "OTHER"
  sequence: number
  gradeFrom?: string
  gradeTo?: string
  isAssessable: boolean
  metadata?: Record<string, unknown>
}

export async function seedKenyaCbcReferenceTree(prisma: PrismaClient, curriculumVersionId: string) {
  const nodeIds = new Map<string, string>()
  for (const definition of buildKenyaCbcReferenceNodes()) {
    const parentId = definition.parentCode ? nodeIds.get(definition.parentCode) : null
    if (definition.parentCode && !parentId) throw new Error(`Missing CBC parent node: ${definition.parentCode}`)
    const metadata = definition.metadata as Prisma.InputJsonValue | undefined
    const node = await prisma.curriculumNode.upsert({
      where: { curriculumVersionId_code: { curriculumVersionId, code: definition.code } },
      create: {
        curriculumVersionId,
        parentId,
        code: definition.code,
        title: definition.title,
        nodeType: definition.nodeType,
        sequence: definition.sequence,
        gradeFrom: definition.gradeFrom,
        gradeTo: definition.gradeTo,
        isAssessable: definition.isAssessable,
        metadata,
      },
      update: {
        parentId,
        title: definition.title,
        nodeType: definition.nodeType,
        sequence: definition.sequence,
        gradeFrom: definition.gradeFrom,
        gradeTo: definition.gradeTo,
        isAssessable: definition.isAssessable,
        metadata,
      },
    })
    nodeIds.set(definition.code, node.id)
  }
  return nodeIds
}

type AreaGroup = { title: string; children?: string[]; cluster?: string }
type Stage = { code: string; title: string; grades: string[]; areas: AreaGroup[] }

const stages: Stage[] = [
  {
    code: "PRE-PRIMARY",
    title: "Pre-Primary",
    grades: ["PP1", "PP2"],
    areas: [
      { title: "Creative Activities" },
      { title: "Language Activities", children: ["Kiswahili Activities", "Indigenous Language Activities", "English Activities"] },
      { title: "Religious Activities" },
      { title: "Environmental Activities" },
      { title: "Mathematical Activities" },
    ],
  },
  {
    code: "LOWER-PRIMARY",
    title: "Lower Primary",
    grades: ["Grade 1", "Grade 2", "Grade 3"],
    areas: [
      { title: "Creative Activities" },
      { title: "Kiswahili Activities" },
      { title: "Indigenous Language Activities" },
      { title: "English Activities" },
      { title: "Religious Activities" },
      { title: "Environmental Activities" },
      { title: "Mathematical Activities" },
    ],
  },
  {
    code: "UPPER-PRIMARY",
    title: "Upper Primary",
    grades: ["Grade 4", "Grade 5", "Grade 6"],
    areas: [
      { title: "Creative Arts" },
      { title: "Kiswahili / Kenya Sign Language" },
      { title: "English" },
      { title: "Religious Education" },
      { title: "Social Studies" },
      { title: "Science & Technology" },
      { title: "Agriculture" },
      { title: "Mathematics" },
    ],
  },
  {
    code: "JUNIOR-SCHOOL",
    title: "Junior School",
    grades: ["Grade 7", "Grade 8", "Grade 9"],
    areas: [
      { title: "English" },
      { title: "Kiswahili / Kenya Sign Language" },
      { title: "Mathematics" },
      { title: "Integrated Science", cluster: "STEM" },
      { title: "Social Studies" },
      { title: "Pre-technical Studies", cluster: "STEM" },
      { title: "Religious Education" },
      { title: "Creative Arts & Sports" },
      { title: "Agriculture & Nutrition", cluster: "STEM" },
    ],
  },
  { code: "SENIOR-SCHOOL", title: "Senior School", grades: ["Grade 10", "Grade 11", "Grade 12"], areas: [] },
]

const assessmentByGrade: Record<string, Record<string, unknown>> = {
  "Grade 3": { milestones: [{ mainstream: "Kenya Early Years Assessment (KEYA)", specialNeeds: "Kenya Foundation Level Education Assessment", profile: "Diagnostic and formative assessment" }] },
  "Grade 4": { milestones: [{ mainstream: "School-Based Assessment (SBA)", profile: "Progress profile" }] },
  "Grade 5": { milestones: [{ mainstream: "School-Based Assessment (SBA)", profile: "Progress profile" }] },
  "Grade 6": { milestones: [{ mainstream: "Kenya Primary School Education Assessment (KPSEA)", specialNeeds: "Kenya Intermediate Level Education Assessment", profile: "Summative assessment plus preceding SBA evidence" }] },
  "Grade 7": { milestones: [{ mainstream: "School-Based Assessment (SBA)", profile: "Contributes to Grade 9 assessment profile" }] },
  "Grade 8": { milestones: [{ mainstream: "School-Based Assessment (SBA)", profile: "Contributes to Grade 9 assessment profile" }] },
  "Grade 9": { milestones: [{ mainstream: "Kenya Junior School Education Assessment (KJSEA)", specialNeeds: "Kenya Pre-Vocational Level Education Assessment", profile: "KJSEA summative plus Grade 7–8 SBA and KPSEA evidence" }] },
  "Grade 10": { milestones: [{ mainstream: "School-Based Assessment (SBA)", profile: "Contributes to Senior School assessment profile" }] },
  "Grade 11": { milestones: [{ mainstream: "School-Based Assessment (SBA)", profile: "Contributes to Senior School assessment profile" }] },
  "Grade 12": { milestones: [{ mainstream: "Kenya Certificate of Basic Education (KCBE)", specialNeeds: "Independent or appropriate certification", profile: "Final Senior School assessment" }] },
}

const seniorPathways = [
  {
    code: "STEM", title: "STEM", tracks: [
      { code: "PURE-SCIENCE", title: "Pure Sciences", subjects: ["Chemistry", "Physics", "Biology", "General Science"] },
      { code: "APPLIED-SCIENCE", title: "Applied Sciences", subjects: ["Agriculture", "Computer Studies", "Home Science"] },
      { code: "TECHNICAL-STUDIES", title: "Technical Studies", subjects: ["Aviation", "Building Construction", "Electricity", "Marine & Fisheries Technology", "Media Technology", "Metalwork", "Woodwork", "Power Mechanics"] },
    ],
  },
  {
    code: "SOCIAL-SCIENCES", title: "Social Sciences", tracks: [
      { code: "LANGUAGE-LITERATURE", title: "Language and Literature", subjects: ["Literature in English", "Fasihi ya Kiswahili", "Sign Language", "Arabic", "French", "German", "Chinese", "Indigenous Languages"] },
      { code: "HUMANITIES", title: "Humanities", subjects: ["Religious Education (CRE / IRE / HRE)", "History and Citizenship", "Geography", "Business Studies"] },
    ],
  },
  {
    code: "ARTS-SPORTS-SCIENCE", title: "Arts & Sports Science", tracks: [
      { code: "ARTS", title: "Arts", subjects: ["Music and Dance", "Theatre and Film", "Fine Arts"] },
      { code: "SPORTS-SCIENCE", title: "Sports Science", subjects: ["Sports and Recreation"] },
    ],
  },
]

const slug = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "")
export const cbcNodeCode = (...parts: string[]) => parts.map(slug).join(".")

export function cbcGradeSequence(grade: string) {
  if (grade === "PP1") return 0
  if (grade === "PP2") return 1
  const match = grade.match(/^Grade (\d+)$/)
  return match ? Number(match[1]) + 1 : 99
}

export function buildKenyaCbcReferenceNodes(): CbcReferenceNode[] {
  const nodes: CbcReferenceNode[] = []
  for (const [stageSequence, stage] of stages.entries()) {
    nodes.push({ code: stage.code, parentCode: null, title: stage.title, nodeType: "PATHWAY", sequence: stageSequence, gradeFrom: stage.grades[0], gradeTo: stage.grades[stage.grades.length - 1], isAssessable: false, metadata: { frameworkStage: true } })
    for (const [gradeSequence, grade] of stage.grades.entries()) {
      const gradeCode = cbcNodeCode(stage.code, grade)
      nodes.push({ code: gradeCode, parentCode: stage.code, title: grade, nodeType: "GRADE", sequence: gradeSequence, gradeFrom: grade, gradeTo: grade, isAssessable: false, metadata: assessmentByGrade[grade] })
      for (const [areaSequence, area] of stage.areas.entries()) {
        const areaCode = cbcNodeCode(stage.code, grade, area.title)
        nodes.push({ code: areaCode, parentCode: gradeCode, title: area.title, nodeType: "LEARNING_AREA", sequence: areaSequence, gradeFrom: grade, gradeTo: grade, isAssessable: false, metadata: area.cluster ? { cluster: area.cluster } : undefined })
        for (const [childSequence, child] of (area.children ?? []).entries()) {
          nodes.push({ code: cbcNodeCode(stage.code, grade, area.title, child), parentCode: areaCode, title: child, nodeType: "LEARNING_AREA", sequence: childSequence, gradeFrom: grade, gradeTo: grade, isAssessable: false })
        }
      }
    }
  }

  const seniorCode = "SENIOR-SCHOOL"
  for (const [pathwaySequence, pathway] of seniorPathways.entries()) {
    const pathwayCode = cbcNodeCode(seniorCode, pathway.code)
    nodes.push({ code: pathwayCode, parentCode: seniorCode, title: pathway.title, nodeType: "PATHWAY", sequence: pathwaySequence, gradeFrom: "Grade 10", gradeTo: "Grade 12", isAssessable: false, metadata: { appliesToGrades: ["Grade 10", "Grade 11", "Grade 12"] } })
    for (const [trackSequence, track] of pathway.tracks.entries()) {
      const trackCode = cbcNodeCode(seniorCode, pathway.code, track.code)
      nodes.push({ code: trackCode, parentCode: pathwayCode, title: track.title, nodeType: "OTHER", sequence: trackSequence, gradeFrom: "Grade 10", gradeTo: "Grade 12", isAssessable: false, metadata: { structureType: "TRACK" } })
      for (const [subjectSequence, subject] of track.subjects.entries()) {
        nodes.push({ code: cbcNodeCode(seniorCode, pathway.code, track.code, subject), parentCode: trackCode, title: subject, nodeType: "LEARNING_AREA", sequence: subjectSequence, gradeFrom: "Grade 10", gradeTo: "Grade 12", isAssessable: false, metadata: { structureType: "SUBJECT" } })
      }
    }
  }
  return nodes
}

export function kenyaCbcReferenceSummary() {
  return {
    version: "2026.10",
    stages: stages.map((stage) => ({ code: stage.code, title: stage.title, grades: stage.grades })),
    pathways: seniorPathways.map(({ code, title }) => ({ code, title })),
  }
}