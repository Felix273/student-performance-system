import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface StudentData {
  name: string
  admissionNo: string
  className: string
  schoolName: string
  assessments: {
    subject: string
    title: string
    score: number
    maxScore: number
    percentage: number
    date: string
  }[]
  analysis?: {
    overallGrade: string
    trend: string
    strengths: string[]
    weaknesses: string[]
    recommendations: string[]
    aiInsights: string
  }
  summary: {
    currentAverage: number
    highest: number
    lowest: number
    totalAssessments: number
  }
}

const reportColors = {
  forest: [24, 69, 65] as [number, number, number],
  teal: [35, 112, 103] as [number, number, number],
  gold: [224, 181, 87] as [number, number, number],
  ink: [32, 45, 43] as [number, number, number],
  muted: [104, 119, 115] as [number, number, number],
  line: [222, 230, 226] as [number, number, number],
  wash: [246, 249, 247] as [number, number, number],
}

function drawSchoolCrest(doc: jsPDF, x: number, y: number, schoolName: string) {
  const initials = schoolName.split(/\s+/).filter(Boolean).slice(0, 3).map((word) => word[0].toUpperCase()).join("") || "S"
  doc.setFillColor(...reportColors.gold)
  doc.circle(x + 13, y + 13, 13, "F")
  doc.setFillColor(...reportColors.forest)
  doc.circle(x + 13, y + 13, 11, "F")
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(0.7)
  doc.line(x + 5.5, y + 9.5, x + 13, y + 12)
  doc.line(x + 20.5, y + 9.5, x + 13, y + 12)
  doc.line(x + 5.5, y + 9.5, x + 5.5, y + 16)
  doc.line(x + 20.5, y + 9.5, x + 20.5, y + 16)
  doc.line(x + 5.5, y + 16, x + 13, y + 18.5)
  doc.line(x + 20.5, y + 16, x + 13, y + 18.5)
  doc.line(x + 13, y + 12, x + 13, y + 18.5)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(5.5)
  doc.setTextColor(255, 255, 255)
  doc.text(initials, x + 13, y + 23, { align: "center" })
}

