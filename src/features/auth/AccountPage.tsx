import { useState } from "react";
import { LogOut, UserCircle, UserPlus } from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { fieldStyle } from "@/components/ui/fieldStyle";
import { PhotoInput } from "@/components/ui/PhotoInput";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import type { Contact, Member } from "@/lib/types";
import { C, FONT } from "@/styles/tokens";
import { LevelSlider } from "./LevelSlider";
import { MIN_PASSWORD, PASSWORD_HINT, newPasswordSchema, signUpSchema, validate } from "./validation";

export interface SignUpForm {
  name: string;
  email: string;
  password: string;
  level: number;
  phone: string;
}

export type AuthOutcome = { error?: string; signedIn?: boolean };

interface AccountPageProps {
  member: Member | null;
  contact: Contact | null;
  onLogIn: (email: string, password: string) => Promise<AuthOutcome>;
  /** Starts the Google redirect; resolves with an error only if it could not start. */
  onGoogle: () => Promise<AuthOutcome>;
  /** Emails a password-reset link. */
  onResetPassword: (email: string) => Promise<AuthOutcome>;
  onLogout: () => void;
  onSignUp: (form: SignUpForm) => Promise<AuthOutcome>;
  onUploadProfilePhoto: (file: File) => void | Promise<void>;
  onSetProfilePhotoUrl: (url: string) => void;
  onSaveProfile: (changes: { level: number; phone: string }) => Promise<{ error?: string }>;
  onChangePassword: (password: string) => Promise<{ error?: string }>;
  /** Only accounts that signed up with a password get the change section; Google-only accounts do not. */
  canChangePassword: boolean;
  profileUploading: boolean;
  /** Leaves the page after a successful log-in. */
  onClose: () => void;
}

function GoogleButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "10px 16px",
        borderRadius: 10,
        border: "1px solid rgba(0,0,0,0.15)",
        background: "#fff",
        color: C.charcoal,
        fontFamily: FONT.body,
        fontWeight: 600,
        fontSize: 14,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path
          fill="#EA4335"
          d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"
        />
        <path
          fill="#FBBC05"
          d="M10.5 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.7l7.9-6.1z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.3 0 11.7-2.1 15.6-5.7l-7.7-6c-2.1 1.4-4.8 2.3-7.9 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z"
        />
      </svg>
      Google로 계속하기
    </button>
  );
}

const Divider = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "rgba(27,36,34,0.45)" }}>
    <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.1)" }} />
    또는 이메일로
    <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.1)" }} />
  </div>
);

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

/* The /account page: the member's profile, or the sign-in, sign-up and
   password-reset forms for a visitor. */
