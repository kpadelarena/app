import { useState } from "react";
import { LogOut, UserCircle, UserPlus } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { fieldStyle } from "@/components/ui/fieldStyle";
import { PhotoInput } from "@/components/ui/PhotoInput";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import type { Contact, Member } from "@/lib/types";
import { C } from "@/styles/tokens";
import { LevelSlider } from "./LevelSlider";

export interface SignUpForm {
  name: string;
  email: string;
  password: string;
  level: number;
  phone: string;
}

export type AuthOutcome = { error?: string; signedIn?: boolean };

interface AuthModalProps {
  member: Member | null;
  contact: Contact | null;
  onLogIn: (email: string, password: string) => Promise<AuthOutcome>;
  onLogout: () => void;
  onSignUp: (form: SignUpForm) => Promise<AuthOutcome>;
  onUploadProfilePhoto: (file: File) => void | Promise<void>;
  onSetProfilePhotoUrl: (url: string) => void;
  onUpdateLevel: (level: number) => void;
  profileUploading: boolean;
  onClose: () => void;
}

const MIN_PASSWORD = 6;

/* Supabase's English auth errors, in the user's language. */
function signUpError(message: string) {
  if (/already registered|already exists/i.test(message)) return "이미 가입된 이메일이에요.";
  if (/password/i.test(message)) return `비밀번호는 ${MIN_PASSWORD}자 이상으로 입력해 주세요.`;
  if (/email/i.test(message)) return "이메일 주소를 확인해 주세요.";
  return "가입에 실패했어요. 잠시 후 다시 시도해 주세요.";
}

function Avatar({ photo, alt, size }: { photo: string | null; alt: string; size: number }) {
  if (photo) {
    return <img src={photo} alt={alt} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />;
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: C.paperDim,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <UserCircle size={Math.round(size * 0.53)} color="rgba(27,36,34,0.4)" />
    </div>
  );
}

const linkButtonStyle = { background: "none", border: "none", cursor: "pointer", fontSize: 13 } as const;

