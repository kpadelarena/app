import { useQuery } from "@tanstack/react-query";
import type { CSSProperties } from "react";
import { EmptyHint } from "@/components/ui/EmptyHint";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { changesOpen, kindOf } from "@/features/booking/constants";
import { zonedDate } from "@/features/booking/slots";
import { getMyBookings } from "@/lib/db";
import { queryKeys } from "@/lib/queryKeys";
import type { Member } from "@/lib/types";
import { C } from "@/styles/tokens";

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 12px",
  borderRadius: 10,
  background: C.paperDim,
};

/* "19:00–21:00" in the viewer's own timezone. */
const timeRange = (startsAt: string, endsAt: string) => {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${fmt(startsAt)}–${fmt(endsAt)}`;
};

interface MyScheduleTabProps {
  member: Member | null;
  isAdmin: boolean;
  onLeave: (participantId: string) => void;
  onOpenAuth: () => void;
}

/* The signed-in member's upcoming court bookings at any venue. */
export function MyScheduleTab({ member, isAdmin, onLeave, onOpenAuth }: MyScheduleTabProps) {
  const { data: bookings } = useQuery({
    queryKey: queryKeys.myBookings.forMember(member?.id ?? ""),
    queryFn: () => getMyBookings(member!.id, new Date()),
    enabled: !!member,
  });

  if (!member) {
    return (
      <SectionCard>
        <Eyebrow>내 일정</Eyebrow>
        <EmptyHint text="회원가입 또는 로그인을 하면 내가 예약한 코트를 모아볼 수 있어요." />
        <div style={{ marginTop: 12 }}>
          <PrimaryButton onClick={onOpenAuth}>회원가입 · 로그인</PrimaryButton>
        </div>
      </SectionCard>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionCard>
        <Eyebrow>내 코트 예약</Eyebrow>
        {!bookings ? null : bookings.length === 0 ? (
          <EmptyHint text="예약한 코트가 없어요. 코트 예약 탭에서 참여해 보세요." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {bookings.map((b) => (
              <div key={b.id} style={rowStyle}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {zonedDate(new Date(b.startsAt), Intl.DateTimeFormat().resolvedOptions().timeZone)} ·{" "}
                    {timeRange(b.startsAt, b.endsAt)}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(27,36,34,0.55)" }}>
                    {b.venueName} · 코트 {b.courtName}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: kindOf(b.kind).color,
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {kindOf(b.kind).label}
                  </span>
                  {(isAdmin || changesOpen(b.startsAt)) && (
                    <button
                      onClick={() => onLeave(b.participantId)}
                      style={{
                        background: "none",
                        border: "1px solid rgba(0,0,0,0.15)",
                        borderRadius: 999,
                        padding: "4px 10px",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "rgba(27,36,34,0.6)",
                        cursor: "pointer",
                      }}
                    >
                      취소
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard>
        <Eyebrow>내 경기 일정</Eyebrow>
        <EmptyHint text="리그 경기 일정은 다음 업데이트에서 돌아와요." />
      </SectionCard>
    </div>
  );
}
