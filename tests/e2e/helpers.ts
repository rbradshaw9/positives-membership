import { expect, type Page } from "@playwright/test";

export const MEMBER_EMAIL = process.env.E2E_MEMBER_EMAIL ?? "rbradshaw+l1@gmail.com";
export const MEMBER_PASSWORD = process.env.E2E_MEMBER_PASSWORD ?? "PiR43Tx2-";
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "lopcadmin@gmail.com";
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "PiR43Tx2-";

export async function loginWithPassword(
  page: Page,
  {
    email,
    password,
    next = "/today",
  }: {
    email: string;
    password: string;
    next?: string;
  }
) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(new RegExp(`${next.replace("/", "\\/")}$`));
}
