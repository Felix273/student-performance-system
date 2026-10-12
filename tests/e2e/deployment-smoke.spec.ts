import { expect, test } from "@playwright/test"

test.describe("deployment smoke checks", () => {
  test("login and session endpoints respond; protected dashboard redirects anonymously", async ({ page }) => {
    const loginResponse = await page.goto("/login")
    expect(loginResponse?.ok()).toBeTruthy()
    await expect(page.getByLabel("Email address")).toBeVisible()
    await expect(page.getByLabel("Password")).toBeVisible()

    const sessionResponse = await page.request.get("/api/auth/session")
    expect(sessionResponse.ok()).toBeTruthy()
    expect(await sessionResponse.json()).toBeNull()

    await page.goto("/dashboard/students")
    await expect(page).toHaveURL(/\/login/)
  })
})