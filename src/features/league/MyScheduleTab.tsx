import type { CSSProperties } from "react";
import { EmptyHint } from "@/components/ui/EmptyHint";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { categoryOf } from "@/features/booking/constants";
import type { League, Member } from "@/lib/types";
import { C, FONT } from "@/styles/tokens";
import { nameOf } from "./names";
import { matchScore } from "./score";

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 12px",
  borderRadius: 10,
  background: C.paperDim,
};

const listStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 8, marginTop: 12 };

interface MyScheduleTabProps {
  league: Pick<League, "venue" | "bookings" | "rounds" | "players" | "teams">;
  currentMember: Member | null;
  onOpenAuth: () => void;
}

/* The signed-in member's court bookings and league matches. */
export function MyScheduleTab({ league, currentMember, onOpenAuth }: MyScheduleTabProps) {
  if (!currentMember) {
    return (
      <SectionCard>
        <Eyebrow>내 일정</Eyebrow>
        <EmptyHint text="회원가입 또는 로그인을 하면 내가 예약한 코트와 경기 일정을 모아볼 수 있어요." />
        <div style={{ marginTop: 12 }}>
          <PrimaryButton onClick={onOpenAuth}>회원가입 · 로그인</PrimaryButton>
        </div>
      </SectionCard>
    );
  }

  const myBookings = league.bookings
    .filter((b) => b.players.some((p) => p.id === currentMember.id || p.name === currentMember.name))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  // A side holds player ids (Americano / Mexicano) or a single team id (round-robin).
  const isMine = (side: string[]) =>
    side.includes(currentMember.id) ||
    league.teams.some((t) => t.id === side[0] && t.playerIds.includes(currentMember.id));

  const myMatches = league.rounds.flatMap((round) =>
    round.matches.flatMap((m) => {
      const onSideA = isMine(m.sideA);
      if (!onSideA && !isMine(m.sideB)) return [];
      return [{ ...m, roundNumber: round.roundNumber, opponents: onSideA ? m.sideB : m.sideA }];
    }),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionCard>
        <Eyebrow>내 코트 예약</Eyebrow>
        {myBookings.length === 0 ? (
          <EmptyHint text="예약한 코트가 없어요. 코트 예약 탭에서 참여해 보세요." />
        ) : (
          <div style={listStyle}>
            {myBookings.map((b) => (
              <div key={b.id} style={rowStyle}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {b.date} · {b.time}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(27,36,34,0.55)" }}>
                    {league.venue} · 코트 {b.court}
                  </div>
                </div>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: categoryOf(b.category).color,
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {categoryOf(b.category).label}
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard>
        <Eyebrow>내 경기 일정</Eyebrow>
        {myMatches.length === 0 ? (
          <EmptyHint text="예정된 리그 경기가 없어요. 대진표를 생성하면 여기에 표시돼요." />
        ) : (
          <div style={listStyle}>
            {myMatches.map((m) => {
              const played = !!matchScore(m);
              return (
                <div key={m.id} style={rowStyle}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      ROUND {m.roundNumber} · 코트 {m.court}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(27,36,34,0.55)" }}>
                      vs {m.opponents.map((id) => nameOf(league, id)).join(" & ")}
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: FONT.mono,
                      fontWeight: 700,
                      fontSize: 14,
                      color: played ? C.turf : "rgba(27,36,34,0.35)",
                    }}
                  >
                    {played ? `${m.scoreA} : ${m.scoreB}` : "예정"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
