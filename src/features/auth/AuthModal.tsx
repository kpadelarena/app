import { useState } from "react";
import { LogOut, UserCircle, UserPlus } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { fieldStyle } from "@/components/ui/fieldStyle";
import { PhotoInput } from "@/components/ui/PhotoInput";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import type { Member } from "@/lib/types";
import { C } from "@/styles/tokens";
import { REGIONS } from "./constants";
import { LevelSlider } from "./LevelSlider";

export interface SignUpForm {
  name: string;
  username: string;
  password: string;
  phone: string;
  email: string;
  gender: string;
  region: string;
  level: number;
  /** A pasted image URL; a picked file is uploaded separately once the account exists. */
  photo: string | null;
}

interface AuthModalProps {
  currentMember: Member | null;
  onLoginWithPassword: (username: string, password: string) => Promise<{ error?: string }>;
  onLogout: () => void;
  onSignUp: (form: SignUpForm) => Promise<{ error?: string }>;
  onUploadProfilePhoto: (file: File) => void | Promise<void>;
  onSetProfilePhotoUrl: (url: string) => void;
  onUpdateLevel: (level: number) => void;
  profileUploading: boolean;
  onClose: () => void;
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

export function AuthModal({
  currentMember,
  onLoginWithPassword,
  onLogout,
  onSignUp,
  onUploadProfilePhoto,
  onSetProfilePhotoUrl,
  onUpdateLevel,
  profileUploading,
  onClose,
}: AuthModalProps) {
  const [mode, setMode] = useState<"profile" | "login" | "signup">(currentMember ? "profile" : "login");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [region, setRegion] = useState("");
  const [level, setLevel] = useState(3.0);
  const [signupPhoto, setSignupPhoto] = useState<string | null>(null); // preview: object URL or pasted URL
  const [signupPhotoFile, setSignupPhotoFile] = useState<File | null>(null); // raw File, uploaded after account exists
  const [signupError, setSignupError] = useState("");

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  const submitSignUp = async () => {
    const trimmed = name.trim();
    const trimmedUsername = username.trim();
    setSignupError("");
    if (!trimmed) return;
    if (!trimmedUsername) {
      setSignupError("아이디를 입력해 주세요.");
      return;
    }
    if (password.length < 4) {
      setSignupError("비밀번호는 4자 이상으로 입력해 주세요.");
      return;
    }
    if (password !== passwordConfirm) {
      setSignupError("비밀번호가 일치하지 않아요.");
      return;
    }
    const result = await onSignUp({
      name: trimmed,
      username: trimmedUsername,
      password,
      phone,
      email,
      gender,
      region,
      level,
      // A pasted URL can be saved immediately; a picked file needs a
      // real account to exist first, so it's uploaded just below instead.
      photo: signupPhotoFile ? null : signupPhoto,
    });
    if (result && result.error === "duplicate_username") {
      setSignupError("이미 사용 중인 아이디예요.");
      return;
    }
    if (result && result.error) {
      setSignupError("가입에 실패했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    if (signupPhotoFile) {
      await onUploadProfilePhoto(signupPhotoFile);
    }
    setMode("profile");
  };

  const submitLogin = async () => {
    setLoginError("");
    if (!loginUsername.trim() || !loginPassword) {
      setLoginError("아이디와 비밀번호를 입력해 주세요.");
      return;
    }
    setLoginBusy(true);
    const result = await onLoginWithPassword(loginUsername, loginPassword);
    setLoginBusy(false);
    if (result && result.error) {
      setLoginError("아이디 또는 비밀번호가 올바르지 않아요.");
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
      {mode === "profile" && currentMember && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Avatar photo={currentMember.photo} alt={currentMember.name} size={64} />
            <div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{currentMember.name}</div>
              <div style={{ fontSize: 12, color: "rgba(27,36,34,0.5)" }}>
                Lv.{currentMember.level.toFixed(1)}
                {currentMember.phone ? ` · ${currentMember.phone}` : ""}
                {currentMember.email ? ` · ${currentMember.email}` : ""}
              </div>
            </div>
          </div>

          <PhotoInput
            label={currentMember.photo ? "프로필 사진 교체" : "프로필 사진 추가"}
            uploading={profileUploading}
            onFile={onUploadProfilePhoto}
            onSetUrl={onSetProfilePhotoUrl}
          />

          <LevelSlider value={currentMember.level} onChange={onUpdateLevel} />

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <PrimaryButton onClick={onLogout} icon={LogOut} style={{ background: C.danger, color: "#fff" }}>
              로그아웃
            </PrimaryButton>
          </div>
        </div>
      )}

      {mode === "login" && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            value={loginUsername}
            onChange={(e) => setLoginUsername(e.target.value)}
            placeholder="아이디"
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
          <PrimaryButton onClick={submitLogin} disabled={loginBusy}>
            {loginBusy ? "확인 중..." : "로그인"}
          </PrimaryButton>
          <button
            onClick={() => setMode("signup")}
            style={{
              marginTop: 8,
              background: "none",
              border: "none",
              color: C.turf,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            + 새 회원가입
          </button>
        </div>
      )}

      {mode === "signup" && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar photo={signupPhoto} alt="" size={56} />
            <PhotoInput
              label="프로필 사진"
              uploading={false}
              onFile={(file) => {
                setSignupPhotoFile(file);
                setSignupPhoto(URL.createObjectURL(file));
              }}
              onSetUrl={(url) => {
                setSignupPhotoFile(null);
                setSignupPhoto(url);
              }}
            />
          </div>

          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" style={fieldStyle} />
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="아이디"
            autoCapitalize="off"
            style={fieldStyle}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 (4자 이상)"
            style={fieldStyle}
          />
          <input
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            placeholder="비밀번호 확인"
            style={fieldStyle}
          />
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            style={{ ...fieldStyle, color: region ? C.charcoal : "rgba(27,36,34,0.4)" }}
          >
            <option value="">지역 선택 (선택)</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { key: "male", label: "Male" },
              { key: "female", label: "Female" },
            ].map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => setGender(g.key)}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  borderRadius: 10,
                  border: `1px solid ${gender === g.key ? C.turf : "rgba(0,0,0,0.15)"}`,
                  background: gender === g.key ? C.turf : "transparent",
                  color: gender === g.key ? "#fff" : C.charcoal,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {g.label}
              </button>
            ))}
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 (선택)"
            style={fieldStyle}
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="연락처 (선택)"
            style={fieldStyle}
          />
          <LevelSlider value={level} onChange={setLevel} />

          {signupError && <div style={{ fontSize: 12, color: C.danger }}>{signupError}</div>}

          <PrimaryButton
            onClick={submitSignUp}
            icon={UserPlus}
            disabled={!name.trim() || !username.trim() || password.length < 4}
          >
            가입하기
          </PrimaryButton>
          <button
            onClick={() => setMode("login")}
            style={{ background: "none", border: "none", color: "rgba(27,36,34,0.5)", fontSize: 13, cursor: "pointer" }}
          >
            이미 계정이 있어요
          </button>
        </div>
      )}
    </BottomSheet>
  );
}
