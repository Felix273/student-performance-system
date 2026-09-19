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

export function generateStudentReportCard(data: StudentData): jsPDF {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height
  
  // Header
  doc.setFillColor(59, 130, 246) // Blue
  doc.rect(0, 0, pageWidth, 40, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.text('STUDENT REPORT CARD', pageWidth / 2, 20, { align: 'center' })
  
  doc.setFontSize(12)
  doc.text(data.schoolName, pageWidth / 2, 32, { align: 'center' })
  
  // Student Info
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Student Information', 14, 55)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(`Name: ${data.name}`, 14, 65)
  doc.text(`Admission No: ${data.admissionNo}`, 14, 72)
  doc.text(`Class: ${data.className}`, 14, 79)
  doc.text(`Report Date: ${new Date().toLocaleDateString()}`, pageWidth - 14, 65, { align: 'right' })
  
  // Performance Summary
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Performance Summary', 14, 95)
  
  const summaryData = [
    ['Current Average', `${data.summary.currentAverage}%`],
    ['Highest Score', `${data.summary.highest}%`],
    ['Lowest Score', `${data.summary.lowest}%`],
    ['Total Assessments', data.summary.totalAssessments.toString()]
  ]
  
  autoTable(doc, {
    startY: 100,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    margin: { left: 14, right: 14 }
  })
  
  // Assessment Details
  let finalY = (doc as any).lastAutoTable.finalY + 10
  
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Assessment Details', 14, finalY)
  
  const assessmentData = data.assessments.map(a => [
    a.subject,
    a.title,
    `${a.score}/${a.maxScore}`,
    `${a.percentage.toFixed(1)}%`,
    new Date(a.date).toLocaleDateString()
  ])
  
  autoTable(doc, {
    startY: finalY + 5,
    head: [['Subject', 'Assessment', 'Score', 'Percentage', 'Date']],
    body: assessmentData,
    theme: 'striped',
    headStyles: { fillColor: [139, 92, 246] },
    margin: { left: 14, right: 14 }
  })
  
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
    data.analysis.strengths.forEach((strength) => {
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
    data.analysis.weaknesses.forEach((weakness) => {
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
