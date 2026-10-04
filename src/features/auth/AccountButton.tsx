import { UserCircle } from "lucide-react";
import type { Member } from "@/lib/types";
import { C, FONT } from "@/styles/tokens";

/* Header button: the signed-in member's chip, or the sign-up / log-in call to action. */
export function AccountButton({ member, onClick }: { member: Member | null; onClick: () => void }) {
  if (!member) {
    return (
      <button
        onClick={onClick}
        style={{
          padding: "7px 14px",
          borderRadius: 999,
          border: `1px solid ${C.ball}`,
          background: "transparent",
          color: C.ball,
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
        border: "1px solid rgba(255,255,255,0.25)",
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
        <UserCircle size={22} color="rgba(255,255,255,0.7)" />
      )}
      <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{member.name}</span>
      <span style={{ fontFamily: FONT.mono, fontSize: 11, fontWeight: 700, color: C.ball }}>
        Lv.{member.level.toFixed(1)}
      </span>
    </button>
  );
}
