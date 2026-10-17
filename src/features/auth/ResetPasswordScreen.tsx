"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CenteredScreen } from "@/components/ui/CenteredScreen";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { fieldStyle } from "@/components/ui/fieldStyle";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { updatePassword } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import { C } from "@/styles/tokens";

const MIN_PASSWORD = 6;

/* Opened from the reset email. The link carries a recovery session that
   supabase-js picks up from the URL; the form then sets the new password. */
export function ResetPasswordScreen() {
  const router = useRouter();
  const [ready, setReady] = useState<"checking" | "ok" | "expired">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !cancelled) setReady("ok");
    });
    // The session from the link may already be in place.
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) setReady("ok");
      else setTimeout(() => setReady((r) => (r === "checking" ? "expired" : r)), 4000);
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  const submit = async () => {
    setError("");
    if (password.length < MIN_PASSWORD) {
      setError(`비밀번호는 ${MIN_PASSWORD}자 이상으로 입력해 주세요.`);
      return;
    }
    if (password !== confirm) {
      setError("비밀번호가 일치하지 않아요.");
      return;
    }
    setBusy(true);
    const result = await updatePassword(password);
    setBusy(false);
    if (result.error) {
      setError(
        /different from the old/i.test(result.error.message)
          ? "기존 비밀번호와 다른 비밀번호를 입력해 주세요."
          : "비밀번호를 바꾸지 못했어요. 링크가 만료됐을 수 있어요.",
      );
      return;
    }
    router.replace("/");
  };

  return (
    <CenteredScreen>
      <div style={{ width: "100%", maxWidth: 400, textAlign: "left" }}>
        <SectionCard>
          <Eyebrow>비밀번호 재설정</Eyebrow>
          {ready === "checking" && <div style={{ marginTop: 12, fontSize: 13 }}>확인 중...</div>}
          {ready === "expired" && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
              링크가 만료됐거나 올바르지 않아요. 로그인 화면에서 재설정 메일을 다시 요청해 주세요.
              <PrimaryButton onClick={() => router.replace("/")}>홈으로</PrimaryButton>
            </div>
          )}
          {ready === "ok" && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={`새 비밀번호 (${MIN_PASSWORD}자 이상)`}
                autoComplete="new-password"
                style={fieldStyle}
              />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="새 비밀번호 확인"
                autoComplete="new-password"
                onKeyDown={(e) => e.key === "Enter" && submit()}
                style={fieldStyle}
              />
              {error && <div style={{ fontSize: 12, color: C.danger }}>{error}</div>}
              <PrimaryButton onClick={submit} disabled={busy || !password || !confirm}>
                {busy ? "저장 중..." : "비밀번호 바꾸기"}
              </PrimaryButton>
            </div>
          )}
        </SectionCard>
      </div>
    </CenteredScreen>
  );
}
