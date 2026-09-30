import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export interface SnapshotReportCardPdfData {
  snapshot: {
    generatedAt: string
    school: { name: string }
    student: { name: string; admissionNo: string; className: string; grade?: string | null }
    period: { name: string; code: string; startsOn: string; endsOn: string }
    template: {
      name: string
      sections?: Array<{ code: string; title: string; sectionType: string; sequence: number; isEnabled: boolean }>
    }
    summary: {
      cbcEvidenceCount: number
      legacyAssessmentCount: number
      totalEntries: number
      cbcAveragePercentage: number | null
      legacyAveragePercentage: number | null
    }
  }
  entries: Array<{
    sequence: number
    sectionCode: string
    sectionTitle: string
    subjectName: string | null
    label: string
    numericValue: number | null
    maxValue: number | null
    masteryLevel: string | null
    narrative: string | null
    snapshot: unknown
  }>
  comments: Array<{ sectionCode: string | null; body: string; audience: string }>
}

type JsPdfWithLastTable = jsPDF & { lastAutoTable: { finalY: number } }

const palette = {
  ink: [28, 34, 49] as [number, number, number],
  teal: [42, 112, 110] as [number, number, number],
  gold: [255, 208, 47] as [number, number, number],
  muted: [103, 111, 123] as [number, number, number],
  line: [224, 228, 233] as [number, number, number],
  pale: [246, 248, 250] as [number, number, number],
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
}

function formatAverage(value: number | null) {
  return value === null || !Number.isFinite(value) ? "—" : `${value.toFixed(1)}%`
}

