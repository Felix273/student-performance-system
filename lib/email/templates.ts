export const emailTemplates = {
  welcome: (name: string, role: string, loginUrl: string) => ({
    subject: '🎓 Welcome to Student Performance System',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 Welcome to Student Performance System</h1>
            </div>
            <div class="content">
              <h2>Hello ${name}!</h2>
              <p>Your account has been created successfully as a <strong>${role}</strong>.</p>
              <p>You can now access the system and start managing student performance with AI-powered insights.</p>
              <a href="${loginUrl}" class="button">Login to Dashboard</a>
              <p><strong>What you can do:</strong></p>
              <ul>
                <li>Track student performance</li>
                <li>Record assessments</li>
                <li>Generate AI-powered reports</li>
                <li>Export data to PDF/Excel</li>
              </ul>
              <p>If you have any questions, please contact your system administrator.</p>
            </div>
            <div class="footer">
              <p>© 2024 Student Performance System. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `
  }),

  reportCard: (parentName: string, studentName: string, reportUrl: string, summary: any) => ({
    subject: `📊 Report Card Ready - ${studentName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .stats { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .stat-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .button { display: inline-block; padding: 12px 30px; background: #11998e; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 Report Card Available</h1>
            </div>
            <div class="content">
              <h2>Dear ${parentName},</h2>
              <p>The report card for <strong>${studentName}</strong> is now available.</p>
              
              <div class="stats">
                <h3>Performance Summary</h3>
                <div class="stat-item">
                  <span>Overall Average:</span>
                  <strong>${summary.average}%</strong>
                </div>
                <div class="stat-item">
                  <span>Total Assessments:</span>
                  <strong>${summary.totalAssessments}</strong>
                </div>
                <div class="stat-item">
                  <span>Highest Score:</span>
                  <strong>${summary.highest}%</strong>
                </div>
                <div class="stat-item">
                  <span>Performance Trend:</span>
                  <strong>${summary.trend}</strong>
                </div>
              </div>
              
              <a href="${reportUrl}" class="button">View Full Report Card</a>
              
              <p><em>Login to the parent dashboard to see detailed analysis and recommendations.</em></p>
            </div>
            <div class="footer">
              <p>© 2024 Student Performance System. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `
  }),

  lowPerformanceAlert: (parentName: string, studentName: string, subject: string, score: number) => ({
    subject: `⚠️ Performance Alert - ${studentName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .button { display: inline-block; padding: 12px 30px; background: #f5576c; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Performance Alert</h1>
            </div>
            <div class="content">
              <h2>Dear ${parentName},</h2>
              
              <div class="alert-box">
                <strong>${studentName}</strong> scored <strong>${score}%</strong> in <strong>${subject}</strong>, which is below the expected performance level.
              </div>
              
              <p><strong>Recommended Actions:</strong></p>
              <ul>
                <li>Review the assessment with your child</li>
                <li>Contact the subject teacher for guidance</li>
                <li>Check the AI-generated recommendations in the dashboard</li>
                <li>Schedule extra study time if needed</li>
              </ul>
              
              <a href="${process.env.NEXTAUTH_URL}/dashboard/parent" class="button">View Detailed Analysis</a>
              
              <p>Early intervention can help improve performance. Please don't hesitate to reach out to the school.</p>
            </div>
            <div class="footer">
              <p>© 2024 Student Performance System. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `
  }),

  attendanceAlert: (parentName: string, studentName: string, date: string, status: string) => ({
    subject: `📋 Attendance Alert - ${studentName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #FA8BFF 0%, #2BD2FF 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 Attendance Notification</h1>
            </div>
            <div class="content">
              <h2>Dear ${parentName},</h2>
              
              <div class="info-box">
                <strong>${studentName}</strong> was marked as <strong>${status}</strong> on <strong>${date}</strong>.
              </div>
              
              <p>This is an automated notification to keep you informed about your child's attendance.</p>
              
              <p>If you have any questions or concerns, please contact the school administration.</p>
            </div>
            <div class="footer">
              <p>© 2024 Student Performance System. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `
  })
}
