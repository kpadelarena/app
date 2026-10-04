import { useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { fieldStyle } from "@/components/ui/fieldStyle";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import type { Booking, BookingCategory, Participant, Player } from "@/lib/types";
import { C, FONT } from "@/styles/tokens";
import { BOOKING_SLOTS_PER_MATCH, CATEGORIES, categoryOf } from "./constants";
import { TIME_SLOTS, type Slot } from "./slots";

interface JoinModalProps {
  slot: Slot;
  /** The booking already in this slot, if any. */
  booking?: Booking;
  players: Player[];
  availableDurations: number[];
  onJoin: (category: BookingCategory, duration: number, participant: Participant) => void;
  onRemove: (participantId: string) => void;
  onClose: () => void;
}

/* Opened from a grid cell: book the slot, or join / leave the booking in it. */
export function JoinModal({ slot, booking, players, availableDurations, onJoin, onRemove, onClose }: JoinModalProps) {
  const [joinPlayerId, setJoinPlayerId] = useState(players[0]?.id || "");
  const [guestName, setGuestName] = useState("");
  const [category, setCategory] = useState(booking ? booking.category : CATEGORIES[0].key);
  const [duration, setDuration] = useState(1);

  const count = booking ? booking.players.length : 0;
  const full = count >= BOOKING_SLOTS_PER_MATCH;
  const isNewBooking = !booking;
  const endTime = TIME_SLOTS[Math.min(TIME_SLOTS.indexOf(slot.time) + duration, TIME_SLOTS.length - 1)] || slot.time;

  const join = () => {
    const chosenPlayer = players.find((p) => p.id === joinPlayerId);
    const typedName = guestName.trim();
    const name = typedName || chosenPlayer?.name;
    if (!name) return;
    // Only accounts join by profile id; a typed name or a name-only club
    // player joins as a guest.
    const asGuest = !!typedName || !!chosenPlayer?.isGuest;
    onJoin(category, duration, { profileId: asGuest ? null : chosenPlayer?.id, name });
    setGuestName("");
    setJoinPlayerId(players[0]?.id || "");
  };

  return (
    <BottomSheet
      header={
        <div>
          <Eyebrow>
            {slot.date} · {slot.time}
            {isNewBooking && duration > 1 ? ` – ${endTime}` : ""}
          </Eyebrow>
          <div style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700, marginTop: 4 }}>코트 {slot.court}</div>
        </div>
      }
      onClose={onClose}
    >
      {isNewBooking && (
        <div style={{ marginTop: 14 }}>
          <Eyebrow>예약 시간</Eyebrow>
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            {[1, 2, 3].map((d) => {
              const disabled = !availableDurations.includes(d);
              const active = duration === d;
              return (
                <button
                  key={d}
                  disabled={disabled}
                  onClick={() => setDuration(d)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: `1px solid ${active ? C.turf : "rgba(0,0,0,0.15)"}`,
                    background: active ? C.turf : disabled ? "#F1F1EC" : "transparent",
                    color: active ? "#fff" : disabled ? "rgba(0,0,0,0.3)" : C.charcoal,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: disabled ? "not-allowed" : "pointer",
                  }}
                >
                  {d}시간
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        {booking ? (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 12px",
              borderRadius: 999,
              background: categoryOf(booking.category).color,
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {categoryOf(booking.category).label}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: `1px solid ${category === c.key ? c.color : "rgba(0,0,0,0.15)"}`,
                  background: category === c.key ? c.color : "transparent",
                  color: category === c.key ? "#fff" : C.charcoal,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {Array.from({ length: BOOKING_SLOTS_PER_MATCH }, (_, i) => {
          const p = booking?.players[i];
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: 10,
                background: p ? C.paperDim : "transparent",
                border: p ? "none" : "1px dashed rgba(0,0,0,0.2)",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: p ? 700 : 500, color: p ? C.charcoal : "rgba(27,36,34,0.4)" }}>
                {p ? p.name : `빈 자리 ${i + 1}`}
              </span>
              {p && (
                <button
                  onClick={() => onRemove(p.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(27,36,34,0.4)" }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {!full && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          <Eyebrow>참여하기</Eyebrow>
          {players.length > 0 && (
            <select
              value={joinPlayerId}
              onChange={(e) => {
                setJoinPlayerId(e.target.value);
                setGuestName("");
              }}
              style={fieldStyle}
            >
              <option value="">등록된 선수 선택</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <input
            value={guestName}
            onChange={(e) => {
              setGuestName(e.target.value);
              setJoinPlayerId("");
            }}
            placeholder="또는 이름 직접 입력 (게스트)"
            style={fieldStyle}
          />
          <PrimaryButton onClick={join} icon={UserPlus}>
            {isNewBooking ? "예약하기" : "이 시간에 참여"}
          </PrimaryButton>
        </div>
      )}
    </BottomSheet>
  );
}
