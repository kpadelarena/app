import { expect, test, type Page } from "@playwright/test";

// The dev logins seeded by supabase/seed.sql.
const OWNER = { email: "owner@example.com", password: "padel-dev", name: "관리자" };

/* The last day in the picker, so every slot on it is in the future. */
const pickLastDay = (page: Page) =>
  page
    .getByRole("button", { name: /^(일|월|화|수|목|금|토) \d+\/\d+$/ })
    .last()
    .click();

async function logIn(page: Page, who: { email: string; password: string; name: string }) {
  await page.goto("/");
  await page.getByRole("button", { name: "회원가입 · 로그인" }).click();
  await page.getByPlaceholder("이메일").fill(who.email);
  await page.getByPlaceholder("비밀번호", { exact: true }).fill(who.password);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page.getByText(who.name).first()).toBeVisible();
}

test("a visitor sees the venues and the booking grid without logging in", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "회원가입 · 로그인" })).toBeVisible();
  await expect(page.getByRole("combobox")).toContainText("Yongsan Mmove");
  await pickLastDay(page);
  await expect(page.getByRole("button", { name: "예약 가능", exact: true }).first()).toBeVisible();
});

test("the owner can book a free court slot and see it in their schedule", async ({ page }) => {
  await logIn(page, OWNER);

  await pickLastDay(page);
  const freeSlots = page.getByRole("button", { name: "예약 가능", exact: true });
  const before = await freeSlots.count();
  await freeSlots.first().click();
  await page.getByRole("button", { name: "예약하기" }).click();

  // The slot now shows as partly booked (1 of 6), and still does after a reload.
  await expect(freeSlots).toHaveCount(before - 1);
  await page.reload();
  await expect(page.getByRole("button", { name: /5자리 남음/ }).first()).toBeVisible();

  await page.getByRole("button", { name: "내 일정" }).click();
  await expect(page.getByText("Yongsan Mmove · 코트").first()).toBeVisible();
});
