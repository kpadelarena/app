import { UserCircle } from "lucide-react";
import type { Member } from "@/lib/types";
import { C, FONT } from "@/styles/tokens";

interface AccountButtonProps {
  member: Member | null;
  onClick: () => void;
  /** Colours for the dark header (default) or a light page. */
  dark?: boolean;
  /** On the account page the button reads like the active tab. */
  active?: boolean;
}

/* The signed-in member's chip, or the sign-up / log-in call to action. */
export function AccountButton({ member, onClick, dark = true, active = false }: AccountButtonProps) {
  const accent = dark ? C.ball : C.turf;
  const text = active ? accent : dark ? "#fff" : C.charcoal;
  const line = active ? accent : dark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.15)";

  if (!member) {
    return (
      <button
        onClick={onClick}
        style={{
          padding: "7px 14px",
          borderRadius: 999,
          border: `1px solid ${accent}`,
          background: active ? (dark ? "rgba(215,241,59,0.12)" : "rgba(15,61,62,0.08)") : "transparent",
          color: accent,
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        회원가입 · 로그인
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 10px 5px 5px",
        borderRadius: 999,
        border: `1px solid ${line}`,
        background: "transparent",
        cursor: "pointer",
      }}
    >
      {member.photo ? (
        <img
          src={member.photo}
          alt={member.name}
          style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }}
        />
      ) : (
        <UserCircle size={22} color={dark ? "rgba(255,255,255,0.7)" : "rgba(27,36,34,0.6)"} />
      )}
      <span style={{ fontSize: 13, fontWeight: 600, color: text }}>{member.name}</span>
      <span style={{ fontFamily: FONT.mono, fontSize: 11, fontWeight: 700, color: accent }}>
        Lv.{member.level.toFixed(1)}
      </span>
    </button>
  );
}
