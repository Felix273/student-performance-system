#!/usr/bin/env npx ts-node --esm
/**
 * seed-cbc-curriculum.ts
 * ======================
 * Ingests the output of scripts/scrape_cbc.py (data/curriculum/<grade>.json)
 * into the existing Prisma schema as a system Curriculum called "Kenya CBC".
 *
 * Run AFTER the Python scraper has completed steps --crawl, --download, --parse:
 *
 *   npx tsx scripts/seed-cbc-curriculum.ts
 *   # or: npx ts-node --esm scripts/seed-cbc-curriculum.ts
 *   # or: npx prisma db seed   (if set as the seed command in package.json)
 *
 * The script is idempotent — run it again after re-parsing PDFs to update the
 * curriculum without duplicating records. It uses upserts on unique codes.
 *
 * ─── SCHEMA MAPPING ───────────────────────────────────────────────────────
 *   CBC concept            → Prisma model
 *   ─────────────────────────────────────────────────────────────────────────
 *   "Kenya CBC" (whole)    → Curriculum  (code: "KE-CBC")
 *   2022 version           → CurriculumVersion  (version: "2022")
 *   Level (pre-primary…)   → CurriculumNode  (nodeType: PATHWAY, gradeFrom/To)
 *   Grade (PP1, Grade 1…)  → CurriculumNode  (nodeType: GRADE)
 *   Learning Area (subj.)  → CurriculumNode  (nodeType: LEARNING_AREA)
 *   Strand                 → CurriculumNode  (nodeType: STRAND)
 *   Sub-strand             → CurriculumNode  (nodeType: SUB_STRAND)
 *   Learning Outcome       → LearningOutcome
 *   Core Competency        → Competency
 *   Value                  → Value
 *   CBC Rating Levels      → GradeScale + GradeScaleLevel
 *   Rubric (from PDF)      → Rubric + RubricCriterion + RubricLevel
 * ─────────────────────────────────────────────────────────────────────────
 */

import { PrismaClient, CurriculumNodeType, CurriculumVersionStatus, ScaleType } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

// ─── Types from the scraper output ────────────────────────────────────────
interface ScraperRow {
  strand?: string | null;
  sub_strand?: string | null;
  outcomes?: string[];
  experiences?: string[];
  inquiry_questions?: string[];
  core_competencies?: string;
  values?: string;
  [key: string]: unknown;
}

interface ScraperDoc {
  file: string;
  grade: string;
  level: string;
  category: string;
  learning_area: string | null;
  essence_statement: string | null;
  general_outcomes: string[];
  rows: ScraperRow[];
  rubrics: string[][][];
  raw_text_head: string;
}

// ─── Constants ────────────────────────────────────────────────────────────
const CURRICULUM_CODE = "KE-CBC";
const CURRICULUM_VERSION = "2022";

/** CBC KNEC rating scale — 4 levels used across all grades */
const CBC_RATING_LEVELS = [
  { code: "EE", label: "Exceeds Expectations", points: 4, sequence: 0 },
  { code: "ME", label: "Meets Expectations",   points: 3, sequence: 1 },
  { code: "AE", label: "Approaches Expectations", points: 2, sequence: 2 },
  { code: "BE", label: "Below Expectations",   points: 1, sequence: 3 },
];

/** Ordered levels as they appear in the KICD framework */
const CBC_LEVELS: Array<{ code: string; name: string; grades: string[]; seq: number }> = [
  { code: "PRE-PRIMARY",    name: "Pre-Primary",    grades: ["PP1", "PP2"],                                     seq: 0 },
  { code: "LOWER-PRIMARY",  name: "Lower Primary",  grades: ["Grade 1", "Grade 2", "Grade 3"],                  seq: 1 },
  { code: "UPPER-PRIMARY",  name: "Upper Primary",  grades: ["Grade 4", "Grade 5", "Grade 6"],                  seq: 2 },
  { code: "JUNIOR-SCHOOL",  name: "Junior School",  grades: ["Grade 7", "Grade 8", "Grade 9"],                  seq: 3 },
  { code: "SENIOR-SCHOOL",  name: "Senior School",  grades: ["Grade 10", "Grade 11", "Grade 12"],               seq: 4 },
];

