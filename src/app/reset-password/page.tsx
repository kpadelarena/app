import type { Metadata } from "next";
import { ResetPasswordScreen } from "@/features/auth/ResetPasswordScreen";
import { CLUB_NAME } from "@/features/club/constants";

export const metadata: Metadata = { title: `비밀번호 재설정 · ${CLUB_NAME}` };

export default function ResetPasswordPage() {
  return <ResetPasswordScreen />;
}
