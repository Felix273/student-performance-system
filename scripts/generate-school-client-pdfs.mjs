import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const outputDir = path.join(root, "docs", "client-materials")
fs.mkdirSync(outputDir, { recursive: true })

const C = {
  ink: [28, 30, 31],
  green: [24, 91, 83],
  teal: [40, 133, 119],
  yellow: [255, 208, 47],
  pale: [246, 248, 247],
  line: [221, 228, 225],
  muted: [99, 110, 108],
  white: [255, 255, 255],
  blue: [66, 98, 255],
  paleBlue: [237, 241, 255],
  paleYellow: [255, 249, 226],
  paleTeal: [232, 246, 242],
  red: [161, 56, 59],
  paleRed: [255, 241, 241],
}

const W = 210
const H = 297
const M = 18

function setText(doc, color = C.ink, font = "normal", size = 10) {
  doc.setTextColor(...color)
  doc.setFont("helvetica", font)
  doc.setFontSize(size)
}

function textBlock(doc, text, x, y, width, { size = 10, color = C.ink, font = "normal", leading = 1.35 } = {}) {
  setText(doc, color, font, size)
  const lines = doc.splitTextToSize(String(text), width)
  doc.text(lines, x, y, { lineHeightFactor: leading })
  return y + lines.length * size * 0.3528 * leading
}

function drawBrand(doc, x = M, y = 14, inverse = false) {
  doc.setFillColor(...C.yellow)
  doc.roundedRect(x, y - 5.6, 8, 8, 1.2, 1.2, "F")
  setText(doc, C.ink, "bold", 10)
  doc.text("S", x + 4, y, { align: "center" })
  setText(doc, inverse ? C.white : C.ink, "bold", 9)
  doc.text("StudentOS", x + 11, y - 1)
  setText(doc, inverse ? [207, 219, 216] : C.muted, "normal", 6.5)
  doc.text("SCHOOL OPERATIONS", x + 11, y + 3)
}

