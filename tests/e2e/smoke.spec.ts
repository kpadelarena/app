import { expect, test } from "@playwright/test";

// The dev login seeded by supabase/seed.sql.
const OWNER = { username: "owner", password: "padel-dev", name: "관리자" };

test("a visitor sees the club without logging in", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "회원가입 · 로그인" })).toBeVisible();
  await expect(page.getByRole("button", { name: "코트 예약" })).toBeVisible();
});

test("the owner can log in, add a player and generate a schedule", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "회원가입 · 로그인" }).click();
  await page.getByPlaceholder("아이디").fill(OWNER.username);
  await page.getByPlaceholder("비밀번호").fill(OWNER.password);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page.getByText(OWNER.name).first()).toBeVisible();

  const guest = `E2E ${Date.now()}`;
  await page.getByRole("button", { name: "선수 · 팀" }).click();
  await page.getByPlaceholder("이름 입력").fill(guest);
  await page.getByPlaceholder("이름 입력").press("Enter");
  await expect(page.getByText(guest)).toBeVisible();

  await page.getByRole("button", { name: "대진표", exact: true }).click();
  await page.getByRole("button", { name: /대진표 (다시 )?생성/ }).click();
  await expect(page.getByText("ROUND 1")).toBeVisible();

  // The schedule is stored, not just in memory.
  await page.reload();
  await page.getByRole("button", { name: "대진표", exact: true }).click();
  await expect(page.getByText("ROUND 1")).toBeVisible();
});
