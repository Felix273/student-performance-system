import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export interface CbcTermReportData {
  schoolName: string
  studentName: string
  admissionNo: string
  className: string
  periodName: string
  academicYear: string
  evidence: {
    outcome: string
    competency: string
    evidenceType: string
    masteryLevel: string
    score: string
    narrative: string
    publishedAt: string
  }[]
}

export function generateCbcTermReport(data: CbcTermReportData): jsPDF {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height

  doc.setFillColor(24, 105, 100)
  doc.rect(0, 0, pageWidth, 38, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.text("CBC TERM LEARNER REPORT", 14, 18)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text(data.schoolName, 14, 29)

  doc.setTextColor(25, 35, 42)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text(data.studentName, 14, 50)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text(`Admission No: ${data.admissionNo}`, 14, 58)
  doc.text(`Class: ${data.className}`, 14, 65)
  doc.text(`Term: ${data.periodName} | Academic year: ${data.academicYear}`, 14, 72)
  doc.text(`Published CBC evidence: ${data.evidence.length}`, pageWidth - 14, 58, { align: "right" })

  autoTable(doc, {
    startY: 80,
    head: [["Outcome / competency", "Evidence", "Recorded level", "Mark", "Published", "Learning note"]],
    body: data.evidence.map((entry) => [
      [entry.outcome, entry.competency].filter(Boolean).join("\n") || "Not linked",
      entry.evidenceType,
      entry.masteryLevel || "Not recorded",
      entry.score || "Not recorded",
      new Date(entry.publishedAt).toLocaleDateString(),
      entry.narrative || "",
    ]),
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: [24, 105, 100] },
    columnStyles: { 0: { cellWidth: 39 }, 1: { cellWidth: 22 }, 2: { cellWidth: 23 }, 3: { cellWidth: 18 }, 4: { cellWidth: 20 }, 5: { cellWidth: "auto" } },
    margin: { left: 12, right: 12, bottom: 18 },
  })

  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(100, 110, 115)
    doc.text("Contains published CBC evidence for the selected term only.", 12, pageHeight - 10)
    doc.text(`${page} / ${pageCount}`, pageWidth - 12, pageHeight - 10, { align: "right" })
  }

  return doc
}