import nodemailer from 'nodemailer'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

// Create transporter based on environment
const createTransporter = async () => {
  // In development, use Ethereal (test email service)
  if (process.env.NODE_ENV === 'development' && !process.env.RESEND_API_KEY && !process.env.GMAIL_USER) {
    // Create a test account
    const testAccount = await nodemailer.createTestAccount()
    
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    })
  }
  
  if (process.env.EMAIL_PROVIDER === 'resend' && process.env.RESEND_API_KEY) {
    // Using Resend (Recommended - Easy setup)
    return nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY,
      },
    })
  } else if (process.env.EMAIL_PROVIDER === 'gmail' && process.env.GMAIL_USER) {
    // Using Gmail
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })
  } else {
    // Fallback to Ethereal for testing
    const testAccount = await nodemailer.createTestAccount()
    
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    })
  }
}

export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  try {
    const transporter = await createTransporter()
    
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@school.com',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    })

    console.log('✓ Email sent:', info.messageId)
    
    // If using Ethereal, log the preview URL
    if (info.messageId && !process.env.RESEND_API_KEY && !process.env.GMAIL_USER) {
      const previewUrl = nodemailer.getTestMessageUrl(info)
      console.log('📧 Preview URL:', previewUrl)
    }

    return { 
      success: true, 
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info)
    }
  } catch (error: any) {
    console.error('✗ Email sending failed:', error)
    return { success: false, error: error.message }
  }
}

export async function sendBulkEmail(emails: EmailOptions[]) {
  const results = await Promise.allSettled(
    emails.map(email => sendEmail(email))
  )
  
  return {
    sent: results.filter(r => r.status === 'fulfilled').length,
    failed: results.filter(r => r.status === 'rejected').length,
    results
  }
}
