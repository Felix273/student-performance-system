import { expect, test } from "@playwright/test"
import { mutationsEnabled, signIn } from "./helpers"

const teacherEmail = process.env.E2E_TEACHER_EMAIL
const teacherPassword = process.env.E2E_TEACHER_PASSWORD
const timetableEntryId = process.env.E2E_LESSON_ENTRY_ID

test.describe("teacher lesson workspace", () => {
  test("teacher records attendance and rubric evidence, then submits it for moderation", async ({ page }) => {
    test.skip(!mutationsEnabled, "Set E2E_MUTATE_TEST_DATA=true only for a dedicated disposable E2E database")
    test.skip(!teacherEmail || !teacherPassword || !timetableEntryId, "Set dedicated E2E teacher credentials and E2E_LESSON_ENTRY_ID")

    await signIn(page, teacherEmail!, teacherPassword!)
    await page.goto(`/dashboard/teacher/lesson/${encodeURIComponent(timetableEntryId!)}`)
    await expect(page.getByRole("heading", { name: /·/ })).toBeVisible()
    await expect(page.getByText("Learner workflow")).toBeVisible()

    const planSelect = page.getByRole("combobox", { name: "Assessment plan" })
    await expect(planSelect).toBeVisible()
    await planSelect.selectOption({ index: 1 })
    await page.getByRole("button", { name: "Use plan" }).click()
    await expect(page.getByText("Assessment plan selected.")).toBeVisible()

    const learnerCountLabel = await page.getByRole("heading", { name: /\d+ learners/ }).textContent()
    const learnerCount = Number(learnerCountLabel?.match(/\d+/)?.[0] ?? 0)
    expect(learnerCount).toBeGreaterThan(0)

    await page.getByRole("button", { name: "Mark all present" }).click()
    await page.getByRole("button", { name: "Save attendance" }).click()
    await expect(page.getByRole("status").filter({ hasText: "Attendance saved" })).toBeVisible()

    for (let index = 0; index < learnerCount; index++) {
      if (!(await page.getByRole("button", { name: "Capture evidence" }).count())) break
      await page.getByRole("button", { name: "Capture evidence" }).first().click()
      await page.getByLabel("Evidence type").selectOption("RUBRIC")
      await expect(page.getByText("This assessment plan has no rubric configured.")).toHaveCount(0)
      const rubricSelects = page.getByRole("dialog").locator("fieldset select")
      expect(await rubricSelects.count()).toBeGreaterThan(0)
      for (let index = 0; index < await rubricSelects.count(); index++) {
        await rubricSelects.nth(index).selectOption({ index: 1 })
      }
      await page.getByLabel("Feedback / observation").fill("E2E lesson workspace rubric entry")
      await page.getByRole("button", { name: "Save draft" }).click()
      await expect(page.getByRole("status").filter({ hasText: "Evidence saved as a private draft" })).toBeVisible()
    }

    await page.getByRole("button", { name: "Submit for review" }).click()
    await expect(page.getByRole("status").filter({ hasText: "Submitted" })).toBeVisible()
  })
})