import { sendEmail } from "./lib/email/emailService";
import { emailTemplates } from "./lib/email/templates";

async function testEmail() {
  console.log("🧪 Testing Email System...\n");

  // Test Welcome Email
  console.log("1. Testing Welcome Email...");
  const welcomeTemplate = emailTemplates.welcome(
    "John Doe",
    "TEACHER",
    "http://localhost:3001/login"
  );

  const result1 = await sendEmail({
    to: "test@example.com",
    subject: welcomeTemplate.subject,
    html: welcomeTemplate.html,
  });

  if (result1.success) {
    console.log("✓ Welcome email test passed");
    console.log("📧 Preview:", result1.previewUrl);
  } else {
    console.log("✗ Welcome email test failed:", result1.error);
  }

  console.log("\n2. Testing Report Card Email...");
  const reportTemplate = emailTemplates.reportCard(
    "Jane Parent",
    "John Student",
    "http://localhost:3001/dashboard/parent",
    {
      average: 85.5,
      totalAssessments: 10,
      highest: 95,
      trend: "Improving",
    }
  );

  const result2 = await sendEmail({
    to: "parent@example.com",
    subject: reportTemplate.subject,
    html: reportTemplate.html,
  });

  if (result2.success) {
    console.log("✓ Report card email test passed");
    console.log("📧 Preview:", result2.previewUrl);
  } else {
    console.log("✗ Report card email test failed:", result2.error);
  }

  console.log("\n✅ Email system test complete!");
  process.exit(0);
}

testEmail().catch(console.error);
