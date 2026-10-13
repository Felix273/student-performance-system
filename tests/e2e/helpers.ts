import { expect, type Page } from "@playwright/test"

export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login")
  await page.getByLabel("Email address").fill(email)
  await page.getByLabel("Password").fill(password)
  await page.getByRole("button", { name: /Continue to workspace/i }).click()
  await expect(page).toHaveURL(/\/dashboard/)
}

export const mutationsEnabled = process.env.E2E_MUTATE_TEST_DATA === "true"