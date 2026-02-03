import { test, expect } from "@playwright/test";

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe("smoke", () => {
  test("login → search → me", async ({ page }) => {
    test.skip(!email || !password, "Missing E2E_EMAIL/E2E_PASSWORD");

    await page.goto("/login");
    await page.getByLabel("邮箱").fill(email!);
    await page.getByLabel("密码").fill(password!);
    await page.getByRole("button", { name: "登录" }).click();
    await page.waitForURL("**/dashboard");

    await page.goto("/search?q=system");
    await expect(page.getByText("搜索题目 / 题库")).toBeVisible();

    await page.goto("/me");
    await expect(page.getByText("登录设备")).toBeVisible();
  });
});