function drawFooter(doc, page, total, label) {
  doc.setDrawColor(...C.line)
  doc.setLineWidth(0.25)
  doc.line(M, H - 14, W - M, H - 14)
  setText(doc, C.muted, "normal", 7)
  doc.text(label, M, H - 8)
  doc.text(`${String(page).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, W - M, H - 8, { align: "right" })
}

function addPage(doc, page, total, label, kicker, title, subtitle) {
  doc.addPage()
  doc.setFillColor(...C.green)
  doc.rect(0, 0, W, 2, "F")
  drawBrand(doc)
  setText(doc, C.teal, "bold", 7)
  doc.text(kicker.toUpperCase(), M, 33)
  setText(doc, C.ink, "bold", 22)
  const titleLines = doc.splitTextToSize(title, W - M * 2)
  doc.text(titleLines, M, 44)
  const titleHeight = titleLines.length * 8.2
  const afterTitle = 44 + titleHeight
  if (subtitle) textBlock(doc, subtitle, M, afterTitle + 2, W - M * 2, { size: 9, color: C.muted })
  drawFooter(doc, page, total, label)
  return afterTitle + (subtitle ? 13 : 4)
}

function sectionLabel(doc, text, x, y) {
  setText(doc, C.teal, "bold", 7)
  doc.text(text.toUpperCase(), x, y)
}

function bulletList(doc, items, x, y, width, options = {}) {
  const size = options.size ?? 9
  const color = options.color ?? C.ink
  const gap = options.gap ?? 2.2
  let cursor = y
  for (const item of items) {
    doc.setFillColor(...(options.bulletColor ?? C.teal))
    doc.circle(x + 1, cursor - 1.2, 0.7, "F")
    cursor = textBlock(doc, item, x + 5, cursor, width - 5, { size, color, leading: 1.3 }) + gap
  }
  return cursor
}

function card(doc, { x, y, w, title, body, accent = C.teal, fill = C.white, tag }) {
  const pad = 5
  const titleLines = doc.splitTextToSize(title, w - pad * 2)
  const bodyLines = doc.splitTextToSize(body, w - pad * 2 - 1)
  const h = 17 + titleLines.length * 4.4 + bodyLines.length * 3.7 + (tag ? 8 : 0)
  doc.setFillColor(...fill)
  doc.setDrawColor(...C.line)
  doc.roundedRect(x, y, w, h, 2.2, 2.2, "FD")
  doc.setFillColor(...accent)
  doc.roundedRect(x, y, 2, h, 1, 1, "F")
  let cy = y + 7
  if (tag) {
    setText(doc, accent, "bold", 6)
    doc.text(tag.toUpperCase(), x + pad + 1, cy)
    cy += 5
  }
  cy = textBlock(doc, title, x + pad + 1, cy, w - pad * 2 - 1, { size: 10, color: C.ink, font: "bold", leading: 1.2 }) + 2
  textBlock(doc, body, x + pad + 1, cy, w - pad * 2 - 1, { size: 8, color: C.muted, leading: 1.3 })
  return h
}

function callout(doc, { x = M, y, w = W - M * 2, title, body, tone = "teal" }) {
  const palette = tone === "yellow" ? [C.paleYellow, [231, 211, 146], [120, 95, 27]] : tone === "red" ? [C.paleRed, [238, 190, 191], C.red] : [C.paleTeal, [183, 222, 213], C.green]
  const titleLines = doc.splitTextToSize(title, w - 12)
  const bodyLines = doc.splitTextToSize(body, w - 12)
  const h = 10 + titleLines.length * 4.3 + bodyLines.length * 3.6
  doc.setFillColor(...palette[0])
  doc.setDrawColor(...palette[1])
  doc.roundedRect(x, y, w, h, 2, 2, "FD")
  let cy = y + 6
  cy = textBlock(doc, title, x + 6, cy, w - 12, { size: 9, color: palette[2], font: "bold", leading: 1.15 }) + 1
  textBlock(doc, body, x + 6, cy, w - 12, { size: 8, color: C.ink, leading: 1.25 })
  return h
}

function numberedStep(doc, number, title, detail, x, y, width, options = {}) {
  const color = options.accent ?? C.teal
  doc.setFillColor(...color)
  doc.circle(x + 4, y - 1.4, 3.5, "F")
  setText(doc, C.white, "bold", 8)
  doc.text(String(number), x + 4, y + 1.3, { align: "center" })
  let end = textBlock(doc, title, x + 11, y, width - 11, { size: 9, color: C.ink, font: "bold", leading: 1.2 }) + 1
  end = textBlock(doc, detail, x + 11, end, width - 11, { size: 8, color: C.muted, leading: 1.3 })
  return Math.max(end, y + 4) + (options.gap ?? 4)
}

function flowBand(doc, items, y, options = {}) {
  const gap = 3
  const x = M
  const w = W - M * 2
  const boxW = (w - gap * (items.length - 1)) / items.length
  const h = options.height ?? 21
  items.forEach((item, index) => {
    const bx = x + index * (boxW + gap)
    doc.setFillColor(...(index % 2 === 0 ? C.paleTeal : C.pale))
    doc.setDrawColor(...C.line)
    doc.roundedRect(bx, y, boxW, h, 2, 2, "FD")
    setText(doc, C.green, "bold", 7)
    const lines = doc.splitTextToSize(item, boxW - 5)
    doc.text(lines, bx + boxW / 2, y + h / 2 + (lines.length === 1 ? 1 : -1), { align: "center", lineHeightFactor: 1.15 })
    if (index < items.length - 1) {
      setText(doc, C.teal, "bold", 9)
      doc.text(">", bx + boxW + gap / 2, y + h / 2 + 1, { align: "center" })
    }
  })
  return y + h
}

function coverPage(doc, { eyebrow, title, subtitle, audience, version }) {
  doc.setFillColor(...C.ink)
  doc.rect(0, 0, W, H, "F")
  doc.setFillColor(...C.green)
  doc.rect(0, 0, 7, H, "F")
  doc.setFillColor(...C.yellow)
  doc.roundedRect(M, 19, 13, 13, 2, 2, "F")
  setText(doc, C.ink, "bold", 17)
  doc.text("S", M + 6.5, 28, { align: "center" })
  setText(doc, C.white, "bold", 15)
  doc.text("StudentOS", M + 18, 24)
  setText(doc, [188, 203, 199], "normal", 7)
  doc.text("STUDENT PERFORMANCE SYSTEM", M + 18, 29)

  doc.setFillColor(...C.yellow)
  doc.roundedRect(M, 63, 30, 1.5, 0.6, 0.6, "F")
  setText(doc, [194, 215, 210], "bold", 8)
  doc.text(eyebrow.toUpperCase(), M, 77)
  setText(doc, C.white, "bold", 31)
  const titleLines = doc.splitTextToSize(title, 164)
  doc.text(titleLines, M, 94, { lineHeightFactor: 1.05 })
  const nextY = 94 + titleLines.length * 11.2 + 9
  textBlock(doc, subtitle, M, nextY, 157, { size: 12, color: [214, 224, 221], leading: 1.38 })

  const nodeY = 193
  const nodeItems = audience === "School leadership & implementation teams"
    ? ["Set up", "Run", "Review", "Share"]
    : ["Prepare", "Teach", "Review", "Communicate"]
  flowBand(doc, nodeItems, nodeY, { height: 24 })
  setText(doc, [185, 199, 195], "normal", 8)
  doc.text(audience, M, 239)
  doc.text(version, M, 246)

  doc.setDrawColor(87, 104, 99)
  doc.line(M, 265, W - M, 265)
  setText(doc, [185, 199, 195], "normal", 7)
  doc.text("Prepared 13 October 2026 | Product and workflow guide", M, 273)
  doc.text("Contact: ______________________________", M, 282)
}

function salesOverview() {
  const doc = new jsPDF({ format: "a4", unit: "mm" })
  const footer = "StudentOS | School overview for school conversations"
  const total = 8
  coverPage(doc, {
    eyebrow: "A practical school platform",
    title: "Turn school activity into a clearer learner picture.",
    subtitle: "StudentOS brings school operations, assessment, learner evidence, review and family-facing updates into one role-aware workspace.",
    audience: "School leadership & implementation teams",
    version: "School conversation edition | v1.0",
  })

  let y = addPage(doc, 2, total, footer, "The opportunity", "One connected view of school progress", "Schools often manage learner records, class activity, marks and communication across separate tools and spreadsheets.")
  const callH = callout(doc, { y: y + 2, title: "The StudentOS promise", body: "Give each role a focused place to do its work, while keeping information connected to the learner, class and school. Move from entry to review to family-visible publication with clear responsibility at each step." })
  y += callH + 12
  sectionLabel(doc, "What schools gain from a connected workflow", M, y)
  y += 7
  const gap = 4
  const cw = (W - M * 2 - gap * 2) / 3
  const cards = [
    ["Less fragmentation", "Keep learner, class, attendance and assessment context together rather than repeatedly rebuilding it across files.", C.teal],
    ["Clearer accountability", "Role-based workspaces separate school administration, teacher tasks, review and parent visibility.", C.blue],
    ["More useful conversations", "Bring scores and competency-linked evidence into a reviewable progress story for staff and families.", [184, 139, 29]],
  ]
  cards.forEach((item, i) => card(doc, { x: M + i * (cw + gap), y, w: cw, title: item[0], body: item[1], accent: item[2] }))
  y += 54
  sectionLabel(doc, "Designed around school roles", M, y)
  y += 5
  autoTable(doc, {
    startY: y,
    head: [["Role", "Primary focus"]],
    body: [
      ["School administrator", "Set up people, classes, subjects, assignments and school operations; review and publish evidence."],
      ["Teacher", "Work with assigned classes, record attendance, create assigned-class assessments, and capture or submit evidence."],
      ["Parent / guardian", "View linked learner updates after school publication; drafts and review-stage evidence stay private."],
      ["Student", "Learner-account access is supported where the school chooses to link a student profile."],
    ],
    theme: "grid", styles: { font: "helvetica", fontSize: 8, cellPadding: 3, textColor: C.ink, lineColor: C.line },
    headStyles: { fillColor: C.green, textColor: C.white, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 43, fontStyle: "bold" }, 1: { cellWidth: "auto" } },
    margin: { left: M, right: M },
  })

  y = addPage(doc, 3, total, footer, "The platform", "A school workspace, not just a marks sheet", "StudentOS combines day-to-day administration with two complementary assessment approaches.")
  flowBand(doc, ["School setup", "Class activity", "Assessment", "Review", "Family update"], y + 1, { height: 24 })
  y += 37
  const modules = [
    ["School operations", "Student and user records, classes, teacher assignments, attendance, timetable and fee structures.", C.green],
    ["Traditional assessments", "Create quizzes, assignments, mid-term/final exams or projects; record marks against a maximum score.", C.blue],
    ["CBC assessment plans", "Create curriculum-oriented checkpoints with components, optional rubrics or grade scales, and learner evidence.", [168, 128, 22]],
    ["Review and publication", "School staff can review submitted evidence and publish results for parent-facing learning updates.", C.teal],
    ["Reports and exports", "Generate individual/class PDF reports and download available school data exports.", [122, 78, 151]],
    ["Insights", "View configured performance analysis and trends; AI-assisted analysis depends on service configuration and data quality.", [86, 107, 117]],
  ]
  const colGap = 4
  const cardW = (W - M * 2 - colGap) / 2
  modules.forEach((mod, i) => {
    const x = M + (i % 2) * (cardW + colGap)
    const yy = y + Math.floor(i / 2) * 42
    card(doc, { x, y: yy, w: cardW, title: mod[0], body: mod[1], accent: mod[2], fill: i % 2 ? C.pale : C.white })
  })
  callout(doc, { y: 230, title: "Two assessment paths, one learner record", body: "Use traditional score assessments for familiar tests and mark entry. Use CBC assessment plans when the school wants to connect evidence to curriculum outcomes, rubric levels and moderation." , tone: "yellow" })

  y = addPage(doc, 4, total, footer, "Everyday value", "A useful day for each role", "The platform is most valuable when each person can complete the next school task without stepping outside their permissions.")
  const roleCards = [
    ["Administrator", ["Prepare academic years, periods, classes and subjects.", "Create accounts and map teachers to classes/subjects.", "Monitor attendance, fees, assessment activity and reports.", "Review moderation items and publish evidence."], C.green],
    ["Teacher", ["Open assigned classes and mark attendance.", "Create an assessment for an assigned class and subject.", "Record marks or capture CBC-linked evidence.", "Submit evidence for school review; respond to returned work."], C.blue],
    ["Parent / guardian", ["Use the account linked by the school.", "Review published learner updates and school-shared reports.", "Contact the school when a learner is not linked or updates are absent."], [184, 139, 29]],
  ]
  let yy = y + 2
  roleCards.forEach((r) => {
    doc.setFillColor(...C.pale)
    doc.roundedRect(M, yy, W - M * 2, 44, 2, 2, "F")
    doc.setFillColor(...r[2])
    doc.roundedRect(M, yy, 2.2, 44, 1, 1, "F")
    setText(doc, r[2], "bold", 10)
    doc.text(r[0], M + 7, yy + 8)
    bulletList(doc, r[1], M + 7, yy + 16, W - M * 2 - 14, { size: 7.5, gap: 0.2, bulletColor: r[2] })
    yy += 49
  })
  callout(doc, { y: 238, title: "Who controls what?", body: "Administrators create subjects, classes, users and school-wide settings. Teachers work only with assigned classes and subjects. Parents see published information for linked learners, not drafts." })

  y = addPage(doc, 5, total, footer, "Why StudentOS", "Built for practical implementation", "A useful platform depends on setup, permissions and staff habits as much as it depends on software.")
  const implementation = [
    ["1", "Map your current process", "Identify who maintains records, enters marks, takes attendance, approves reports and communicates with families."],
    ["2", "Prepare the school structure", "Confirm academic year and periods, class names, subject list, staff, learner roster and teacher assignments."],
    ["3", "Choose an assessment pilot", "Start with one grade, a few classes or one reporting period. Decide whether the pilot uses score assessments, CBC plans, or both."],
    ["4", "Train by role", "Train administrators on setup/review, teachers on attendance and assessments, and parents on linked published updates."],
    ["5", "Review and expand", "Check data quality, access, completion and staff feedback before extending the workflow across the school."],
  ]
  let cursor = y + 3
  implementation.forEach(([n, title, detail]) => { cursor = numberedStep(doc, n, title, detail, M, cursor, W - M * 2, { gap: 7 }) })
  callout(doc, { y: 227, title: "Recommended pilot", body: "Use a small cohort and a real reporting cycle. Agree in advance on the class/subject assignments, who reviews submissions, and what counts as ready to publish.", tone: "yellow" })
  sectionLabel(doc, "Implementation success is shared", M, 264)
  textBlock(doc, "The school supplies accurate roster and curriculum information and assigns workflow owners. The implementation team helps configure, test and train. Confirm support scope, service levels and pricing directly with the provider before contracting.", M, 271, W - M * 2, { size: 8, color: C.muted })

  y = addPage(doc, 6, total, footer, "A guided demonstration", "Show the workflow in 12 minutes", "A simple demonstration should follow a school task, not a tour of every menu.")
  const demo = [
    ["0-2 min", "Start with the school", "Show the school-scoped dashboard and clarify the administrator's setup role."],
    ["2-4 min", "Show a class", "Open a teacher's assigned class and demonstrate the attendance roster."],
    ["4-7 min", "Create a checkpoint", "Create a traditional assessment for an assigned class/subject, then show where scores are recorded."],
    ["7-9 min", "Show CBC evidence", "Open the assessment-plan workspace and explain outcomes, evidence, rubric/scale options and draft/open status."],
    ["9-11 min", "Review before sharing", "Show the moderation queue and explain that parents see published evidence, not drafts."],
    ["11-12 min", "Close with fit", "Ask the school which grade, subject and reporting cycle should be used for a pilot."],
  ]
  autoTable(doc, {
    startY: y + 2,
    head: [["Time", "Demo moment", "What to show"]],
    body: demo,
    theme: "grid", styles: { font: "helvetica", fontSize: 8, cellPadding: 3.5, textColor: C.ink, lineColor: C.line, valign: "top" },
    headStyles: { fillColor: C.green, textColor: C.white, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 22, fontStyle: "bold" }, 1: { cellWidth: 38, fontStyle: "bold" }, 2: { cellWidth: "auto" } },
    margin: { left: M, right: M },
  })
  callout(doc, { y: 234, title: "Discovery questions", body: "Which part of the school's current process is hardest to coordinate? Who approves results? How are CBC observations recorded today? Which systems or templates must remain in use? What would make a first-term pilot worthwhile?", tone: "yellow" })

  y = addPage(doc, 7, total, footer, "Fit and readiness", "Questions to ask before a pilot", "Use these prompts to uncover workflow fit, data readiness and decision ownership.")
  const groups = [
    ["People & process", ["Who creates learners, classes, subjects and user accounts?", "Which teachers are assigned to which classes and subjects?", "Who reviews, returns or publishes assessment evidence?", "How do parents currently receive reports and feedback?"]],
    ["Data & curriculum", ["What learner roster fields and admission-number rules are used?", "Which grade/class naming conventions should imports follow?", "Is the school using traditional marks, CBC evidence plans, or both?", "Which curriculum version, outcomes, rubrics and grade scales are configured?"]],
    ["Operations & adoption", ["Which devices and connectivity are available to staff?", "What is the smallest useful pilot cohort?", "What training and support window does the school require?", "What data should be migrated, and who approves its accuracy?"]],
  ]
  let gy = y + 1
  groups.forEach(([title, items], idx) => {
    sectionLabel(doc, title, M, gy)
    gy = bulletList(doc, items, M, gy + 6, W - M * 2, { size: 9, gap: 4 }) + 5
    if (idx === 1) doc.setDrawColor(...C.line), doc.line(M, gy - 1, W - M, gy - 1), gy += 3
  })
  callout(doc, { y: 231, title: "Set expectations clearly", body: "Confirm current integrations, curriculum content, support arrangements, hosting, privacy terms and commercial terms before making commitments. Do not promise automated outcomes or integrations unless they are verified for that school." })

  y = addPage(doc, 8, total, footer, "Honest product boundaries", "What to confirm in a school meeting", "This overview describes the product workflows verified in the application as of 13 October 2026. Availability depends on school configuration and deployment settings.")
  const available = [
    ["Available workflows", "Role-based sign-in; school records; classes and subjects; teacher assignments; attendance; score-based assessments; CBC assessment plans and evidence; moderation and publication; parent learning updates; PDF/Excel reporting; bulk import."],
    ["Depends on configuration", "Curriculum tree depth and learning outcomes; rubric and grade-scale options; email or notification delivery; optional AI-assisted analysis; imported learner history and school-specific report setup."],
    ["Do not promise without verification", "A specific M-Pesa, SMS, SIS or LMS integration; offline synchronization; any regulatory certification; a service-level guarantee; quantified learning gains; fixed pricing or implementation timelines."],
  ]
  let by = y + 2
  available.forEach((entry, i) => {
    const tone = i === 0 ? C.teal : i === 1 ? [184, 139, 29] : C.red
    const fill = i === 0 ? C.paleTeal : i === 1 ? C.paleYellow : C.paleRed
    const h = card(doc, { x: M, y: by, w: W - M * 2, title: entry[0], body: entry[1], accent: tone, fill })
    by += h + 5
  })
  callout(doc, { y: 233, title: "Before sharing externally", body: "Replace the contact line on the cover with an approved contact. Confirm the deployed product URL, current feature configuration, privacy notice, data-processing terms and commercial offer with the product owner." })

  for (let page = 1; page <= doc.getNumberOfPages(); page += 1) {
    doc.setPage(page)
    if (page > 1) drawFooter(doc, page, total, footer)
  }
  return doc
}

function workflowGuide() {
  const doc = new jsPDF({ format: "a4", unit: "mm" })
  const footer = "StudentOS | School workflow walkthrough"
  const total = 12
  coverPage(doc, {
    eyebrow: "School operations guide",
    title: "A simple guide to the school workflows.",
    subtitle: "A practical walkthrough for school administrators, teachers, reviewers and parents - from first setup to published learner updates.",
    audience: "Head of school | administrators | teachers | families",
    version: "School onboarding edition | v1.0",
  })

  let y = addPage(doc, 2, total, footer, "Start here", "Know your role and the two assessment paths", "Your menus and actions depend on your school role and the records your administrator has assigned.")
  autoTable(doc, {
    startY: y + 1,
    head: [["Role", "You can typically", "Key boundary"]],
    body: [
      ["School administrator", "Set up school users and structures; create subjects and classes; assign teachers; manage fees, reports, moderation and publication.", "School-wide settings stay with the administrator."],
      ["Teacher", "Work with assigned classes and subjects; take attendance; create class assessments; enter marks; create CBC plans and submit evidence.", "Class/subject access is limited to assignments."],
      ["Parent / guardian", "View learning updates and other school-shared information for linked learners.", "Only published evidence appears in learning updates."],
      ["Student", "Sign in to a linked learner account where enabled by the school.", "Student records and login accounts are separate; an admin links them."],
    ],
    theme: "grid", styles: { font: "helvetica", fontSize: 7.2, cellPadding: 3, textColor: C.ink, lineColor: C.line, valign: "top" },
    headStyles: { fillColor: C.green, textColor: C.white, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 29, fontStyle: "bold" }, 1: { cellWidth: 78 }, 2: { cellWidth: "auto" } },
    margin: { left: M, right: M },
  })
  const assessmentFlowY = 145
  sectionLabel(doc, "Traditional score assessment", M, assessmentFlowY)
  flowBand(doc, ["Teacher creates", "Enters marks", "Report / analysis"], assessmentFlowY + 5, { height: 22 })
  sectionLabel(doc, "CBC evidence plan", M, assessmentFlowY + 42)
  flowBand(doc, ["Teacher plans", "Captures evidence", "Admin reviews", "Publishes"], assessmentFlowY + 47, { height: 22 })
  callout(doc, { y: 223, title: "Choose the workflow that fits", body: "Use a traditional assessment for a familiar quiz, assignment or exam with marks. Use an assessment plan when you want a curriculum-linked checkpoint with evidence, rubric/scale options and a moderation step." })

  y = addPage(doc, 3, total, footer, "Administrator | prepare", "Step 1: set up the school foundation", "Complete school structure before asking teachers to enter data.")
  const adminSteps = [
    ["1", "Confirm academic calendar", "Check the current academic year and periods/terms. Use consistent dates because assessments, plans and reports rely on them."],
    ["2", "Create classes and subjects", "Use the school's agreed grade/class names and subject codes. Subject creation is an administrator task."],
    ["3", "Create staff accounts", "Open Users > Add user. Create teachers and parents; link a student account only when the school needs learner sign-in."],
    ["4", "Assign teachers", "Open Teacher assignments. Select the teacher, class and subject. A class-wide assignment may be used where school policy permits."],
    ["5", "Configure curriculum", "Confirm the school's curriculum offering, grade mapping, outcomes, rubrics and grade scales. Content availability depends on what has been installed/configured."],
    ["6", "Check timetable and access", "Add timetable entries if using the lesson workspace. Sign in as a test teacher and confirm only intended classes and subjects appear."],
  ]
  let sy = y + 3
  adminSteps.forEach(([n, title, detail]) => { sy = numberedStep(doc, n, title, detail, M, sy, W - M * 2, { gap: 5 }) })
  callout(doc, { y: 235, title: "Before importing live data", body: "Agree on required columns, admission-number uniqueness, grade labels and a rollback/retention plan. Test with a small, reviewed file before a full-school import.", tone: "yellow" })

  y = addPage(doc, 4, total, footer, "Administrator | roster", "Step 2: add learners and connect people", "You can enter records individually or use bulk import for a prepared roster.")
  sectionLabel(doc, "Individual setup", M, y + 2)
  let iy = y + 10
  iy = numberedStep(doc, 1, "Add the learner record", "Open Students > Add student. Enter the learner name, unique admission number, class and grade.", M, iy, W - M * 2, { gap: 5 })
  iy = numberedStep(doc, 2, "Create user accounts as needed", "Open Users > Add user. Choose Teacher, Parent or Student. For a student login, select one unlinked learner record.", M, iy, W - M * 2, { gap: 5 })
  iy = numberedStep(doc, 3, "Link parents", "When creating a parent account, connect it to the correct learner or learners so parent-facing updates are properly scoped.", M, iy, W - M * 2, { gap: 7 })
  sectionLabel(doc, "Bulk learner import", M, iy)
  iy += 8
  const cols = ["name", "admissionNo", "className", "grade"]
  cols.forEach((col, i) => {
    const x = M + (i % 2) * 79
    const yy = iy + Math.floor(i / 2) * 14
    doc.setFillColor(...C.pale)
    doc.roundedRect(x, yy, 72, 10, 1.5, 1.5, "F")
    setText(doc, C.green, "bold", 8)
    doc.text(col, x + 4, yy + 6.5)
  })
  callout(doc, { y: 211, title: "Import sequence", body: "Download the learner template > fill the exact columns > upload the CSV/XLSX > review the sample rows and total row count > choose Import. Fix validation errors in the source file, then upload again." })
  callout(doc, { y: 245, title: "Account security", body: "Provide each person with their own account. Share initial passwords securely and follow the school's password-change policy." , tone: "yellow" })

  y = addPage(doc, 5, total, footer, "Teacher | daily operations", "Step 3: open your classes and take attendance", "Teachers only see classes assigned to their account.")
  let ty = y + 3
  ty = numberedStep(doc, 1, "Sign in and open the teacher dashboard", "Use your school account. The dashboard shows your assigned classes, current lesson/timetable context and available actions.", M, ty, W - M * 2, { gap: 6 })
  ty = numberedStep(doc, 2, "Open Attendance", "Choose one of your classes. Check the learner roster and mark each learner Present, Absent, Late or Excused.", M, ty, W - M * 2, { gap: 6 })
  ty = numberedStep(doc, 3, "Review before saving", "Confirm the date, class and statuses. Save the attendance record and check the response for any learner-specific validation failure.", M, ty, W - M * 2, { gap: 7 })
  sectionLabel(doc, "Useful routine", M, ty)
  ty += 7
  bulletList(doc, [
    "Take attendance for the correct class and date; do not reuse another class's roster.",
    "If a class is missing, ask the school administrator to verify your teacher assignment.",
    "If a learner is missing, ask the administrator to verify class enrollment before recording against another learner.",
    "For the scheduled lesson context and CBC focus, use the timetable or lesson workspace where it is configured.",
  ], M, ty, W - M * 2, { size: 8.5, gap: 3.5 })
  callout(doc, { y: 236, title: "A save conflict is protective", body: "If the system reports that the workspace changed in another session, reload the lesson to get the latest state before retrying. This prevents one session from silently overwriting another." })

  y = addPage(doc, 6, total, footer, "Teacher | score-based assessment", "Step 4: create a quiz, assignment or test", "Use the traditional assessment path for work that is graded primarily with marks.")
  const scoreSteps = [
    ["1", "Choose Create assessment", "Open Assessments > Create assessment from the teacher workspace."],
    ["2", "Set the assessment details", "Enter a title, assessment type, maximum score and date."],
    ["3", "Choose an assigned class", "The class list is restricted to classes assigned to you."],
    ["4", "Choose an assigned subject", "Subjects load after selecting a class and are restricted to your class/subject assignments."],
    ["5", "Create the assessment", "After saving, you are sent to its score-entry screen."],
    ["6", "Enter and save marks", "Enter a score for each learner, check the allowed range, then save. Existing marks are shown for editing where supported."],
  ]
  let py = y + 2
  scoreSteps.forEach(([n, title, detail]) => { py = numberedStep(doc, n, title, detail, M, py, W - M * 2, { gap: 4 }) })
  callout(doc, { y: 238, title: "If you cannot select a subject", body: "A school administrator must create the subject and assign it to you for the class. The teacher workflow does not allow teachers to create school subjects." })

  y = addPage(doc, 7, total, footer, "Teacher | CBC evidence", "Step 5: plan evidence against learning", "Use an assessment plan when you want a checkpoint connected to curriculum focus and evidence review.")
  let cy = y + 2
  const planSteps = [
    ["1", "Open Assessment plans", "Choose an assigned class curriculum assignment and academic period."],
    ["2", "Create a draft plan", "Enter the plan title, type, date, optional instructions, components, and an optional rubric or grade scale."],
    ["3", "Open the plan", "A draft is not ready for entry. Move it to OPEN using the permitted plan transition."],
    ["4", "Record learner evidence", "Enter scores, mastery notes, narrative feedback, and configured outcome/competency links. Evidence is submitted for review, not immediately parent-visible."],
    ["5", "Follow the review", "A reviewer may verify, return or reject submissions according to the school's configured process. Address returned items before resubmission."],
  ]
  planSteps.forEach(([n, title, detail]) => { cy = numberedStep(doc, n, title, detail, M, cy, W - M * 2, { gap: 4.5 }) })
  sectionLabel(doc, "Traditional assessments vs CBC assessment plans", M, cy + 1)
  autoTable(doc, {
    startY: cy + 5,
    head: [["Traditional assessment", "CBC assessment plan"]],
    body: [["Assessment record > marks > score report/analysis", "Plan > learning focus/components > evidence > review > publication"]],
    theme: "grid", styles: { font: "helvetica", fontSize: 8, cellPadding: 4, textColor: C.ink, lineColor: C.line },
    headStyles: { fillColor: C.green, textColor: C.white, fontStyle: "bold" },
    margin: { left: M, right: M },
  })
  callout(doc, { y: 244, title: "Keep drafts private", body: "Saving or submitting evidence is not the same as publishing it. Follow your school's reviewer and publication process before telling families a result is official." })

  y = addPage(doc, 8, total, footer, "Administrator | review", "Step 6: review and publish evidence", "Publication is a deliberate school decision that controls what families see.")
  let my = y + 3
  my = numberedStep(doc, 1, "Open the moderation queue", "School administrators review teacher-submitted evidence from the moderation queue." , M, my, W - M * 2, { gap: 7 })
  my = numberedStep(doc, 2, "Check learner and context", "Verify the class, learner, plan/assessment, outcome or competency, score, rubric and teacher note." , M, my, W - M * 2, { gap: 7 })
  my = numberedStep(doc, 3, "Choose the appropriate decision", "Verify accepted work. Return or reject work with a clear reason when changes are needed." , M, my, W - M * 2, { gap: 7 })
  my = numberedStep(doc, 4, "Publish when approved", "Published evidence becomes available in the parent learning-updates view, subject to learner linking and notification configuration." , M, my, W - M * 2, { gap: 8 })
  flowBand(doc, ["Draft / Open", "Submitted", "Review", "Published"], my + 2, { height: 23 })
  callout(doc, { y: 211, title: "Keep a clear review trail", body: "Give specific feedback on returned or rejected work. Avoid publishing incomplete or misattributed evidence. Corrected publications should follow the school's review policy." })
  sectionLabel(doc, "Parent visibility rule", M, 258)
  textBlock(doc, "Parents see published snapshots for learners linked to their account. They do not see teacher drafts or review-stage items in Learning updates.", M, 266, W - M * 2, { size: 9, color: C.ink, font: "bold" })

  y = addPage(doc, 9, total, footer, "Family experience", "Step 7: link parents and share updates", "A parent account must be connected to the right learner before it can show that learner's updates.")
  let fy = y + 3
  fy = numberedStep(doc, 1, "Create the parent account", "A school administrator creates the parent user with the school's approved email and account process.", M, fy, W - M * 2, { gap: 7 })
  fy = numberedStep(doc, 2, "Link the learner record", "Select the correct learner(s) and verify names and admission numbers before saving.", M, fy, W - M * 2, { gap: 7 })
  fy = numberedStep(doc, 3, "Parent signs in", "The parent opens the school's StudentOS sign-in page and uses the account credentials issued by the school.", M, fy, W - M * 2, { gap: 7 })
  fy = numberedStep(doc, 4, "Open Learning updates", "The parent sees only published evidence for learners linked to that account. No linked learner or no published updates produces an explanatory empty state.", M, fy, W - M * 2, { gap: 8 })
  callout(doc, { y: 204, title: "If a parent sees no updates", body: "Check in order: parent account exists > correct learner link exists > evidence has been reviewed and published > the parent is using the correct account." })
  sectionLabel(doc, "What a family update may contain", M, 249)
  bulletList(doc, ["Assessment/plan title and publication date.", "Score or mastery level where recorded.", "Linked learning outcome and competency where configured.", "Teacher narrative where included in the approved published snapshot."], M, 258, W - M * 2, { size: 8.5, gap: 2.5 })

  y = addPage(doc, 10, total, footer, "Records and reporting", "Step 8: generate reports and track operations", "Use school reporting and operations according to the permissions assigned to your role.")
  const ops = [
    ["Reports", "School administrators can select a learner/class report and download PDF or spreadsheet exports available in the product."],
    ["Bulk upload", "Administrators can import learner rosters or assessment scores from the supplied CSV/XLSX templates. Review the preview and validation results before importing."],
    ["Fees", "Administrators can configure fee structures, record or review payments and monitor outstanding/pending items where configured."],
    ["Insights", "Dashboards and analysis summarize stored records. Treat automated or AI-assisted analysis as decision support; staff must review source data and context."],
  ]
  let oy = y + 4
  ops.forEach((item, i) => { const h = card(doc, { x: M, y: oy, w: W - M * 2, title: item[0], body: item[1], accent: [C.teal, C.blue, [184, 139, 29], [122, 78, 151]][i] }); oy += h + 5 })
  callout(doc, { y: 230, title: "Reports need complete source data", body: "Before interpreting results, check that learner records, class/subject assignments, assessment dates and marks/evidence are accurate and complete for the period." })
  sectionLabel(doc, "Privacy reminder", M, 270)
  textBlock(doc, "Download only records needed for your role. Share exported files using school-approved secure channels and retention practices.", M, 277, W - M * 2, { size: 8, color: C.muted })

  y = addPage(doc, 11, total, footer, "Troubleshooting", "Common issues and first checks", "Most workflow problems are caused by missing setup or a role/class assignment mismatch.")
  autoTable(doc, {
    startY: y + 2,
    head: [["What you see", "First checks"]],
    body: [
      ["Teacher cannot see a class", "Ask the administrator to check the teacher-to-class assignment and school account."],
      ["Teacher cannot choose a subject", "Confirm the subject exists and is assigned to that teacher for the selected class, or that a class-wide assignment is intended."],
      ["Cannot create a score assessment", "Confirm assigned class and subject, title, assessment type, date and maximum score."],
      ["Cannot enter evidence on a plan", "Check the plan is OPEN, the teacher is assigned to the class, and learner records belong to that class."],
      ["Parent sees no learner / update", "Check the parent-learner link and confirm evidence has been published."],
      ["Import shows validation errors", "Compare column names and required values with the downloaded template; use unique admission numbers and review the sample rows."],
      ["A stale-workspace conflict appears", "Reload the lesson to receive the latest revision, then review the form before saving again."],
    ],
    theme: "grid", styles: { font: "helvetica", fontSize: 8, cellPadding: 3.6, textColor: C.ink, lineColor: C.line, valign: "top" },
    headStyles: { fillColor: C.green, textColor: C.white, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 57, fontStyle: "bold" }, 1: { cellWidth: "auto" } },
    margin: { left: M, right: M },
  })
  callout(doc, { y: 242, title: "Do not work around access controls", body: "A 403/404 response may mean the signed-in user is not assigned to the requested school, class, subject or learner. Ask an administrator to correct the assignment rather than sharing another user's account." })

  y = addPage(doc, 12, total, footer, "Quick reference", "A repeatable school rhythm", "Use this lightweight operating cadence to keep records timely and family communication trustworthy.")
  const rhythm = [
    ["Before term", "Admin verifies academic year/periods, classes, subjects, users, teacher assignments and curriculum configuration."],
    ["Each school day", "Teachers open assigned classes and record attendance against the correct date."],
    ["Each assessment cycle", "Teachers create score assessments or CBC plans; capture complete work; submit evidence for review."],
    ["Review cadence", "Designated administrators/reviewers clear submissions, return work with actionable reasons and publish approved evidence."],
    ["Family communication", "Parents review published learning updates for linked learners and contact the school if expected items are missing."],
    ["End of period", "Administrators check data completeness, generate reports and confirm the intended audience and sharing channel."],
  ]
  let ry = y + 2
  rhythm.forEach(([title, body], index) => { ry = numberedStep(doc, index + 1, title, body, M, ry, W - M * 2, { gap: 4 }) })
  callout(doc, { y: 238, title: "Keep improvement in view", body: "Start with a small workflow, review how staff use it, fix data or setup gaps, then expand. The goal is a consistent and trustworthy process, not simply more records." })
  sectionLabel(doc, "Need help?", M, 271)
  textBlock(doc, "Contact your school administrator or designated StudentOS implementation/support contact. Keep your school name, role, page and a brief description of the issue ready; never send a password.", M, 278, W - M * 2, { size: 8, color: C.muted })

  for (let page = 1; page <= doc.getNumberOfPages(); page += 1) {
    doc.setPage(page)
    if (page > 1) drawFooter(doc, page, total, footer)
  }
  return doc
}

const files = [
  ["StudentOS_School_Overview_and_Directives.pdf", salesOverview()],
  ["StudentOS_School_Workflow_Walkthrough.pdf", workflowGuide()],
]

for (const [filename, doc] of files) {
  const outputPath = path.join(outputDir, filename)
  fs.writeFileSync(outputPath, Buffer.from(doc.output("arraybuffer")))
  console.log(`${outputPath} (${doc.getNumberOfPages()} pages)`)
}