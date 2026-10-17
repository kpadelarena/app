import { Fragment, useEffect, useMemo, useState } from "react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionCard } from "@/components/ui/SectionCard";
import type { BookingPatch, NewBooking, Who } from "@/lib/db";
import type { Booking, Member, Venue } from "@/lib/types";
import { C, FONT } from "@/styles/tokens";
import { DAYS_AHEAD, KINDS, kindOf } from "./constants";
import { JoinModal } from "./JoinModal";
import { addHours, hoursBetween, nextDays, type Slot, toInstant, zonedDate, zonedTime } from "./slots";

function CourtHeaderCell({ name }: { name: string }) {
  return (
    <div
      style={{
        textAlign: "center",
        fontFamily: FONT.display,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.08em",
        color: "rgba(27,36,34,0.6)",
        padding: "4px 0",
      }}
    >
      코트 {name}
    </div>
  );
}

function LegendDot({ color, border, label }: { color: string; border: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: 4,
          background: color,
          border: `1px solid ${border}`,
          display: "inline-block",
        }}
      />
      {label}
    </div>
  );
}

interface BookingCellProps {
  booking?: Booking;
  /** The hour has already started; nothing can be booked or changed. */
  past: boolean;
  maxPlayers: number;
  /** Logged-out visitors see that a slot is taken, but not how many are playing. */
  showCount: boolean;
  onClick: () => void;
}

function BookingCell({ booking, past, maxPlayers, showCount, onClick }: BookingCellProps) {
  const count = booking ? booking.participants.length : 0;
  const full = count >= maxPlayers;
  const empty = !booking;
  const kind = booking ? kindOf(booking.kind) : null;

  const bg = empty ? "#fff" : full ? "#3E6FD9" : "#D6E6FB";
  const border = empty ? "rgba(0,0,0,0.15)" : full ? "#3E6FD9" : "#7FA6E0";

  if (past && empty) {
    return <div style={{ height: 56, borderRadius: 10, background: "rgba(0,0,0,0.04)" }} />;
  }
  return (
    <button
      onClick={onClick}
      style={{
        height: 56,
        borderRadius: 10,
        border: `1px solid ${border}`,
        background: bg,
        color: full ? "#fff" : C.charcoal,
        opacity: past ? 0.6 : 1,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        padding: 4,
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700 }}>
        {empty ? "예약 가능" : !showCount ? "예약됨" : full ? "마감" : `${maxPlayers - count}자리 남음`}
      </span>
      {booking && showCount && (
        <span style={{ fontSize: 10, opacity: 0.85, fontFamily: FONT.mono }}>
          {count}/{maxPlayers}
        </span>
      )}
      {kind && (
        <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9, fontWeight: 700 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: kind.color, display: "inline-block" }} />
          {kind.label}
          {booking?.visibility === "private" ? " · 비공개" : ""}
        </span>
      )}
    </button>
  );
}

const legendRowStyle = {
  display: "flex",
  gap: 14,
  flexWrap: "wrap",
  fontSize: 12,
  color: "rgba(27,36,34,0.6)",
} as const;

interface BookingTabProps {
  venue: Venue;
  bookings: Booking[];
  member: Member | null;
  isAdmin: boolean;
  onCreate: (booking: NewBooking) => void;
  onJoin: (bookingId: string, who: Who) => void;
  onLeave: (participantId: string) => void;
  onUpdate: (bookingId: string, patch: BookingPatch) => void;
  onDelete: (bookingId: string) => void;
  /** The day from the URL (YYYY-MM-DD), null for today. */
  date: string | null;
  /** null means today; days outside the window are reported as null too. */
  onSelectDate: (date: string | null) => void;
  /** The booking whose sheet the URL says is open, if any. */
  bookingId: string | null;
  bookingsLoading: boolean;
  /** Puts a booking in (or takes it out of) the URL, always with its day. */
  onOpenBooking: (bookingId: string | null, date: string) => void;
  onOpenAuth: () => void;
}

