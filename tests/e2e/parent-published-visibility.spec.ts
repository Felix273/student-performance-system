import { expect, test } from "@playwright/test"
import { signIn } from "./helpers"

const parentEmail = process.env.E2E_PARENT_EMAIL
const parentPassword = process.env.E2E_PARENT_PASSWORD
const publishedStudentId = process.env.E2E_PARENT_STUDENT_ID

test("parent learning updates expose only published snapshots", async ({ page }) => {
  test.skip(!parentEmail || !parentPassword || !publishedStudentId, "Set dedicated linked-parent credentials and E2E_PARENT_STUDENT_ID")

  await signIn(page, parentEmail!, parentPassword!)
  await page.goto("/dashboard/parent/learning-updates")
  await expect(page.getByRole("heading", { name: "Learning updates" })).toBeVisible()
  await expect(page.getByText("Draft and review-stage evidence is intentionally excluded.")).toBeVisible()

  const timelineResponse = await page.evaluate(async (studentId) => {
    const response = await fetch(`/api/students/${encodeURIComponent(studentId)}/evidence-timeline`)
    return { status: response.status, body: await response.json() }
  }, publishedStudentId!)
  expect(timelineResponse.status).toBe(200)
  expect(timelineResponse.body.publishedOnly).toBe(true)
  expect(timelineResponse.body.timeline.every((item: { status: string }) => item.status === "PUBLISHED")).toBe(true)
  expect(timelineResponse.body.timeline.every((item: Record<string, unknown>) => !("internalNote" in item) && !("reviewReason" in item))).toBe(true)
})