/** Senior school pathways become PATHWAY-type nodes under Senior School */
const CBC_PATHWAYS = [
  { code: "STEM",     name: "STEM",                  seq: 0 },
  { code: "SOC-SCI",  name: "Social Sciences",        seq: 1 },
  { code: "ARTS-SPT", name: "Arts & Sports Science",  seq: 2 },
];

// ─── Slug helper ──────────────────────────────────────────────────────────
function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function nodeCode(parts: string[]): string {
  return parts.map((p) => slug(p).toUpperCase()).join(".");
}

// ─── Main seeding logic ───────────────────────────────────────────────────
async function main() {
  console.log("🌱  Seeding Kenya CBC curriculum…");

  // 1. Upsert the Curriculum record
  const curriculum = await prisma.curriculum.upsert({
    where: { code: CURRICULUM_CODE },
    create: {
      code: CURRICULUM_CODE,
      name: "Kenya Competency Based Curriculum",
      provider: "Kenya Institute of Curriculum Development (KICD)",
      country: "KE",
      description:
        "The Kenya CBC is a competency-based, learner-centred curriculum framework " +
        "replacing the 8-4-4 system, organised into Pre-Primary, Lower Primary, " +
        "Upper Primary, Junior School, and Senior School stages.",
      isSystem: true,
    },
    update: {
      name: "Kenya Competency Based Curriculum",
      provider: "Kenya Institute of Curriculum Development (KICD)",
    },
  });
  console.log(`  ✓ Curriculum: ${curriculum.name}`);

  // 2. Upsert the CurriculumVersion
  const version = await prisma.curriculumVersion.upsert({
    where: { curriculumId_version: { curriculumId: curriculum.id, version: CURRICULUM_VERSION } },
    create: {
      curriculumId: curriculum.id,
      version: CURRICULUM_VERSION,
      status: CurriculumVersionStatus.PUBLISHED,
      effectiveFrom: new Date("2019-01-01"),
      publishedAt: new Date("2022-01-01"),
      sourceUrl: "https://kicd.ac.ke/cbc-materials/curriculum-designs/",
      notes: "Seeded automatically from KICD public curriculum design PDFs.",
    },
    update: { status: CurriculumVersionStatus.PUBLISHED },
  });
  console.log(`  ✓ CurriculumVersion: ${version.version}`);

  // 3. Upsert the CBC 4-level GradeScale
  const gradeScale = await prisma.gradeScale.upsert({
    where: { curriculumVersionId_code: { curriculumVersionId: version.id, code: "CBC-4PT" } },
    create: {
      curriculumVersionId: version.id,
      code: "CBC-4PT",
      name: "CBC 4-Point Rating Scale",
      scaleType: ScaleType.CUSTOM,
    },
    update: { name: "CBC 4-Point Rating Scale" },
  });
  for (const level of CBC_RATING_LEVELS) {
    await prisma.gradeScaleBand.upsert({
      where: { gradeScaleId_code: { gradeScaleId: gradeScale.id, code: level.code } },
      create: {
        gradeScaleId: gradeScale.id,
        code: level.code,
        label: level.label,
        minValue: level.points - 1,
        maxValue: level.points,
        points: level.points,
        sequence: level.sequence,
      },
      update: { label: level.label, points: level.points },
    });
  }
  console.log(`  ✓ GradeScale: ${gradeScale.name} (4 levels)`);

  // 4. Upsert system Competencies (CBC core competencies)
  const CBC_COMPETENCIES = [
    { code: "COMMUNICATION", name: "Communication and Collaboration" },
    { code: "CRITICAL-THINKING", name: "Critical Thinking and Problem Solving" },
    { code: "IMAGINATION", name: "Imagination and Creativity" },
    { code: "CITIZENSHIP", name: "Citizenship" },
    { code: "DIGITAL-LITERACY", name: "Digital Literacy" },
    { code: "LEARNING-TO-LEARN", name: "Learning to Learn" },
    { code: "SELF-EFFICACY", name: "Self-Efficacy" },
  ];
  const competencyMap = new Map<string, string>(); // name.toLowerCase() -> id
  for (const c of CBC_COMPETENCIES) {
    const rec = await prisma.competency.upsert({
      where: { code: c.code },
      create: { code: c.code, name: c.name, isSystem: true },
      update: { name: c.name },
    });
    competencyMap.set(c.name.toLowerCase(), rec.id);
    // also index partial matches for messy PDF cell text
    competencyMap.set(c.code.toLowerCase(), rec.id);
  }
  console.log(`  ✓ Competencies: ${CBC_COMPETENCIES.length}`);

  // 5. Upsert system Values (CBC national values)
  const CBC_VALUES = [
    { code: "LOVE",        name: "Love" },
    { code: "RESPONSIBILITY", name: "Responsibility" },
    { code: "RESPECT",    name: "Respect" },
    { code: "UNITY",       name: "Unity" },
    { code: "PEACE",       name: "Peace" },
    { code: "PATRIOTISM",  name: "Patriotism" },
    { code: "SOCIAL-JUSTICE", name: "Social Justice" },
    { code: "INTEGRITY",   name: "Integrity" },
  ];
  const valueMap = new Map<string, string>(); // name.toLowerCase() -> id
  for (const v of CBC_VALUES) {
    const rec = await prisma.value.upsert({
      where: { code: v.code },
      create: { code: v.code, name: v.name, isSystem: true },
      update: { name: v.name },
    });
    valueMap.set(v.name.toLowerCase(), rec.id);
    valueMap.set(v.code.toLowerCase(), rec.id);
  }
  console.log(`  ✓ Values: ${CBC_VALUES.length}`);

  // 6. Upsert Level nodes (PATHWAY type in the schema)
  const levelNodeMap = new Map<string, string>(); // level code -> node id
  for (const level of CBC_LEVELS) {
    const code = nodeCode([level.code]);
    const node = await prisma.curriculumNode.upsert({
      where: { curriculumVersionId_code: { curriculumVersionId: version.id, code } },
      create: {
        curriculumVersionId: version.id,
        code,
        title: level.name,
        nodeType: CurriculumNodeType.PATHWAY, // closest semantic match for "level"
        sequence: level.seq,
        gradeFrom: level.grades[0],
        gradeTo: level.grades[level.grades.length - 1],
        isAssessable: false,
        metadata: { cbcLevel: level.code, grades: level.grades },
      },
      update: { title: level.name, sequence: level.seq },
    });
    levelNodeMap.set(level.code, node.id);
  }
  console.log(`  ✓ Level nodes: ${levelNodeMap.size}`);

  // 7. Upsert Pathway sub-nodes under Senior School
  const seniorNodeId = levelNodeMap.get("SENIOR-SCHOOL")!;
  const pathwayNodeMap = new Map<string, string>(); // pathway code -> node id
  for (const pw of CBC_PATHWAYS) {
    const code = nodeCode(["SENIOR-SCHOOL", pw.code]);
    const node = await prisma.curriculumNode.upsert({
      where: { curriculumVersionId_code: { curriculumVersionId: version.id, code } },
      create: {
        curriculumVersionId: version.id,
        parentId: seniorNodeId,
        code,
        title: pw.name,
        nodeType: CurriculumNodeType.PATHWAY,
        sequence: pw.seq,
        gradeFrom: "Grade 10",
        gradeTo: "Grade 12",
        isAssessable: false,
      },
      update: { title: pw.name },
    });
    pathwayNodeMap.set(pw.code, node.id);
  }
  console.log(`  ✓ Senior school pathway nodes: ${pathwayNodeMap.size}`);

  // 8. Load all scraped curriculum JSON files
  const dataDir = path.resolve("data/curriculum");
  if (!fs.existsSync(dataDir)) {
    console.warn("⚠️  data/curriculum/ not found. Base CBC metadata remains seeded.");
    console.warn("   Full curriculum tree is pending a valid downloadable source.");
    console.warn("   To continue later: python scripts/scrape_cbc.py --crawl --download --parse");
    return;
  }

  const gradeFiles = fs.readdirSync(dataDir).filter((f) => f.endsWith(".json"));
  if (gradeFiles.length === 0) {
    console.warn("⚠️  No valid curriculum JSON files were found in data/curriculum/");
    console.warn("   Base CBC metadata remains seeded; the full curriculum tree is deferred until a valid source is available.");
    console.warn("   This import is intentionally paused because KICD Google Drive files are blocked from download.");
    return;
  }

  console.log(`\n📂  Found ${gradeFiles.length} grade JSON file(s) in data/curriculum/`);

  let totalOutcomes = 0;

  for (const file of gradeFiles) {
    const docs: ScraperDoc[] = JSON.parse(
      fs.readFileSync(path.join(dataDir, file), "utf-8")
    );
    if (!docs.length) continue;

    // All docs in a file share the same grade
    const gradeName = docs[0].grade;
    const levelCode = docs[0].level.toUpperCase().replace(/-/g, "-");

    console.log(`\n  📗 ${gradeName} (${levelCode}) — ${docs.length} learning area(s)`);

    // 8a. Upsert Grade node
    const gradeParentId = levelNodeMap.get(levelCode) ?? null;
    const gradeNodeCode = nodeCode([levelCode, gradeName]);
    const gradeNode = await prisma.curriculumNode.upsert({
      where: { curriculumVersionId_code: { curriculumVersionId: version.id, code: gradeNodeCode } },
      create: {
        curriculumVersionId: version.id,
        parentId: gradeParentId,
        code: gradeNodeCode,
        title: gradeName,
        nodeType: CurriculumNodeType.GRADE,
        sequence: gradeSequence(gradeName),
        gradeFrom: gradeName,
        gradeTo: gradeName,
        isAssessable: false,
      },
      update: { title: gradeName },
    });

    for (const doc of docs) {
      const laName = doc.learning_area ?? doc.category ?? "Unknown";

      // 8b. Upsert Learning Area node
      const laCode = nodeCode([levelCode, gradeName, laName]);
      const laNode = await prisma.curriculumNode.upsert({
        where: { curriculumVersionId_code: { curriculumVersionId: version.id, code: laCode } },
        create: {
          curriculumVersionId: version.id,
          parentId: gradeNode.id,
          code: laCode,
          title: laName,
          description: doc.essence_statement ?? undefined,
          nodeType: CurriculumNodeType.LEARNING_AREA,
          sequence: 0,
          gradeFrom: gradeName,
          gradeTo: gradeName,
          isAssessable: false,
          metadata: {
            category: doc.category,
            sourceFile: doc.file,
            generalOutcomes: doc.general_outcomes,
          },
        },
        update: {
          title: laName,
          description: doc.essence_statement ?? undefined,
        },
      });

      // 8c. Process strands / sub-strands / outcomes from the rows
      const strandSeqMap = new Map<string, number>();
      const subStrandSeqMap = new Map<string, number>();
      const strandNodeMap = new Map<string, string>();   // strandName -> node id
      const subStrandNodeMap = new Map<string, string>(); // strandName|subName -> node id

      for (const row of doc.rows) {
        const strandName = row.strand ?? "General";
        const subStrandName = row.sub_strand ?? "General";

        // Strand node
        const strandCode = nodeCode([levelCode, gradeName, laName, strandName]);
        if (!strandNodeMap.has(strandName)) {
          const seq = strandSeqMap.size;
          strandSeqMap.set(strandName, seq);
          const strandNode = await prisma.curriculumNode.upsert({
            where: { curriculumVersionId_code: { curriculumVersionId: version.id, code: strandCode } },
            create: {
              curriculumVersionId: version.id,
              parentId: laNode.id,
              code: strandCode,
              title: strandName,
              nodeType: CurriculumNodeType.STRAND,
              sequence: seq,
              isAssessable: false,
            },
            update: { title: strandName },
          });
          strandNodeMap.set(strandName, strandNode.id);
        }
        const strandNodeId = strandNodeMap.get(strandName)!;

        // Sub-strand node
        const subKey = `${strandName}|${subStrandName}`;
        const subCode = nodeCode([levelCode, gradeName, laName, strandName, subStrandName]);
        if (!subStrandNodeMap.has(subKey)) {
          const seq = subStrandSeqMap.size;
          subStrandSeqMap.set(subKey, seq);
          const subNode = await prisma.curriculumNode.upsert({
            where: { curriculumVersionId_code: { curriculumVersionId: version.id, code: subCode } },
            create: {
              curriculumVersionId: version.id,
              parentId: strandNodeId,
              code: subCode,
              title: subStrandName,
              nodeType: CurriculumNodeType.SUB_STRAND,
              sequence: seq,
              isAssessable: true,
              metadata: {
                inquiryQuestions: row.inquiry_questions ?? [],
                suggestedExperiences: row.experiences ?? [],
              },
            },
            update: {
              title: subStrandName,
              metadata: {
                inquiryQuestions: row.inquiry_questions ?? [],
                suggestedExperiences: row.experiences ?? [],
              },
            },
          });
          subStrandNodeMap.set(subKey, subNode.id);

          // Link competencies mentioned in this sub-strand row
          await linkCompetencies(version.id, subNode.id, row.core_competencies, competencyMap);
          // Link values
          await linkValues(version.id, subNode.id, row.values, valueMap);
        }
        const subNodeId = subStrandNodeMap.get(subKey)!;

        // Learning outcomes
        const outcomes = row.outcomes ?? [];
        for (let i = 0; i < outcomes.length; i++) {
          const outcomeCode = `${subCode}.LO${String(i + 1).padStart(2, "0")}`;
          await prisma.learningOutcome.upsert({
            where: { curriculumNodeId_code: { curriculumNodeId: subNodeId, code: outcomeCode } },
            create: {
              curriculumNodeId: subNodeId,
              code: outcomeCode,
              statement: outcomes[i],
              suggestedActivities: (row.experiences ?? []).join("\n") || undefined,
              sequence: i,
              isAssessable: true,
            },
            update: {
              statement: outcomes[i],
              suggestedActivities: (row.experiences ?? []).join("\n") || undefined,
            },
          });
          totalOutcomes++;
        }
      }

      // 8d. Seed rubrics from the parsed PDF rubric tables
      await seedRubrics(version.id, laNode.id, doc.rubrics, laCode);
    }
  }

  console.log(`\n✅  Done! Seeded:`);
  console.log(`      Curriculum:  ${CURRICULUM_CODE} v${CURRICULUM_VERSION}`);
  console.log(`      Grade scale: CBC-4PT`);
  console.log(`      Competencies: ${CBC_COMPETENCIES.length}`);
  console.log(`      Values:       ${CBC_VALUES.length}`);
  console.log(`      Learning outcomes: ~${totalOutcomes}`);
  console.log(`\n  Nodes are queryable via CurriculumNode where`);
  console.log(`  curriculumVersion.curriculum.code = "${CURRICULUM_CODE}"`);
}

