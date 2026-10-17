import { useQuery } from "@tanstack/react-query";
import type { CSSProperties } from "react";
import { ChevronRight } from "lucide-react";
import { EmptyHint } from "@/components/ui/EmptyHint";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { changesOpen, kindOf } from "@/features/booking/constants";
import { JoinModal } from "@/features/booking/JoinModal";
import { zonedDate, zonedTime } from "@/features/booking/slots";
import { getBooking, getMyBookings, getMyMatches, type BookingPatch, type Who } from "@/lib/db";
import { queryKeys } from "@/lib/queryKeys";
import type { Member, MyBooking, MyMatch } from "@/lib/types";
import { C, FONT } from "@/styles/tokens";
import { formatEventDate, todayDate } from "./eventDate";

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
  onJoin: (bookingId: string, who: Who) => void;
  onUpdate: (bookingId: string, patch: BookingPatch) => void;
  onDelete: (bookingId: string) => void;
  /** The booking whose sheet is open over this page (from the URL). */
  bookingId: string | null;
  onOpenBooking: (booking: MyBooking) => void;
  onCloseBooking: () => void;
  /** Opens the league event's schedule. */
  onOpenMatch: (match: MyMatch) => void;
  onOpenAuth: () => void;
}

/* The clickable part of a row: looks like text, opens the item. */
const openStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flex: 1,
  minWidth: 0,
  background: "none",
  border: "none",
  padding: 0,
  textAlign: "left",
  font: "inherit",
  color: "inherit",
  cursor: "pointer",
};

/* The signed-in member's upcoming court bookings at any venue. */
export function MyScheduleTab({
  member,
  isAdmin,
  onLeave,
  onJoin,
  onUpdate,
  onDelete,
  bookingId,
  onOpenBooking,
  onCloseBooking,
  onOpenMatch,
  onOpenAuth,
}: MyScheduleTabProps) {
  const { data: bookings } = useQuery({
    queryKey: queryKeys.myBookings.forMember(member?.id ?? ""),
    queryFn: () => getMyBookings(member!.id, new Date()),
    enabled: !!member,
  });

  // The booking sheet named in the URL, shown over the page (also for visitors, via a shared link).
  const detail = useQuery({
    queryKey: queryKeys.booking.detail(bookingId ?? ""),
    queryFn: () => getBooking(bookingId!),
    enabled: !!bookingId,
  });
  const open = detail.data ?? null;
  const sheet = open && (
    <JoinModal
      venue={open.venue}
      slot={{
        date: zonedDate(new Date(open.booking.startsAt), open.venue.timezone),
        time: zonedTime(new Date(open.booking.startsAt), open.venue.timezone),
        courtId: open.booking.courtId,
      }}
      booking={open.booking}
      member={member}
      isAdmin={isAdmin}
      freeHours={1}
      onCreate={() => {}}
      onJoin={(who) => onJoin(open.booking.id, who)}
      onLeave={onLeave}
      onUpdate={(patch) => onUpdate(open.booking.id, patch)}
      onDelete={() => {
        onDelete(open.booking.id);
        onCloseBooking();
      }}
      onOpenAuth={onOpenAuth}
      onClose={onCloseBooking}
    />
  );
  const missing = !!bookingId && !detail.isPending && !open;
  const { data: matches } = useQuery({
    queryKey: queryKeys.myMatches.forMember(member?.id ?? ""),
    queryFn: () => getMyMatches(member!.id, todayDate()),
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
        {sheet}
      </SectionCard>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {missing && (
        <div
          style={{
            fontSize: 12,
            color: C.danger,
            background: "rgba(194,84,80,0.08)",
            border: `1px solid ${C.danger}`,
            borderRadius: 10,
            padding: "8px 12px",
          }}
        >
          링크의 예약을 찾을 수 없어요. 취소됐거나 지난 예약이에요.
        </div>
      )}
      <SectionCard>
        <Eyebrow>내 코트 예약</Eyebrow>
        {!bookings ? null : bookings.length === 0 ? (
          <EmptyHint text="예약한 코트가 없어요. 코트 예약 탭에서 참여해 보세요." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {bookings.map((b) => (
              <div key={b.id} style={rowStyle}>
                <button onClick={() => onOpenBooking(b)} style={openStyle} aria-label="예약 보기">
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {zonedDate(new Date(b.startsAt), Intl.DateTimeFormat().resolvedOptions().timeZone)} ·{" "}
                      {timeRange(b.startsAt, b.endsAt)}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(27,36,34,0.55)" }}>
                      {b.venueName} · 코트 {b.courtName}
                    </div>
                  </div>
                  <ChevronRight size={16} color="rgba(27,36,34,0.4)" />
                </button>
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
        <Eyebrow>내 리그 경기</Eyebrow>
        {!matches ? null : matches.length === 0 ? (
          <EmptyHint text="예정된 리그 경기가 없어요. 대진표가 만들어지면 여기에 표시돼요." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {matches.map((m) => (
              <div key={m.id} style={rowStyle}>
                <button onClick={() => onOpenMatch(m)} style={openStyle} aria-label="경기 보기">
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {formatEventDate(m.eventDate)} · {m.leagueName}
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(27,36,34,0.55)" }}>
                      {m.venueName} · {m.roundNumber}라운드 · 코트 {m.court} · vs {m.opponents.join(", ")}
                    </div>
                  </div>
                  <ChevronRight size={16} color="rgba(27,36,34,0.4)" />
                </button>
                {m.scoreA !== "" && m.scoreB !== "" && (
                  <span style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 15 }}>
                    {m.scoreA}:{m.scoreB}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
      {sheet}
    </div>
  );
}