export function AuthModal({
  member,
  contact,
  onLogIn,
  onLogout,
  onSignUp,
  onUploadProfilePhoto,
  onSetProfilePhotoUrl,
  onUpdateLevel,
  profileUploading,
  onClose,
}: AuthModalProps) {
  const [mode, setMode] = useState<"profile" | "login" | "signup">(member ? "profile" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [level, setLevel] = useState(3.0);
  const [signupPhotoFile, setSignupPhotoFile] = useState<File | null>(null); // uploaded once the account exists
  const [signupError, setSignupError] = useState("");
  const [busy, setBusy] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginNotice, setLoginNotice] = useState("");

  const submitSignUp = async () => {
    setSignupError("");
    if (!name.trim()) return;
    if (!email.includes("@")) {
      setSignupError("이메일 주소를 확인해 주세요.");
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setSignupError(`비밀번호는 ${MIN_PASSWORD}자 이상으로 입력해 주세요.`);
      return;
    }
    if (password !== passwordConfirm) {
      setSignupError("비밀번호가 일치하지 않아요.");
      return;
    }
    setBusy(true);
    const result = await onSignUp({ name: name.trim(), email: email.trim(), password, level, phone: phone.trim() });
    setBusy(false);
    if (result.error) {
      setSignupError(signUpError(result.error));
      return;
    }
    if (!result.signedIn) {
      // Email confirmation is on: the account exists but can't be used yet.
      setLoginEmail(email.trim());
      setLoginNotice("가입 확인 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요.");
      setMode("login");
      return;
    }
    if (signupPhotoFile) await onUploadProfilePhoto(signupPhotoFile);
    setMode("profile");
  };

  const submitLogin = async () => {
    setLoginError("");
    if (!loginEmail.trim() || !loginPassword) {
      setLoginError("이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    setBusy(true);
    const result = await onLogIn(loginEmail, loginPassword);
    setBusy(false);
    if (result.error) {
      setLoginError("이메일 또는 비밀번호가 올바르지 않아요.");
      return;
    }
    onClose();
  };

  return (
    <BottomSheet
      header={<Eyebrow>{mode === "profile" ? "내 프로필" : mode === "login" ? "로그인" : "회원가입"}</Eyebrow>}
      headerAlign="center"
      zIndex={60}
      onClose={onClose}
    >
      {mode === "profile" && member && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Avatar photo={member.photo} alt={member.name} size={64} />
            <div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{member.name}</div>
              <div style={{ fontSize: 12, color: "rgba(27,36,34,0.5)" }}>
                Lv.{member.level.toFixed(1)}
                {contact?.email ? ` · ${contact.email}` : ""}
                {contact?.phone ? ` · ${contact.phone}` : ""}
              </div>
            </div>
          </div>

          <PhotoInput
            label={member.photo ? "프로필 사진 교체" : "프로필 사진 추가"}
            uploading={profileUploading}
            onFile={onUploadProfilePhoto}
            onSetUrl={onSetProfilePhotoUrl}
          />

          <LevelSlider value={member.level} onChange={onUpdateLevel} />

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <PrimaryButton onClick={onLogout} icon={LogOut} style={{ background: C.danger, color: "#fff" }}>
              로그아웃
            </PrimaryButton>
          </div>
        </div>
      )}

      {mode === "login" && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {loginNotice && <div style={{ fontSize: 12, color: C.turf }}>{loginNotice}</div>}
          <input
            type="email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            placeholder="이메일"
            autoCapitalize="off"
            style={fieldStyle}
          />
          <input
            type="password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            placeholder="비밀번호"
            onKeyDown={(e) => e.key === "Enter" && submitLogin()}
            style={fieldStyle}
          />
          {loginError && <div style={{ fontSize: 12, color: C.danger }}>{loginError}</div>}
          <PrimaryButton onClick={submitLogin} disabled={busy}>
            {busy ? "확인 중..." : "로그인"}
          </PrimaryButton>
          <button
            onClick={() => setMode("signup")}
            style={{ ...linkButtonStyle, marginTop: 8, color: C.turf, fontWeight: 700 }}
          >
            + 새 회원가입
          </button>
        </div>
      )}

      {mode === "signup" && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar photo={signupPhotoFile ? URL.createObjectURL(signupPhotoFile) : null} alt="" size={56} />
            <PhotoInput
              label="프로필 사진"
              uploading={false}
              onFile={setSignupPhotoFile}
              onSetUrl={(url) => onSetProfilePhotoUrl(url)}
            />
          </div>

          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" style={fieldStyle} />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일"
            autoCapitalize="off"
            style={fieldStyle}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={`비밀번호 (${MIN_PASSWORD}자 이상)`}
            style={fieldStyle}
          />
          <input
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder="비밀번호 확인"
            style={fieldStyle}
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="연락처 (선택, 관리자에게만 보여요)"
            style={fieldStyle}
          />
          <LevelSlider value={level} onChange={setLevel} />

          {signupError && <div style={{ fontSize: 12, color: C.danger }}>{signupError}</div>}

          <PrimaryButton
            onClick={submitSignUp}
            icon={UserPlus}
            disabled={busy || !name.trim() || !email.trim() || password.length < MIN_PASSWORD}
          >
            {busy ? "가입 중..." : "가입하기"}
          </PrimaryButton>
          <div style={{ fontSize: 11, color: "rgba(27,36,34,0.5)" }}>
            가입하면{" "}
            <a href="/terms" target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
              이용약관
            </a>
            과{" "}
            <a href="/privacy" target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
              개인정보처리방침
            </a>
            에 동의하는 것으로 봐요.
          </div>
          <button onClick={() => setMode("login")} style={{ ...linkButtonStyle, color: "rgba(27,36,34,0.5)" }}>
            이미 계정이 있어요
          </button>
        </div>
      )}
    </BottomSheet>
  );
}