export function AccountPage({
  member,
  contact,
  onLogIn,
  onGoogle,
  onResetPassword,
  onLogout,
  onSignUp,
  onUploadProfilePhoto,
  onSetProfilePhotoUrl,
  onSaveProfile,
  onChangePassword,
  canChangePassword,
  profileUploading,
  onClose,
}: AccountPageProps) {
  const [mode, setMode] = useState<"profile" | "login" | "signup" | "reset">(member ? "profile" : "login");
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
  const [resetSent, setResetSent] = useState(false);

  // The profile form edits a draft; nothing is written until 저장.
  const [draftLevel, setDraftLevel] = useState(member?.level ?? 3.0);
  const [draftPhone, setDraftPhone] = useState(contact?.phone ?? "");
  const [profileNotice, setProfileNotice] = useState<{ text: string; error: boolean } | null>(null);
  const profileChanged = !!member && (draftLevel !== member.level || draftPhone.trim() !== (contact?.phone ?? ""));

  // Password change lives in its own collapsed section of the profile.
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [passwordNotice, setPasswordNotice] = useState<{ text: string; error: boolean } | null>(null);
  const newPasswordErrors = validate(newPasswordSchema, { password: newPassword, passwordConfirm: newPasswordConfirm });
  const newPasswordValid = Object.keys(newPasswordErrors).length === 0;

  const submitPasswordChange = async () => {
    if (!newPasswordValid) return;
    setBusy(true);
    const result = await onChangePassword(newPassword);
    setBusy(false);
    if (result.error) {
      setPasswordNotice({
        text: /different from the old/i.test(result.error)
          ? "기존 비밀번호와 다른 비밀번호를 입력해 주세요."
          : "비밀번호를 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.",
        error: true,
      });
      return;
    }
    setNewPassword("");
    setNewPasswordConfirm("");
    setChangingPassword(false);
    setPasswordNotice({ text: "비밀번호를 바꿨어요.", error: false });
  };

  const saveProfile = async () => {
    setBusy(true);
    const result = await onSaveProfile({ level: draftLevel, phone: draftPhone });
    setBusy(false);
    setProfileNotice(
      result.error
        ? { text: "저장에 실패했어요. 잠시 후 다시 시도해 주세요.", error: true }
        : { text: "저장했어요.", error: false },
    );
  };

  const submitReset = async () => {
    setLoginError("");
    if (!loginEmail.includes("@")) {
      setLoginError("이메일 주소를 확인해 주세요.");
      return;
    }
    setBusy(true);
    const result = await onResetPassword(loginEmail);
    setBusy(false);
    if (result.error) {
      setLoginError("메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    setResetSent(true);
  };

  // Checked on every keystroke; the button stays off until the form passes.
  const signupErrors = validate(signUpSchema, { name, email, password, passwordConfirm });
  const signUpValid = Object.keys(signupErrors).length === 0;

  const submitSignUp = async () => {
    setSignupError("");
    if (!signUpValid) {
      setSignupError(Object.values(signupErrors)[0] ?? "");
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
    setDraftLevel(level);
    setDraftPhone(phone.trim());
    setMode("profile");
  };

  /* The page leaves for Google unless the redirect could not start. */
  const startGoogle = async () => {
    setLoginError("");
    setSignupError("");
    setBusy(true);
    const result = await onGoogle();
    if (result.error) {
      setBusy(false);
      const message = "Google 로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.";
      setLoginError(message);
      setSignupError(message);
    }
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

  const title =
    mode === "profile" ? "내 프로필" : mode === "login" ? "로그인" : mode === "reset" ? "비밀번호 재설정" : "회원가입";

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <SectionCard>
        <Eyebrow>{title}</Eyebrow>
        {mode === "profile" && member && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Avatar photo={member.photo} alt={member.name} size={64} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{member.name}</div>
                <div style={{ fontSize: 12, color: "rgba(27,36,34,0.5)" }}>Lv.{member.level.toFixed(1)}</div>
                {contact?.email && (
                  <div style={{ fontSize: 12, color: "rgba(27,36,34,0.5)", overflowWrap: "anywhere" }}>
                    {contact.email}
                    <span style={{ marginLeft: 6, fontSize: 11 }}>· 나와 관리자에게만 보여요</span>
                  </div>
                )}
              </div>
            </div>

            <PhotoInput
              label={member.photo ? "프로필 사진 교체" : "프로필 사진 추가"}
              uploading={profileUploading}
              onFile={onUploadProfilePhoto}
              onSetUrl={onSetProfilePhotoUrl}
            />

            <LevelSlider value={draftLevel} onChange={setDraftLevel} />

            <label
              style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "rgba(27,36,34,0.6)" }}
            >
              연락처 · 관리자에게만 보여요
              <input
                type="tel"
                value={draftPhone}
                onChange={(e) => setDraftPhone(e.target.value)}
                placeholder="010-0000-0000"
                style={fieldStyle}
              />
            </label>

            {canChangePassword && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  onClick={() => {
                    setChangingPassword(!changingPassword);
                    setPasswordNotice(null);
                  }}
                  style={{ ...linkButtonStyle, alignSelf: "flex-start", padding: 0, color: C.turf, fontWeight: 700 }}
                >
                  {changingPassword ? "비밀번호 변경 닫기" : "비밀번호 변경"}
                </button>
                {changingPassword && (
                  <>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="새 비밀번호"
                      autoComplete="new-password"
                      style={fieldStyle}
                    />
                    <div
                      style={{
                        fontSize: 11,
                        color: newPassword && newPasswordErrors.password ? C.danger : "rgba(27,36,34,0.5)",
                      }}
                    >
                      {(newPassword && newPasswordErrors.password) || PASSWORD_HINT}
                    </div>
                    <input
                      type="password"
                      value={newPasswordConfirm}
                      onChange={(e) => setNewPasswordConfirm(e.target.value)}
                      placeholder="새 비밀번호 확인"
                      autoComplete="new-password"
                      onKeyDown={(e) => e.key === "Enter" && submitPasswordChange()}
                      style={fieldStyle}
                    />
                    {newPasswordConfirm && newPasswordErrors.passwordConfirm && (
                      <div style={{ fontSize: 11, color: C.danger }}>{newPasswordErrors.passwordConfirm}</div>
                    )}
                    <PrimaryButton onClick={submitPasswordChange} disabled={busy || !newPasswordValid}>
                      {busy ? "저장 중..." : "비밀번호 바꾸기"}
                    </PrimaryButton>
                  </>
                )}
                {passwordNotice && (
                  <div style={{ fontSize: 12, color: passwordNotice.error ? C.danger : C.turf }}>
                    {passwordNotice.text}
                  </div>
                )}
              </div>
            )}

            {profileNotice && (
              <div style={{ fontSize: 12, color: profileNotice.error ? C.danger : C.turf }}>{profileNotice.text}</div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 4, justifyContent: "space-between" }}>
              <PrimaryButton onClick={saveProfile} disabled={busy || !profileChanged}>
                {busy ? "저장 중..." : "저장"}
              </PrimaryButton>
              <PrimaryButton onClick={onLogout} icon={LogOut} style={{ background: C.danger, color: "#fff" }}>
                로그아웃
              </PrimaryButton>
            </div>
          </div>
        )}

        {mode === "login" && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {loginNotice && <div style={{ fontSize: 12, color: C.turf }}>{loginNotice}</div>}
            <GoogleButton onClick={startGoogle} disabled={busy} />
            <Divider />
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
            <button
              onClick={() => {
                setLoginError("");
                setResetSent(false);
                setMode("reset");
              }}
              style={{ ...linkButtonStyle, color: "rgba(27,36,34,0.5)" }}
            >
              비밀번호를 잊으셨나요?
            </button>
          </div>
        )}

        {mode === "reset" && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {resetSent ? (
              <div style={{ fontSize: 13, color: C.turf }}>
                {loginEmail.trim()} 로 재설정 링크를 보냈어요. 메일의 링크를 열어 새 비밀번호를 정해 주세요.
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, color: "rgba(27,36,34,0.6)" }}>
                  가입한 이메일을 입력하면 비밀번호를 새로 정할 수 있는 링크를 보내드려요.
                </div>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="이메일"
                  autoCapitalize="off"
                  onKeyDown={(e) => e.key === "Enter" && submitReset()}
                  style={fieldStyle}
                />
                {loginError && <div style={{ fontSize: 12, color: C.danger }}>{loginError}</div>}
                <PrimaryButton onClick={submitReset} disabled={busy || !loginEmail.trim()}>
                  {busy ? "보내는 중..." : "재설정 메일 보내기"}
                </PrimaryButton>
              </>
            )}
            <button
              onClick={() => setMode("login")}
              style={{ ...linkButtonStyle, marginTop: 8, color: "rgba(27,36,34,0.5)" }}
            >
              로그인으로 돌아가기
            </button>
          </div>
        )}

        {mode === "signup" && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <GoogleButton onClick={startGoogle} disabled={busy} />
            <Divider />
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
              placeholder="비밀번호"
              autoComplete="new-password"
              style={fieldStyle}
            />
            <div style={{ fontSize: 11, color: password && signupErrors.password ? C.danger : "rgba(27,36,34,0.5)" }}>
              {(password && signupErrors.password) || PASSWORD_HINT}
            </div>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="비밀번호 확인"
              autoComplete="new-password"
              style={fieldStyle}
            />
            {passwordConfirm && signupErrors.passwordConfirm && (
              <div style={{ fontSize: 11, color: C.danger }}>{signupErrors.passwordConfirm}</div>
            )}
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="연락처 (선택, 관리자에게만 보여요)"
              style={fieldStyle}
            />
            <LevelSlider value={level} onChange={setLevel} />

            {signupError && <div style={{ fontSize: 12, color: C.danger }}>{signupError}</div>}

            <PrimaryButton onClick={submitSignUp} icon={UserPlus} disabled={busy || !signUpValid}>
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
      </SectionCard>
    </div>
  );
}