// ─── Helper: determine numeric sort order for grade names ─────────────────
function gradeSequence(grade: string): number {
  if (grade === "PP1") return 0;
  if (grade === "PP2") return 1;
  const m = grade.match(/(\d+)/);
  return m ? parseInt(m[1], 10) + 1 : 99;
}

// ─── Helper: link competencies from a raw cell text ───────────────────────
async function linkCompetencies(
  versionId: string,
  nodeId: string,
  rawText: string | undefined,
  competencyMap: Map<string, string>
) {
  if (!rawText) return;
  const tokens = rawText.split(/[,;•\n]/);
  for (const token of tokens) {
    const t = token.trim().toLowerCase();
    if (!t) continue;
    // fuzzy match: find any competency whose code or name is a substring
    for (const [key, compId] of competencyMap) {
      if (t.includes(key) || key.includes(t.substring(0, 8))) {
        try {
          await prisma.curriculumNodeCompetency.upsert({
            where: { curriculumNodeId_competencyId: { curriculumNodeId: nodeId, competencyId: compId } },
            create: { curriculumNodeId: nodeId, competencyId: compId, isPrimary: false },
            update: {},
          });
        } catch {
          // ignore FK race conditions
        }
        break;
      }
    }
  }
}

// ─── Helper: link values from a raw cell text ─────────────────────────────
async function linkValues(
  versionId: string,
  nodeId: string,
  rawText: string | undefined,
  valueMap: Map<string, string>
) {
  if (!rawText) return;
  const tokens = rawText.split(/[,;•\n]/);
  for (const token of tokens) {
    const t = token.trim().toLowerCase();
    if (!t) continue;
    for (const [key, valId] of valueMap) {
      if (t.includes(key) || key.includes(t.substring(0, 6))) {
        try {
          await prisma.curriculumNodeValue.upsert({
            where: { curriculumNodeId_valueId: { curriculumNodeId: nodeId, valueId: valId } },
            create: { curriculumNodeId: nodeId, valueId: valId },
            update: {},
          });
        } catch {
          // ignore
        }
        break;
      }
    }
  }
}

