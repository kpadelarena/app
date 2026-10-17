import { describe, expect, it } from "vitest";
import { newPasswordSchema, signUpSchema, validate } from "./validation";

const ok = { name: "민준", email: "minjun@example.com", password: "padel2026", passwordConfirm: "padel2026" };

describe("signUpSchema", () => {
  it("accepts a complete form", () => {
    expect(validate(signUpSchema, ok)).toEqual({});
  });

  it("requires the confirmation to match", () => {
    expect(validate(signUpSchema, { ...ok, passwordConfirm: "" })).toEqual({
      passwordConfirm: "비밀번호가 일치하지 않아요.",
    });
  });

  it("wants 8+ characters with a letter and a digit", () => {
    expect(validate(signUpSchema, { ...ok, password: "abc1", passwordConfirm: "abc1" }).password).toMatch(/8자/);
    expect(validate(signUpSchema, { ...ok, password: "12345678", passwordConfirm: "12345678" }).password).toMatch(
      /영문/,
    );
    expect(validate(signUpSchema, { ...ok, password: "abcdefgh", passwordConfirm: "abcdefgh" }).password).toMatch(
      /숫자/,
    );
  });

  it("reports the first problem per field", () => {
    const errors = validate(signUpSchema, { name: " ", email: "nope", password: "", passwordConfirm: "x" });
    expect(Object.keys(errors).sort()).toEqual(["email", "name", "password", "passwordConfirm"]);
  });
});

describe("newPasswordSchema", () => {
  it("applies the same password rule", () => {
    expect(validate(newPasswordSchema, { password: "padel2026", passwordConfirm: "padel2026" })).toEqual({});
    expect(validate(newPasswordSchema, { password: "short1", passwordConfirm: "short1" }).password).toMatch(/8자/);
  });
});