/* The date picker and the court × hour booking grid for one venue. */
export function BookingTab({
  venue,
  bookings,
  member,
  isAdmin,
  onCreate,
  onJoin,
  onLeave,
  onUpdate,
  onDelete,
  date: requestedDate,
  onSelectDate,
  bookingId,
  bookingsLoading,
  onOpenBooking,
  onOpenAuth,
}: BookingTabProps) {
  const days = useMemo(() => nextDays(DAYS_AHEAD, venue.timezone), [venue.timezone]);
  const hours = useMemo(() => hoursBetween(venue.openTime, venue.closeTime), [venue.openTime, venue.closeTime]);
  const [localSlot, setLocalSlot] = useState<Slot | null>(null);
  const inWindow = !!requestedDate && days.some((d) => d.iso === requestedDate);
  const date = inWindow ? requestedDate : days[0].iso;

  // A stale or malformed day in the URL falls back to today, and the URL follows.
  useEffect(() => {
    if (requestedDate && !inWindow) onSelectDate(null);
  }, [requestedDate, inWindow, onSelectDate]);

  const slotStart = (slot: Slot) => toInstant(slot.date, slot.time, venue.timezone);
  const slotOf = (b: Booking): Slot => ({
    date: zonedDate(new Date(b.startsAt), venue.timezone),
    time: zonedTime(new Date(b.startsAt), venue.timezone),
    courtId: b.courtId,
  });

  // The open sheet: the booking named in the URL, or a cell the user tapped.
  const linked = bookingId ? bookings.find((b) => b.id === bookingId) : undefined;
  const activeSlot = linked ? slotOf(linked) : bookingId ? null : localSlot;
  const missingBooking = !!bookingId && !linked && !bookingsLoading;
  const openSlot = (slot: Slot) => {
    const booked = bookingAt(slot);
    if (booked) onOpenBooking(booked.id, slot.date);
    else setLocalSlot(slot);
  };
  const closeSheet = () => {
    setLocalSlot(null);
    if (bookingId) onOpenBooking(null, date);
  };
  const bookingAt = (slot: Slot) => {
    const at = slotStart(slot).getTime();
    return bookings.find(
      (b) => b.courtId === slot.courtId && Date.parse(b.startsAt) <= at && at < Date.parse(b.endsAt),
    );
  };
  /* Free consecutive hours from the slot until closing time or the next booking. */
  const freeHoursFrom = (slot: Slot) => {
    let n = 0;
    for (let i = hours.indexOf(slot.time); i >= 0 && i < hours.length; i++) {
      if (bookingAt({ ...slot, time: hours[i] })) break;
      n++;
    }
    return n;
  };

  const activeBooking = activeSlot ? bookingAt(activeSlot) : undefined;

  return (
    <>
      {missingBooking && (
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
        <Eyebrow>날짜선택</Eyebrow>
        <div style={{ display: "flex", gap: 8, marginTop: 12, overflowX: "auto", paddingBottom: 4 }}>
          {days.map((d) => (
            <button
              key={d.iso}
              onClick={() => onSelectDate(d.iso === days[0].iso ? null : d.iso)}
              style={{
                flex: "0 0 auto",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                padding: "8px 14px",
                borderRadius: 12,
                border: `1px solid ${date === d.iso ? C.turf : "rgba(0,0,0,0.12)"}`,
                background: date === d.iso ? C.turf : "#fff",
                color: date === d.iso ? "#fff" : C.charcoal,
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>{d.isToday ? "오늘" : d.weekday}</span>
              <span style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 14 }}>{d.label}</span>
            </button>
          ))}
        </div>

        <div style={{ ...legendRowStyle, marginTop: 14 }}>
          <LegendDot color="#fff" border="rgba(0,0,0,0.2)" label="예약 가능" />
          <LegendDot color="#D6E6FB" border="#7FA6E0" label="일부 예약 (참여 가능)" />
          <LegendDot color="#3E6FD9" border="#3E6FD9" label="마감" />
        </div>
        <div style={{ ...legendRowStyle, marginTop: 8 }}>
          {KINDS.map((k) => (
            <LegendDot key={k.key} color={k.color} border={k.color} label={k.label} />
          ))}
        </div>
      </SectionCard>

      <SectionCard>
        {venue.courts.length === 0 ? (
          <div style={{ fontSize: 13, color: "rgba(27,36,34,0.55)" }}>이 지점에는 아직 등록된 코트가 없어요.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `64px repeat(${venue.courts.length}, minmax(96px, 1fr))`,
                gap: 6,
                minWidth: 64 + venue.courts.length * 96,
              }}
            >
              <div />
              {venue.courts.map((c) => (
                <CourtHeaderCell key={c.id} name={c.name} />
              ))}

              {hours.map((time) => (
                <Fragment key={time}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      fontFamily: FONT.mono,
                      fontSize: 12,
                      fontWeight: 700,
                      color: "rgba(27,36,34,0.6)",
                    }}
                  >
                    {time}
                  </div>
                  {venue.courts.map((court) => {
                    const slot = { date, time, courtId: court.id };
                    return (
                      <BookingCell
                        key={court.id}
                        booking={bookingAt(slot)}
                        past={slotStart(slot).getTime() < Date.now()}
                        maxPlayers={venue.maxPlayers}
                        showCount={!!member}
                        onClick={() => openSlot(slot)}
                      />
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {activeSlot && (
        <JoinModal
          venue={venue}
          slot={activeSlot}
          booking={activeBooking}
          member={member}
          isAdmin={isAdmin}
          freeHours={freeHoursFrom(activeSlot)}
          onCreate={(hoursToBook, kind, visibility) => {
            const startsAt = slotStart(activeSlot);
            onCreate({
              courtId: activeSlot.courtId,
              startsAt,
              endsAt: addHours(startsAt, hoursToBook),
              kind,
              visibility,
            });
          }}
          onJoin={(who) => activeBooking && onJoin(activeBooking.id, who)}
          onLeave={onLeave}
          onUpdate={(patch) => {
            if (!activeBooking) return;
            onUpdate(activeBooking.id, patch);
            // A moved booking no longer belongs to the open cell.
            if (patch.startsAt) closeSheet();
          }}
          onDelete={() => {
            if (activeBooking) {
              onDelete(activeBooking.id);
              closeSheet();
            }
          }}
          onOpenAuth={onOpenAuth}
          onClose={closeSheet}
        />
      )}
    </>
  );
}
