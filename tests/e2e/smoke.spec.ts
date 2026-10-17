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
  await pickLastDay(page);
  await expect(page.getByRole("button", { name: /5자리 남음/ }).first()).toBeVisible();

  await page.getByRole("button", { name: "내 일정" }).click();
  await expect(page.getByText("Yongsan Mmove · 코트").first()).toBeVisible();

  // As an admin, delete the booking again from the grid.
  await page.getByRole("button", { name: "코트 예약" }).click();
  await pickLastDay(page);
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: /5자리 남음/ })
    .first()
    .click();
  await page.getByRole("button", { name: "예약 삭제" }).click();
  await expect(freeSlots).toHaveCount(before);
});

test("the owner can run a league event: create, add players, generate a schedule, delete", async ({ page }) => {
  await logIn(page, OWNER);
  await page.getByRole("button", { name: "리그" }).click();

  const name = `E2E 리그 ${Date.now()}`;
  await page.getByRole("button", { name: "새 이벤트" }).click();
  await page.getByPlaceholder("이벤트 이름", { exact: false }).fill(name);
  await page.getByRole("button", { name: "이벤트 만들기" }).click();
  await expect(page.getByText(name)).toBeVisible();

  for (const guest of ["게스트 A", "게스트 B", "게스트 C", "게스트 D"]) {
    await page.getByPlaceholder("게스트 이름").fill(guest);
    await page.getByRole("button", { name: "게스트", exact: true }).click();
    await expect(page.getByText(guest)).toBeVisible();
  }
  await expect(page.getByText("총 4명 등록됨")).toBeVisible();

  await page.getByRole("button", { name: "대진표", exact: true }).click();
  await page.getByRole("button", { name: "대진표 생성" }).click();
  await expect(page.getByText("ROUND 1")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "리그" }).click();
  await page.getByRole("button", { name: name }).click();
  await page.getByRole("button", { name: "대진표", exact: true }).click();
  await expect(page.getByText("ROUND 1")).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "이벤트 삭제" }).click();
  await expect(page.getByText("리그 이벤트", { exact: true })).toBeVisible();
  await expect(page.getByText(name)).toHaveCount(0);
});

test("the owner can add a venue with a court and delete it again", async ({ page }) => {
  await logIn(page, OWNER);
  await page.getByRole("button", { name: "지점 설정" }).click();

  const name = `E2E 지점 ${Date.now()}`;
  await page.getByPlaceholder("예: Yongsan Mmove").fill(name);
  await page.getByRole("button", { name: "지점 추가" }).click();
  await expect(page.getByRole("combobox").first()).toContainText(name);

  // The new venue has no courts yet; add one with the default name.
  await page.getByRole("button", { name: "지점 설정" }).click();
  await page.getByRole("button", { name: "코트 추가" }).click();
  await expect(page.getByRole("button", { name: "코트 1 숨기기" })).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "지점 삭제" }).click();
  await expect(page.getByRole("combobox").first()).not.toContainText(name);
});

test("the owner can change a member's role and change it back", async ({ page }) => {
  await logIn(page, OWNER);
  await page.getByRole("button", { name: "회원", exact: true }).click();

  const role = page.getByLabel("이서연 역할");
  await expect(role).toHaveValue("member");
  await role.selectOption("admin");
  await page.reload();
  await page.getByRole("button", { name: "회원", exact: true }).click();
  await expect(page.getByLabel("이서연 역할")).toHaveValue("admin");

  await page.getByLabel("이서연 역할").selectOption("member");
  await expect(page.getByLabel("이서연 역할")).toHaveValue("member");
});