export function generateSnapshotReportCard(data: SnapshotReportCardPdfData): jsPDF {
  const doc = new jsPDF({ format: "a4", unit: "mm" })
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  const margin = 14
  const contentWidth = pageWidth - margin * 2
  const snapshot = data.snapshot
  const templateSections = (snapshot.template.sections ?? [])
    .filter((section) => section.isEnabled)
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
  const sections = templateSections.length
    ? templateSections
    : [...new Map(data.entries.map((entry) => [entry.sectionCode, { code: entry.sectionCode, title: entry.sectionTitle, sectionType: "CUSTOM", sequence: entry.sequence, isEnabled: true }])).values()]
  const commentSection = sections.find((section) => section.sectionType === "COMMENT")?.code ?? ""
  const looseComments = data.comments.filter((comment) => !comment.sectionCode && !commentSection)
  let y = 0

  // Cover header and learner identity panel.
  doc.setFillColor(...palette.ink)
  doc.rect(0, 0, pageWidth, 52, "F")
  doc.setFillColor(...palette.gold)
  doc.rect(0, 50, pageWidth, 2, "F")
  doc.setTextColor(213, 220, 229)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.text("STUDENT PERFORMANCE SYSTEM  /  CBC REPORTING", margin, 10)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(17)
  doc.text("LEARNER PROGRESS REPORT", margin, 21)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  const schoolLine = doc.splitTextToSize(snapshot.school.name || "School", contentWidth).slice(0, 1)
  doc.text(schoolLine, margin, 30)
  doc.setTextColor(238, 241, 245)
  doc.setFontSize(9)
  doc.text(`${snapshot.period.name} · ${snapshot.period.code}`, margin, 39)
  doc.text(`${formatDate(snapshot.period.startsOn)} – ${formatDate(snapshot.period.endsOn)}`, pageWidth - margin, 39, { align: "right" })

  doc.setFillColor(...palette.pale)
  doc.setDrawColor(...palette.line)
  doc.roundedRect(margin, 59, contentWidth, 30, 3, 3, "FD")
  doc.setTextColor(...palette.muted)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.text("LEARNER", margin + 5, 66)
  doc.text("ADMISSION NUMBER", margin + 5, 81)
  doc.text("CLASS / GRADE", pageWidth / 2 + 2, 81)
  doc.setTextColor(...palette.ink)
  doc.setFontSize(13)
  doc.text(doc.splitTextToSize(snapshot.student.name || "Learner", contentWidth - 10).slice(0, 1), margin + 5, 73)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text(snapshot.student.admissionNo || "—", margin + 5, 85)
  doc.text(`${snapshot.student.className || "—"}${snapshot.student.grade ? ` · Grade ${snapshot.student.grade}` : ""}`, pageWidth / 2 + 2, 85)
  y = 98

  const drawSectionHeading = (title: string) => {
    const lines = doc.splitTextToSize(title, contentWidth - 12)
    const blockHeight = Math.max(9, lines.length * 4.5 + 4)
    if (y + blockHeight + 18 > pageHeight - 18) {
      doc.addPage()
      y = 18
    }
    doc.setFillColor(...palette.pale)
    doc.roundedRect(margin, y, contentWidth, blockHeight, 2, 2, "F")
    doc.setFillColor(...palette.gold)
    doc.rect(margin, y, 2, blockHeight, "F")
    doc.setTextColor(...palette.ink)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.text(lines, margin + 6, y + 5.5)
    y += blockHeight + 3
  }

  const drawTable = (head: string[], rows: Array<Array<string | number>>, widths?: Record<number, { cellWidth: number | "auto" }>) => {
    autoTable(doc, {
      startY: y,
      head: [head],
      body: rows,
      theme: "striped",
      headStyles: { fillColor: palette.teal, textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      styles: { font: "helvetica", fontSize: 8, cellPadding: 2.7, textColor: palette.ink, lineColor: palette.line, lineWidth: 0.15, overflow: "linebreak", valign: "top" },
      columnStyles: widths,
      margin: { left: margin, right: margin, bottom: 20 },
      rowPageBreak: "avoid",
    })
    y = (doc as JsPdfWithLastTable).lastAutoTable.finalY + 7
  }

  for (const section of sections) {
    drawSectionHeading(section.title)

    if (section.code === "SUMMARY") {
      const rows = [
        ["CBC evidence", String(snapshot.summary.cbcEvidenceCount), formatAverage(snapshot.summary.cbcAveragePercentage)],
        ["Legacy assessments", String(snapshot.summary.legacyAssessmentCount), formatAverage(snapshot.summary.legacyAveragePercentage)],
        ["Total snapshot entries", String(snapshot.summary.totalEntries), "Historical snapshot"],
      ]
      drawTable(["Coverage", "Items", "Average where scored"], rows, { 0: { cellWidth: 64 }, 1: { cellWidth: 25 }, 2: { cellWidth: "auto" } })
      continue
    }

    const entries = data.entries
      .filter((entry) => entry.sectionCode === section.code)
      .slice()
      .sort((a, b) => a.sequence - b.sequence)
    if (entries.length) {
      drawTable(
        ["Learning / assessment", "Area", "Score", "Mastery", "Narrative"],
        entries.map((entry) => [
          entry.label,
          entry.subjectName || "CBC",
          entry.numericValue == null ? "—" : `${entry.numericValue}${entry.maxValue == null ? "" : ` / ${entry.maxValue}`}`,
          entry.masteryLevel || "—",
          entry.narrative || "—",
        ]),
        { 0: { cellWidth: 43 }, 1: { cellWidth: 25 }, 2: { cellWidth: 19 }, 3: { cellWidth: 23 }, 4: { cellWidth: "auto" } },
      )
    } else if (section.sectionType !== "COMMENT") {
      doc.setTextColor(...palette.muted)
      doc.setFont("helvetica", "italic")
      doc.setFontSize(8.5)
      doc.text("No entries recorded for this section in the frozen reporting period.", margin + 1, y + 2)
      y += 10
    }

    const comments = data.comments.filter((comment) => comment.sectionCode === section.code || (!comment.sectionCode && section.code === commentSection))
    if (comments.length) {
      drawTable(["Comment"], comments.map((comment) => [comment.body]), { 0: { cellWidth: "auto" } })
    } else if (section.sectionType === "COMMENT") {
      doc.setTextColor(...palette.muted)
      doc.setFont("helvetica", "italic")
      doc.setFontSize(8.5)
      doc.text("No comments have been added to this section.", margin + 1, y + 2)
      y += 10
    }
  }

  if (looseComments.length) {
    drawSectionHeading("General comments")
    drawTable(["Comment"], looseComments.map((comment) => [comment.body]), { 0: { cellWidth: "auto" } })
  }

  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page)
    doc.setDrawColor(...palette.line)
    doc.setLineWidth(0.25)
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.setTextColor(...palette.muted)
    doc.text("CONFIDENTIAL · PRIVATE LEARNER RECORD", margin, pageHeight - 9)
    doc.text(`Snapshot generated ${formatDate(snapshot.generatedAt)}`, pageWidth / 2, pageHeight - 9, { align: "center" })
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 9, { align: "right" })
  }

  return doc
}
