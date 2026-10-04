import { expect, test, type Page } from "@playwright/test";

// The dev login seeded by supabase/seed.sql.
const OWNER = { username: "owner", password: "padel-dev", name: "관리자" };

async function logInAsOwner(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "회원가입 · 로그인" }).click();
  await page.getByPlaceholder("아이디").fill(OWNER.username);
  await page.getByPlaceholder("비밀번호").fill(OWNER.password);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page.getByText(OWNER.name).first()).toBeVisible();
}

test("a visitor sees the club without logging in", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "회원가입 · 로그인" })).toBeVisible();
  await expect(page.getByRole("button", { name: "코트 예약" })).toBeVisible();
});

test("the owner can add a player and generate a schedule", async ({ page }) => {
  await logInAsOwner(page);

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

test("the owner can book a free court slot", async ({ page }) => {
  await logInAsOwner(page);

  const freeSlots = page.getByRole("button", { name: "예약 가능", exact: true });
  const before = await freeSlots.count();
  await freeSlots.first().click();
  await page.getByRole("button", { name: "예약하기" }).click();

  // The slot now shows as partly booked, in the grid and after a reload.
  await expect(freeSlots).toHaveCount(before - 1);
  await page.reload();
  await expect(page.getByRole("button", { name: /3자리 남음/ }).first()).toBeVisible();
});
