import { expect, test, type Page } from "@playwright/test"

const adminEmail = process.env.E2E_ADMIN_EMAIL || "admin@demo-school.com"
const adminPassword = process.env.E2E_ADMIN_PASSWORD || "school123"
const runSlot = Math.floor(Date.now() / 1000)
const academicYear = String(2090 + (runSlot % 10))
const term = ["Term 1", "Term 2", "Term 3"][Math.floor(runSlot / 10) % 3]

async function signIn(page: Page) {
  await page.goto("/login")
  await page.getByLabel("Email address").fill(adminEmail)
  await page.getByLabel("Password").fill(adminPassword)
  await page.getByRole("button", { name: /Continue to workspace/i }).click()
  await expect(page).toHaveURL(/\/dashboard/)
}

test.describe("fee creation workflow", () => {
  test("admin can create a fee structure and see the calculated total persisted", async ({ page }) => {
    await signIn(page)
    await page.goto("/dashboard/fees/structures/new")

    await expect(page.getByRole("heading", { name: "Create Fee Structure" })).toBeVisible()
    await page.locator("select").nth(0).selectOption({ label: "Class 2" })
    await page.locator("select").nth(1).selectOption({ label: term })
    await page.locator('input[type="number"]').nth(0).fill(academicYear)
    await page.locator('input[type="date"]').fill("2099-12-31")

    const feeInputs = page.locator('input[type="number"]')
    await feeInputs.nth(1).fill("20000")
    await feeInputs.nth(2).fill("1500")
    await feeInputs.nth(3).fill("750")
    await feeInputs.nth(4).fill("500")
    await feeInputs.nth(5).fill("1000")
    await feeInputs.nth(6).fill("2500")

    await expect(page.getByText("KES 26,250.00")).toBeVisible()
    await page.getByRole("button", { name: "Create Fee Structure" }).click()

    await expect(page).toHaveURL(/\/dashboard\/fees\/structures$/)
    const createdRow = page.locator("tr").filter({ hasText: "Class 2" }).filter({ hasText: term }).filter({ hasText: academicYear })
    await expect(createdRow).toContainText("KES 26,250")
    await expect(createdRow).toContainText("KES 6,250")

    await createdRow.getByRole("link", { name: /View/ }).click()
    await expect(page).toHaveURL(/\/dashboard\/fees\/structures\/[^/]+$/)
    await expect(page.getByText("KES 26,250", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("Total", { exact: true })).toBeVisible()

    await page.reload()
    await expect(page.getByText("KES 26,250", { exact: true }).first()).toBeVisible()
  })
})
