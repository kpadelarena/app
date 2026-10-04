import { Fragment, useMemo, useState } from "react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionCard } from "@/components/ui/SectionCard";
import type { Booking, BookingCategory, Participant, Player } from "@/lib/types";
import { C, FONT } from "@/styles/tokens";
import { BOOKING_SLOTS_PER_MATCH, CATEGORIES, categoryOf } from "./constants";
import { JoinModal } from "./JoinModal";
import { TIME_SLOTS, nextDays, type Slot } from "./slots";

export interface JoinRequest extends Slot {
  category: BookingCategory;
  /** Hours to book; only used when the slot has no booking yet. */
  duration: number;
  existing?: Booking;
}

function CourtHeaderCell({ court }: { court: number }) {
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
      코트 {court}
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

function BookingCell({ booking, onClick }: { booking?: Booking; onClick: () => void }) {
  const count = booking ? booking.players.length : 0;
  const full = count >= BOOKING_SLOTS_PER_MATCH;
  const empty = count === 0;
  const cat = booking ? categoryOf(booking.category) : null;

  const bg = empty ? "#fff" : full ? "#3E6FD9" : "#D6E6FB";
  const border = empty ? "rgba(0,0,0,0.15)" : full ? "#3E6FD9" : "#7FA6E0";
  const textColor = full ? "#fff" : C.charcoal;

  return (
    <button
      onClick={onClick}
      style={{
        height: 56,
        borderRadius: 10,
        border: `1px solid ${border}`,
        background: bg,
        color: textColor,
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
        {empty ? "예약 가능" : full ? "마감" : `${BOOKING_SLOTS_PER_MATCH - count}자리 남음`}
      </span>
      {!empty && (
        <span style={{ fontSize: 10, opacity: 0.85, fontFamily: FONT.mono }}>
          {count}/{BOOKING_SLOTS_PER_MATCH}
        </span>
      )}
      {cat && (
        <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9, fontWeight: 700 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: cat.color, display: "inline-block" }} />
          {cat.label}
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
  bookings: Booking[];
  players: Player[];
  courtCount: number;
  onJoinSlot: (request: JoinRequest, participant: Participant) => void;
  onRemoveParticipant: (booking: Booking, participantId: string) => void;
}

/* The date picker and the court × hour booking grid. */
export function BookingTab({ bookings, players, courtCount, onJoinSlot, onRemoveParticipant }: BookingTabProps) {
  const days = useMemo(() => nextDays(7), []);
  const [selectedDate, setSelectedDate] = useState(days[0].iso);
  const [activeSlot, setActiveSlot] = useState<Slot | null>(null);

  const findBooking = ({ date, time, court }: Slot) =>
    bookings.find((b) => b.date === date && b.time === time && b.court === court);

  /* How many consecutive hours (up to 3) can be booked starting at `slot`. */
  const availableDurations = (slot: Slot) => {
    const startIdx = TIME_SLOTS.indexOf(slot.time);
    const out: number[] = [];
    for (let hours = 1; hours <= 3; hours++) {
      const lastHour = TIME_SLOTS[startIdx + hours - 1];
      if (!lastHour || findBooking({ ...slot, time: lastHour })) break;
      out.push(hours);
    }
    return out.length ? out : [1];
  };

  const courts = Array.from({ length: courtCount }, (_, i) => i + 1);
  const activeBooking = activeSlot ? findBooking(activeSlot) : undefined;

  return (
    <>
      <SectionCard>
        <Eyebrow color={C.charcoal}>날짜선택</Eyebrow>
        <div style={{ display: "flex", gap: 8, marginTop: 12, overflowX: "auto", paddingBottom: 4 }}>
          {days.map((d) => (
            <button
              key={d.iso}
              onClick={() => setSelectedDate(d.iso)}
              style={{
                flex: "0 0 auto",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                padding: "8px 14px",
                borderRadius: 12,
                border: `1px solid ${selectedDate === d.iso ? C.turf : "rgba(0,0,0,0.12)"}`,
                background: selectedDate === d.iso ? C.turf : "#fff",
                color: selectedDate === d.iso ? "#fff" : C.charcoal,
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
          {CATEGORIES.map((c) => (
            <LegendDot key={c.key} color={c.color} border={c.color} label={c.label} />
          ))}
        </div>
      </SectionCard>

      <SectionCard>
        <div style={{ overflowX: "auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `64px repeat(${courts.length}, minmax(96px, 1fr))`,
              gap: 6,
              minWidth: 64 + courts.length * 96,
            }}
          >
            <div />
            {courts.map((c) => (
              <CourtHeaderCell key={c} court={c} />
            ))}

            {TIME_SLOTS.map((time) => (
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
                {courts.map((court) => {
                  const slot = { date: selectedDate, time, court };
                  return <BookingCell key={court} booking={findBooking(slot)} onClick={() => setActiveSlot(slot)} />;
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </SectionCard>

      {activeSlot && (
        <JoinModal
          slot={activeSlot}
          booking={activeBooking}
          players={players}
          availableDurations={availableDurations(activeSlot)}
          onJoin={(category, duration, participant) =>
            onJoinSlot({ ...activeSlot, category, duration, existing: activeBooking }, participant)
          }
          onRemove={(participantId) => activeBooking && onRemoveParticipant(activeBooking, participantId)}
          onClose={() => setActiveSlot(null)}
        />
      )}
    </>
  );
}