export function generateStudentReportCard(data: StudentData): jsPDF {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height

  doc.setFillColor(...reportColors.forest)
  doc.rect(0, 0, pageWidth, 46, "F")
  doc.setFillColor(...reportColors.teal)
  doc.rect(pageWidth - 5, 0, 5, 46, "F")
  drawSchoolCrest(doc, 14, 10, data.schoolName)
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(15)
  doc.text(data.schoolName, 47, 19, { maxWidth: pageWidth - 68 })
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(212, 231, 222)
  doc.text("LEARNER PERFORMANCE", 47, 27)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.setTextColor(255, 255, 255)
  doc.text("STUDENT REPORT CARD", 47, 37)
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(0.3)
  doc.line(pageWidth - 56, 13, pageWidth - 56, 35)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(212, 231, 222)
  doc.text("REPORT DATE", pageWidth - 48, 20)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text(new Date().toLocaleDateString("en-GB"), pageWidth - 48, 28)

  const margin = 14
  const contentWidth = pageWidth - margin * 2
  doc.setFillColor(...reportColors.wash)
  doc.setDrawColor(...reportColors.line)
  doc.roundedRect(margin, 55, contentWidth, 35, 2, 2, "FD")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(...reportColors.teal)
  doc.text("STUDENT INFORMATION", margin + 6, 62)
  doc.setFontSize(12)
  doc.setTextColor(...reportColors.ink)
  doc.text(data.name, margin + 6, 70, { maxWidth: contentWidth - 12 })
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(...reportColors.muted)
  doc.text(`Admission No.  ${data.admissionNo}`, margin + 6, 80)
  doc.text(`Class  ${data.className}`, margin + contentWidth * 0.57, 80)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(...reportColors.ink)
  doc.text("Performance at a glance", margin, 101)
  doc.setFillColor(...reportColors.gold)
  doc.roundedRect(margin, 104, 13, 1.2, 0.6, 0.6, "F")

  const metrics = [
    { label: "CURRENT AVERAGE", value: data.summary.totalAssessments ? `${data.summary.currentAverage.toFixed(1)}%` : "—" },
    { label: "HIGHEST SCORE", value: data.summary.totalAssessments ? `${data.summary.highest.toFixed(1)}%` : "—" },
    { label: "LOWEST SCORE", value: data.summary.totalAssessments ? `${data.summary.lowest.toFixed(1)}%` : "—" },
    { label: "ASSESSMENTS", value: data.summary.totalAssessments.toString() },
  ]
  const gap = 3
  const tileWidth = (contentWidth - gap * (metrics.length - 1)) / metrics.length
  metrics.forEach((metric, index) => {
    const x = margin + index * (tileWidth + gap)
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(...reportColors.line)
    doc.roundedRect(x, 110, tileWidth, 23, 2, 2, "FD")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(6.8)
    doc.setTextColor(...reportColors.muted)
    doc.text(metric.label, x + 4, 117)
    doc.setFontSize(14)
    doc.setTextColor(...(index === 0 ? reportColors.teal : reportColors.ink))
    doc.text(metric.value, x + 4, 127)
  })

  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(...reportColors.ink)
  doc.text("Assessment details", margin, 145)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(...reportColors.muted)
  doc.text(data.assessments.length ? "Recorded results for this learner" : "Results will appear here once assessments have been recorded", margin, 150)

  const assessmentData = data.assessments.length
    ? data.assessments.map((assessment) => [
        assessment.subject,
        assessment.title,
        `${assessment.score}/${assessment.maxScore}`,
        `${assessment.percentage.toFixed(1)}%`,
        new Date(assessment.date).toLocaleDateString("en-GB"),
      ])
    : []

  autoTable(doc, {
    startY: 155,
    head: [["Subject", "Assessment", "Score", "Percentage", "Date"]],
    body: assessmentData,
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8, cellPadding: 3, textColor: reportColors.ink, lineColor: reportColors.line, lineWidth: 0.2 },
    headStyles: { fillColor: reportColors.forest, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: reportColors.wash },
    columnStyles: { 0: { cellWidth: 31 }, 1: { cellWidth: "auto" }, 2: { cellWidth: 27 }, 3: { cellWidth: 29 }, 4: { cellWidth: 30 } },
    margin: { left: margin, right: margin, bottom: 18 },
  })

  let finalY = (doc as any).lastAutoTable.finalY + 10
  if (!data.assessments.length) {
    doc.setFillColor(...reportColors.wash)
    doc.setDrawColor(...reportColors.line)
    doc.roundedRect(margin, finalY - 4, contentWidth, 18, 2, 2, "FD")
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(...reportColors.muted)
    doc.text("No assessment records yet", margin + 5, finalY + 3)
    finalY += 22
  }
  
  // AI Analysis (if available)
  if (data.analysis) {
    finalY = (doc as any).lastAutoTable.finalY + 10
    
    // Check if we need a new page
    if (finalY > pageHeight - 80) {
      doc.addPage()
      finalY = 20
    }
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('AI Performance Analysis', 14, finalY)
    
    finalY += 10
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    
    // Overall Grade and Trend
    doc.setFont('helvetica', 'bold')
    doc.text(`Overall Grade: ${data.analysis.overallGrade}`, 14, finalY)
    doc.text(`Trend: ${data.analysis.trend}`, pageWidth / 2, finalY)
    
    finalY += 10
    
    // Strengths
    doc.setFont('helvetica', 'bold')
    doc.text('Strengths:', 14, finalY)
    finalY += 6
    doc.setFont('helvetica', 'normal')
    data.analysis.strengths.forEach((strength, idx) => {
      const lines = doc.splitTextToSize(`• ${strength}`, pageWidth - 28)
      doc.text(lines, 20, finalY)
      finalY += lines.length * 5
    })
    
    finalY += 5
    
    // Areas for Improvement
    if (finalY > pageHeight - 60) {
      doc.addPage()
      finalY = 20
    }
    
    doc.setFont('helvetica', 'bold')
    doc.text('Areas for Improvement:', 14, finalY)
    finalY += 6
    doc.setFont('helvetica', 'normal')
    data.analysis.weaknesses.forEach((weakness, idx) => {
      const lines = doc.splitTextToSize(`• ${weakness}`, pageWidth - 28)
      doc.text(lines, 20, finalY)
      finalY += lines.length * 5
    })
    
    finalY += 5
    
    // Recommendations
    if (finalY > pageHeight - 60) {
      doc.addPage()
      finalY = 20
    }
    
    doc.setFont('helvetica', 'bold')
    doc.text('Recommendations:', 14, finalY)
    finalY += 6
    doc.setFont('helvetica', 'normal')
    data.analysis.recommendations.forEach((rec, idx) => {
      const lines = doc.splitTextToSize(`${idx + 1}. ${rec}`, pageWidth - 28)
      doc.text(lines, 20, finalY)
      finalY += lines.length * 5
    })
  }
  
  // Footer
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(9)
    doc.setTextColor(128, 128, 128)
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )
    doc.text(
      'Generated by Student Performance System',
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    )
  }
  
  return doc
}

export function generateClassReport(classData: {
  className: string
  schoolName: string
  students: {
    name: string
    admissionNo: string
    average: number
    assessments: number
  }[]
  summary: {
    classAverage: number
    highestAverage: number
    lowestAverage: number
    totalStudents: number
  }
}): jsPDF {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  
  // Header
  doc.setFillColor(16, 185, 129) // Green
  doc.rect(0, 0, pageWidth, 40, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.text('CLASS PERFORMANCE REPORT', pageWidth / 2, 20, { align: 'center' })
  
  doc.setFontSize(12)
  doc.text(`${classData.className} - ${classData.schoolName}`, pageWidth / 2, 32, { align: 'center' })
  
  // Summary
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Class Summary', 14, 55)
  
  const summaryData = [
    ['Class Average', `${classData.summary.classAverage.toFixed(1)}%`],
    ['Highest Average', `${classData.summary.highestAverage.toFixed(1)}%`],
    ['Lowest Average', `${classData.summary.lowestAverage.toFixed(1)}%`],
    ['Total Students', classData.summary.totalStudents.toString()]
  ]
  
  autoTable(doc, {
    startY: 60,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129] },
    margin: { left: 14, right: 14 }
  })
  
  // Student List
  const finalY = (doc as any).lastAutoTable.finalY + 10
  
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Student Performance', 14, finalY)
  
  const studentData = classData.students
    .sort((a, b) => b.average - a.average)
    .map((s, idx) => [
      (idx + 1).toString(),
      s.admissionNo,
      s.name,
      s.assessments.toString(),
      `${s.average.toFixed(1)}%`
    ])
  
  autoTable(doc, {
    startY: finalY + 5,
    head: [['Rank', 'Admission No', 'Name', 'Assessments', 'Average']],
    body: studentData,
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129] },
    margin: { left: 14, right: 14 }
  })
  
  // Footer
  doc.setFontSize(9)
  doc.setTextColor(128, 128, 128)
  doc.text(
    `Generated on ${new Date().toLocaleString()}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  )
  
  return doc
}
