import { expect, test } from "@playwright/test"
import { signIn } from "./helpers"

const adminEmail = process.env.E2E_ADMIN_EMAIL
const adminPassword = process.env.E2E_ADMIN_PASSWORD

test("student CSV import previews rows and blocks invalid data before upload", async ({ page }) => {
  test.skip(!adminEmail || !adminPassword, "Set dedicated E2E admin credentials")

  await signIn(page, adminEmail!, adminPassword!)
  await page.goto("/dashboard/bulk-upload")
  await expect(page.getByRole("heading", { name: "Bulk Upload" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Bulk Import Students" })).toBeVisible()
  await page.locator("#file-upload").setInputFiles({
    name: "invalid-student-import.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("name,admissionNo,className,grade\n,,,\n"),
  })
  await expect(page.getByRole("heading", { name: "Preview (First 5 rows)" })).toBeVisible()
  await page.getByRole("button", { name: /Upload 1\+ Students/ }).click()
  await expect(page.getByText(/Validation errors:/)).toBeVisible()
  await expect(page.getByText(/Missing name/)).toBeVisible()
  await expect(page.getByText(/Missing admission number/)).toBeVisible()
})