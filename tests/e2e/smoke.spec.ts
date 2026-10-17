import { expect, test, type Page } from "@playwright/test";

// The dev logins seeded by supabase/seed.sql.
const OWNER = { email: "owner@example.com", password: "padel-dev1", name: "관리자" };

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
  await page.getByRole("button", { name: "지점 추가" }).click();

  const name = `E2E 지점 ${Date.now()}`;
  await page.getByPlaceholder("예: Yongsan Mmove").fill(name);
  await page.getByRole("button", { name: "지점 추가" }).last().click();
  await expect(page.getByRole("combobox").first()).toContainText(name);

  // The new venue has no courts yet, so its settings open by themselves; add a court with the default name.
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

const MEMBER = { email: "member@example.com", password: "padel-dev1", name: "이서연" };

/* The local stack delivers auth mail to Mailpit; this returns the first link in the newest message to `email`. */
async function latestMailLink(email: string) {
  const list = await (
    await fetch("http://127.0.0.1:54324/api/v1/search?query=" + encodeURIComponent(`to:${email}`))
  ).json();
  const id = list.messages?.[0]?.ID;
  if (!id) throw new Error(`no mail for ${email}`);
  const message = await (await fetch(`http://127.0.0.1:54324/api/v1/message/${id}`)).json();
  const match = (message.Text as string).match(/https?:\/\/\S+/);
  if (!match) throw new Error("no link in mail");
  return match[0];
}

/* Requests a reset mail for the member, opens the link and sets `password`. */
async function resetPasswordTo(page: Page, password: string, previousLink: string | null) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  await page.getByRole("button", { name: "회원가입 · 로그인" }).click();
  await page.getByRole("button", { name: "비밀번호를 잊으셨나요?" }).click();
  await page.getByPlaceholder("이메일").fill(MEMBER.email);
  await page.getByRole("button", { name: "재설정 메일 보내기" }).click();
  await expect(page.getByText("재설정 링크를 보냈어요")).toBeVisible();

  await expect.poll(() => latestMailLink(MEMBER.email).catch(() => null), { timeout: 10_000 }).not.toBe(previousLink);
  const link = await latestMailLink(MEMBER.email);
  await page.goto(link);
  await expect(page).toHaveURL(/\/reset-password/);
  await page.getByPlaceholder("새 비밀번호", { exact: false }).first().fill(password);
  await page.getByPlaceholder("새 비밀번호 확인").fill(password);
  await page.getByRole("button", { name: "비밀번호 바꾸기" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(MEMBER.name).first()).toBeVisible();
  return link;
}

test("a member can reset their password from the emailed link", async ({ page }) => {
  // Supabase refuses a password equal to the current one, so change it and then restore the seeded one.
  const first = await resetPasswordTo(page, `temp-${Date.now()}`, null);
  await resetPasswordTo(page, MEMBER.password, first);
});

test("the sign-up button waits for a matching, valid password", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "회원가입 · 로그인" }).click();
  await page.getByRole("button", { name: "+ 새 회원가입" }).click();
  const submit = page.getByRole("button", { name: "가입하기" });

  await page.getByPlaceholder("이름").first().fill("테스트");
  await page.getByPlaceholder("이메일").fill("new@example.com");
  await page.getByPlaceholder("비밀번호", { exact: true }).fill("padel2026");
  await expect(submit).toBeDisabled();

  await page.getByPlaceholder("비밀번호 확인").fill("padel2025");
  await expect(page.getByText("비밀번호가 일치하지 않아요.")).toBeVisible();
  await expect(submit).toBeDisabled();

  await page.getByPlaceholder("비밀번호 확인").fill("padel2026");
  await expect(submit).toBeEnabled();

  await page.getByPlaceholder("비밀번호", { exact: true }).fill("padelpadel");
  await expect(page.getByText("비밀번호에 숫자를 넣어 주세요.")).toBeVisible();
  await expect(submit).toBeDisabled();
});
