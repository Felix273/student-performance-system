import ExcelJS from 'exceljs'

interface StudentAssessment {
  studentName: string
  admissionNo: string
  className: string
  subject: string
  assessmentTitle: string
  assessmentType: string
  score: number
  maxScore: number
  percentage: number
  date: string
}

export async function generateAssessmentExport(
  data: StudentAssessment[],
  schoolName: string
): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Assessment Data')

  // Set column widths
  worksheet.columns = [
    { header: 'Admission No', key: 'admissionNo', width: 15 },
    { header: 'Student Name', key: 'studentName', width: 25 },
    { header: 'Class', key: 'className', width: 15 },
    { header: 'Subject', key: 'subject', width: 20 },
    { header: 'Assessment', key: 'assessmentTitle', width: 30 },
    { header: 'Type', key: 'assessmentType', width: 15 },
    { header: 'Score', key: 'score', width: 10 },
    { header: 'Max Score', key: 'maxScore', width: 10 },
    { header: 'Percentage', key: 'percentage', width: 12 },
    { header: 'Date', key: 'date', width: 15 }
  ]

  // Style header row
  worksheet.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF3B82F6' }
  }
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }
  worksheet.getRow(1).height = 25

  // Add title
  worksheet.insertRow(1, [schoolName])
  worksheet.mergeCells('A1:J1')
  worksheet.getRow(1).font = { bold: true, size: 16, color: { argb: 'FF1F2937' } }
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }
  worksheet.getRow(1).height = 30

  // Add data
  data.forEach(item => {
    worksheet.addRow({
      admissionNo: item.admissionNo,
      studentName: item.studentName,
      className: item.className,
      subject: item.subject,
      assessmentTitle: item.assessmentTitle,
      assessmentType: item.assessmentType,
      score: item.score,
      maxScore: item.maxScore,
      percentage: item.percentage,
      date: item.date
    })
  })

  // Format percentage column
  worksheet.getColumn('percentage').numFmt = '0.0"%"'

  // Add borders
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      })
    }
  })

  // Add summary at the bottom
  const summaryRow = worksheet.rowCount + 2
  worksheet.getCell(`A${summaryRow}`).value = 'Summary'
  worksheet.getCell(`A${summaryRow}`).font = { bold: true, size: 12 }
  
  worksheet.getCell(`A${summaryRow + 1}`).value = 'Total Records:'
  worksheet.getCell(`B${summaryRow + 1}`).value = data.length
  
  const avgPercentage = data.reduce((sum, item) => sum + item.percentage, 0) / data.length
  worksheet.getCell(`A${summaryRow + 2}`).value = 'Average Score:'
  worksheet.getCell(`B${summaryRow + 2}`).value = `${avgPercentage.toFixed(1)}%`

  return await workbook.xlsx.writeBuffer()
}

export async function generateStudentListExport(
  students: {
    admissionNo: string
    name: string
    className: string
    grade: string
    averageScore: number
    totalAssessments: number
  }[],
  schoolName: string
): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Students')

  // Set column widths
  worksheet.columns = [
    { header: 'Admission No', key: 'admissionNo', width: 15 },
    { header: 'Student Name', key: 'name', width: 25 },
    { header: 'Class', key: 'className', width: 15 },
    { header: 'Grade', key: 'grade', width: 10 },
    { header: 'Average Score', key: 'averageScore', width: 15 },
    { header: 'Total Assessments', key: 'totalAssessments', width: 18 }
  ]

  // Style header row
  worksheet.getRow(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF10B981' }
  }
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }
  worksheet.getRow(1).height = 25

  // Add title
  worksheet.insertRow(1, [`${schoolName} - Student List`])
  worksheet.mergeCells('A1:F1')
  worksheet.getRow(1).font = { bold: true, size: 16, color: { argb: 'FF1F2937' } }
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }
  worksheet.getRow(1).height = 30

  // Add data
  students.forEach(student => {
    worksheet.addRow(student)
  })

  // Format average score column
  worksheet.getColumn('averageScore').numFmt = '0.0"%"'

  // Add borders
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      })
    }
  })

  return await workbook.xlsx.writeBuffer()
}
