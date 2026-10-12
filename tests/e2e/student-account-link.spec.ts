import { expect, test } from "@playwright/test"
import { mutationsEnabled, signIn } from "./helpers"

const adminEmail = process.env.E2E_ADMIN_EMAIL
const adminPassword = process.env.E2E_ADMIN_PASSWORD
const admissionNo = process.env.E2E_UNLINKED_STUDENT_ADMISSION
const studentName = process.env.E2E_LINKED_STUDENT_NAME
const studentEmail = process.env.E2E_STUDENT_LOGIN_EMAIL
const studentPassword = process.env.E2E_STUDENT_LOGIN_PASSWORD

test("admin links a student account and that account opens only its learner portal", async ({ page, context }) => {
  test.skip(!mutationsEnabled, "Set E2E_MUTATE_TEST_DATA=true only for a dedicated disposable E2E database")
  test.skip(!adminEmail || !adminPassword || !admissionNo || !studentName || !studentEmail || !studentPassword, "Provide dedicated admin/student credentials and an unlinked learner fixture")

  await signIn(page, adminEmail!, adminPassword!)
  await page.goto("/dashboard/users/new")
  await page.getByRole("button", { name: "Student", exact: true }).click()
  await page.getByLabel("Full Name *").fill(studentName!)
  await page.getByLabel("Email Address *").fill(studentEmail!)
  await page.getByLabel("Password *").fill(studentPassword!)
  await page.getByLabel(new RegExp(admissionNo!, "i")).check()
  await page.getByRole("button", { name: "Create Student" }).click()

  await expect(page).toHaveURL(/\/dashboard\/users$/)
  await expect(page.getByText(studentEmail!, { exact: true })).toBeVisible()
  await context.clearCookies()
  await signIn(page, studentEmail!, studentPassword!)
  await expect(page).toHaveURL(/\/dashboard\/student/)
  await expect(page.getByRole("heading", { name: new RegExp(studentName!.split(" ")[0], "i") })).toBeVisible()
})