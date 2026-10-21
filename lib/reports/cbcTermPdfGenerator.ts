import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export interface CbcTermReportData {
  schoolName: string
  schoolLogo?: string | null
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

  // Green Banner Header
  doc.setFillColor(24, 105, 100)
  doc.rect(0, 0, pageWidth, 42, "F")

  // Render School Logo if provided
  if (data.schoolLogo) {
    try {
      // Draw white rounded container for logo
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(pageWidth - 36, 6, 28, 28, 3, 3, "F")
      doc.addImage(data.schoolLogo, "PNG", pageWidth - 34, 8, 24, 24)
    } catch {
      // If logo format is unsupported, gracefully skip
    }
  }

  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(17)
  doc.text("CBC TERM LEARNER REPORT", 14, 18)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  doc.text(data.schoolName.toUpperCase(), 14, 28)

  doc.setFontSize(9)
  doc.text(`${data.academicYear} · ${data.periodName}`, 14, 36)

  // Student Info Box
  doc.setTextColor(40, 40, 40)
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("LEARNER PROFILE", 14, 52)
  doc.setFont("helvetica", "normal")
  doc.text(`Name: ${data.studentName}`, 14, 59)
  doc.text(`Admission No: ${data.admissionNo}`, 14, 66)
  doc.text(`Class/Stream: ${data.className}`, 110, 59)
  doc.text(`Report Period: ${data.periodName}`, 110, 66)

  // CBC Competency Evaluation Table
  const tableRows = data.evidence.map((item) => [
    item.outcome || "General Outcome",
    item.competency || "Core Competency",
    item.masteryLevel || "—",
    item.score || "—",
    item.narrative || "Demonstrates expected competencies for this level.",
  ])

  autoTable(doc, {
    startY: 74,
    head: [["Learning Outcome", "Competency", "Band", "Score", "Qualitative Remarks"]],
    body: tableRows.length > 0 ? tableRows : [["No evidence records recorded for this term", "—", "—", "—", "—"]],
    headStyles: {
      fillColor: [24, 105, 100],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 35 },
      2: { cellWidth: 18, halign: "center" },
      3: { cellWidth: 16, halign: "center" },
      4: { cellWidth: "auto" },
    },
    theme: "striped",
  })

  // Footer & Principal Remarks
  const finalY = (doc as any).lastAutoTable?.finalY || 180
  if (finalY < pageHeight - 45) {
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("KEY TO MASTERY LEVELS:", 14, finalY + 12)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.text("EE: Exceeding Expectations | ME: Meeting Expectations | AE: Approaching Expectations | BE: Below Expectations", 14, finalY + 18)

    doc.line(14, finalY + 28, 80, finalY + 28)
    doc.text("Class Teacher's Signature", 14, finalY + 33)

    doc.line(130, finalY + 28, 196, finalY + 28)
    doc.text("Headteacher's Signature & Official Seal", 130, finalY + 33)
  }

  return doc
}
