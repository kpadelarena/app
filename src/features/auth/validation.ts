import { z } from "zod";

export const MIN_PASSWORD = 8;

/** At least 8 characters with a letter and a digit. Kept simple on purpose. */
export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD, `비밀번호는 ${MIN_PASSWORD}자 이상으로 입력해 주세요.`)
  .regex(/[A-Za-z]/, "비밀번호에 영문자를 넣어 주세요.")
  .regex(/\d/, "비밀번호에 숫자를 넣어 주세요.");

export const PASSWORD_HINT = `${MIN_PASSWORD}자 이상, 영문과 숫자 포함`;

export const signUpSchema = z
  .object({
    name: z.string().trim().min(1, "이름을 입력해 주세요."),
    email: z.string().trim().email("이메일 주소를 확인해 주세요."),
    password: passwordSchema,
    passwordConfirm: z.string(),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    message: "비밀번호가 일치하지 않아요.",
    path: ["passwordConfirm"],
  });

export type SignUpFields = z.input<typeof signUpSchema>;

/** The first message per field, or an empty object when everything passes. */
export function validate<T extends z.ZodTypeAny>(schema: T, values: z.input<T>): Partial<Record<string, string>> {
  const result = schema.safeParse(values);
  if (result.success) return {};
  const errors: Partial<Record<string, string>> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "");
    if (!(key in errors)) errors[key] = issue.message;
  }
  return errors;
}

export const newPasswordSchema = z
  .object({ password: passwordSchema, passwordConfirm: z.string() })
  .refine((v) => v.password === v.passwordConfirm, {
    message: "비밀번호가 일치하지 않아요.",
    path: ["passwordConfirm"],
  });