// ─── Helper: seed rubrics from the raw 2-D table arrays ──────────────────
async function seedRubrics(
  versionId: string,
  parentNodeId: string,
  rubricTables: string[][][],
  parentCode: string
) {
  for (let ri = 0; ri < rubricTables.length; ri++) {
    const table = rubricTables[ri];
    if (!table || table.length < 2) continue;

    const headerRow = table[0];
    const rubricCode = `${parentCode}.RUB${String(ri + 1).padStart(2, "0")}`;
    const rubricName = headerRow[0]?.trim() || `Rubric ${ri + 1}`;

    const rubric = await prisma.rubric.upsert({
      where: { curriculumVersionId_code: { curriculumVersionId: versionId, code: rubricCode } },
      create: {
        curriculumVersionId: versionId,
        code: rubricCode,
        name: rubricName,
        description: `Auto-generated from KICD PDF table for ${parentCode}`,
      },
      update: { name: rubricName },
    });

    // Each data row in the PDF rubric table = one RubricCriterion
    // Columns after the first = rating levels (EE, ME, AE, BE order)
    const levelLabels = headerRow.slice(1).filter(Boolean);

    for (let rowIdx = 1; rowIdx < table.length; rowIdx++) {
      const dataRow = table[rowIdx];
      const criterionName = dataRow[0]?.trim();
      if (!criterionName) continue;

      const criterionCode = `${rubricCode}.C${String(rowIdx).padStart(2, "0")}`;
      const criterion = await prisma.rubricCriterion.upsert({
        where: { rubricId_code: { rubricId: rubric.id, code: criterionCode } },
        create: {
          rubricId: rubric.id,
          code: criterionCode,
          name: criterionName,
          sequence: rowIdx - 1,
        },
        update: { name: criterionName },
      });

      for (let colIdx = 0; colIdx < levelLabels.length; colIdx++) {
        const descriptor = dataRow[colIdx + 1]?.trim() ?? "";
        const levelCode = CBC_RATING_LEVELS[colIdx]?.code ?? `L${colIdx + 1}`;
        const levelLabel = levelLabels[colIdx] ?? levelCode;

        await prisma.rubricLevel.upsert({
          where: { criterionId_code: { criterionId: criterion.id, code: levelCode } },
          create: {
            criterionId: criterion.id,
            code: levelCode,
            label: levelLabel,
            description: descriptor || undefined,
            points: CBC_RATING_LEVELS[colIdx]?.points,
            sequence: colIdx,
          },
          update: { label: levelLabel, description: descriptor || undefined },
        });
      }
    }
  }
}

// ─── Entrypoint ───────────────────────────────────────────────────────────
main()
  .catch((err) => {
    console.error("❌  Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
