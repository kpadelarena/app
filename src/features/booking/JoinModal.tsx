import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { fieldStyle } from "@/components/ui/fieldStyle";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { getMembers, type BookingPatch, type Who } from "@/lib/db";
import { queryKeys } from "@/lib/queryKeys";
import type { Booking, BookingKind, Member, Participant, Venue, Visibility } from "@/lib/types";
import { C, FONT } from "@/styles/tokens";
import { CHANGE_CUTOFF_HOURS, KINDS, changesOpen, kindOf } from "./constants";
import { addHours, hoursBetween, toInstant, zonedDate, zonedTime, type Slot } from "./slots";

const VISIBILITIES: { key: Visibility; label: string; hint: string }[] = [
  { key: "public", label: "공개", hint: "누구나 참여할 수 있어요" },
  { key: "private", label: "비공개", hint: "참여자가 초대한 사람만" },
];

const chipStyle = (active: boolean, color: string) =>
  ({
    padding: "6px 12px",
    borderRadius: 999,
    border: `1px solid ${active ? color : "rgba(0,0,0,0.15)"}`,
    background: active ? color : "transparent",
    color: active ? "#fff" : C.charcoal,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  }) as const;

interface JoinModalProps {
  venue: Venue;
  slot: Slot;
  /** The booking already covering this slot, if any. */
  booking?: Booking;
  member: Member | null;
  isAdmin: boolean;
  /** Free consecutive hours starting at the slot, for a new booking. */
  freeHours: number;
  onCreate: (hours: number, kind: BookingKind, visibility: Visibility) => void;
  onJoin: (who: Who) => void;
  onLeave: (participantId: string) => void;
  /** Admins only: change the booking itself. */
  onUpdate: (patch: BookingPatch) => void;
  onDelete: () => void;
  onOpenAuth: () => void;
  onClose: () => void;
}

/* Admin-only controls for an existing booking: kind, visibility, time, delete. */
function AdminControls({
  venue,
  booking,
  onUpdate,
  onDelete,
}: {
  venue: Venue;
  booking: Booking;
  onUpdate: (patch: BookingPatch) => void;
  onDelete: () => void;
}) {
  const date = zonedDate(new Date(booking.startsAt), venue.timezone);
  const currentStart = zonedTime(new Date(booking.startsAt), venue.timezone);
  const currentHours = Math.round((Date.parse(booking.endsAt) - Date.parse(booking.startsAt)) / 3_600_000);
  const [start, setStart] = useState(currentStart);
  const [hours, setHours] = useState(currentHours);
  const hourOptions = hoursBetween(venue.openTime, venue.closeTime);
  const maxHours = Math.max(1, hourOptions.length - hourOptions.indexOf(start));
  const timeChanged = start !== currentStart || hours !== currentHours;

  const saveTime = () => {
    const startsAt = toInstant(date, start, venue.timezone);
    onUpdate({ startsAt, endsAt: addHours(startsAt, hours) });
  };

  return (
    <div
      style={{
        marginTop: 20,
        paddingTop: 14,
        borderTop: "1px dashed rgba(0,0,0,0.15)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <Eyebrow color={C.charcoal}>관리자</Eyebrow>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {KINDS.map((k) => (
          <button
            key={k.key}
            onClick={() => k.key !== booking.kind && onUpdate({ kind: k.key })}
            style={chipStyle(booking.kind === k.key, k.color)}
          >
            {k.label}
          </button>
        ))}
        <span style={{ width: 8 }} />
        {VISIBILITIES.map((v) => (
          <button
            key={v.key}
            onClick={() => v.key !== booking.visibility && onUpdate({ visibility: v.key })}
            title={v.hint}
            style={chipStyle(booking.visibility === v.key, C.turf)}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <select value={start} onChange={(e) => setStart(e.target.value)} style={{ ...fieldStyle, padding: "8px 10px" }}>
          {hourOptions.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <select
          value={Math.min(hours, maxHours)}
          onChange={(e) => setHours(Number(e.target.value))}
          style={{ ...fieldStyle, padding: "8px 10px" }}
        >
          {Array.from({ length: maxHours }, (_, i) => i + 1).map((h) => (
            <option key={h} value={h}>
              {h}시간
            </option>
          ))}
        </select>
        <PrimaryButton onClick={saveTime} disabled={!timeChanged} style={{ padding: "8px 14px" }}>
          시간 변경
        </PrimaryButton>
      </div>

      <div>
        <button
          onClick={() => window.confirm("이 예약을 삭제할까요? 참여자 모두에게서 사라져요.") && onDelete()}
          style={{
            background: "none",
            border: `1px solid ${C.danger}`,
            color: C.danger,
            borderRadius: 10,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          예약 삭제
        </button>
      </div>
    </div>
  );
}

/* Opened from a grid cell: book the slot, or join / leave the booking in it. */
export function JoinModal({
  venue,
  slot,
  booking,
  member,
  isAdmin,
  freeHours,
  onCreate,
  onJoin,
  onLeave,
  onUpdate,
  onDelete,
  onOpenAuth,
  onClose,
}: JoinModalProps) {
  const [hours, setHours] = useState(1);
  const [kind, setKind] = useState<BookingKind>("match");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [addMemberId, setAddMemberId] = useState("");
  const [guestName, setGuestName] = useState("");

  const court = venue.courts.find((c) => c.id === slot.courtId);
  const count = booking ? booking.participants.length : 0;
  const full = count >= venue.maxPlayers;
  const amParticipant = !!member && !!booking?.participants.some((p) => p.profileId === member.id);
  // Members may change a booking until the cutoff; admins always may.
  const open = isAdmin || !booking || changesOpen(booking.startsAt);
  const canJoinSelf = !!member && !!booking && open && !full && !amParticipant && booking.visibility === "public";
  const canAddOthers = !!member && !!booking && open && !full && (isAdmin || amParticipant);
  const canRemove = (p: Participant) =>
    !!member && open && (isAdmin || p.profileId === member.id || p.addedBy === member.id);

  const { data: members = [] } = useQuery({ queryKey: queryKeys.members, queryFn: getMembers, enabled: canAddOthers });

  const startLabel = booking ? zonedTime(new Date(booking.startsAt), venue.timezone) : slot.time;
  const endLabel = booking
    ? zonedTime(new Date(booking.endsAt), venue.timezone)
    : `${String(Number(slot.time.slice(0, 2)) + hours).padStart(2, "0")}:00`;

  const addOther = () => {
    const name = guestName.trim();
    if (name) onJoin({ guestName: name });
    else if (addMemberId) onJoin({ profileId: addMemberId });
    else return;
    setGuestName("");
    setAddMemberId("");
  };

  const inBooking = new Set(booking?.participants.map((p) => p.profileId));

  return (
    <BottomSheet
      header={
        <div>
          <Eyebrow>
            {slot.date} · {startLabel} – {endLabel}
          </Eyebrow>
          <div style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700, marginTop: 4 }}>
            코트 {court?.name ?? "?"}
          </div>
        </div>
      }
      onClose={onClose}
    >
      {!member && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, color: "rgba(27,36,34,0.6)" }}>
            {booking ? "이미 예약된 시간이에요. " : ""}로그인하면 코트를 예약하고 참여할 수 있어요.
          </div>
          <PrimaryButton onClick={onOpenAuth}>회원가입 · 로그인</PrimaryButton>
        </div>
      )}

      {member && !booking && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <Eyebrow>예약 시간</Eyebrow>
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              {Array.from({ length: Math.max(1, freeHours) }, (_, i) => i + 1).map((h) => (
                <button key={h} onClick={() => setHours(h)} style={chipStyle(hours === h, C.turf)}>
                  {h}시간
                </button>
              ))}
            </div>
          </div>

          {isAdmin && (
            <div>
              <Eyebrow>종류</Eyebrow>
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                {KINDS.map((k) => (
                  <button key={k.key} onClick={() => setKind(k.key)} style={chipStyle(kind === k.key, k.color)}>
                    {k.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Eyebrow>공개 여부</Eyebrow>
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              {VISIBILITIES.map((v) => (
                <button
                  key={v.key}
                  onClick={() => setVisibility(v.key)}
                  title={v.hint}
                  style={chipStyle(visibility === v.key, C.turf)}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: "rgba(27,36,34,0.5)" }}>
              {VISIBILITIES.find((v) => v.key === visibility)?.hint}
            </div>
          </div>

          <PrimaryButton onClick={() => onCreate(hours, kind, visibility)} icon={UserPlus}>
            예약하기
          </PrimaryButton>
        </div>
      )}

      {member && booking && (
        <>
          <div style={{ marginTop: 14, display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ ...chipStyle(true, kindOf(booking.kind).color), cursor: "default" }}>
              {kindOf(booking.kind).label}
            </span>
            <span style={{ fontSize: 12, color: "rgba(27,36,34,0.55)" }}>
              {booking.visibility === "private" ? "비공개 · 참여자가 초대한 사람만" : "공개 · 누구나 참여 가능"}
            </span>
          </div>

          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {Array.from({ length: venue.maxPlayers }, (_, i) => {
              const p = booking.participants[i];
              return (
                <div
                  key={p?.id ?? i}
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
                  <span
                    style={{ fontSize: 14, fontWeight: p ? 700 : 500, color: p ? C.charcoal : "rgba(27,36,34,0.4)" }}
                  >
                    {p ? p.name : `빈 자리 ${i + 1}`}
                    {p?.isGuest && (
                      <span style={{ marginLeft: 6, fontSize: 11, color: "rgba(27,36,34,0.5)" }}>게스트</span>
                    )}
                  </span>
                  {p && canRemove(p) && (
                    <button
                      onClick={() => onLeave(p.id)}
                      title={p.profileId === member.id ? "참여 취소" : "내보내기"}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(27,36,34,0.4)" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {!open && (
            <div style={{ marginTop: 12, fontSize: 12, color: "rgba(27,36,34,0.55)" }}>
              시작 {CHANGE_CUTOFF_HOURS}시간 전까지만 참여하거나 취소할 수 있어요. 변경이 필요하면 관리자에게
              알려주세요.
            </div>
          )}

          {canJoinSelf && (
            <div style={{ marginTop: 16 }}>
              <PrimaryButton onClick={() => onJoin({ profileId: member.id })} icon={UserPlus}>
                이 시간에 참여
              </PrimaryButton>
            </div>
          )}

          {canAddOthers && (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <Eyebrow>같이 할 사람 추가</Eyebrow>
              <select
                value={addMemberId}
                onChange={(e) => {
                  setAddMemberId(e.target.value);
                  setGuestName("");
                }}
                style={fieldStyle}
              >
                <option value="">회원 선택</option>
                {members
                  .filter((m) => !inBooking.has(m.id))
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
              <input
                value={guestName}
                onChange={(e) => {
                  setGuestName(e.target.value);
                  setAddMemberId("");
                }}
                placeholder="또는 게스트 이름 입력"
                style={fieldStyle}
              />
              <PrimaryButton onClick={addOther} icon={UserPlus} disabled={!guestName.trim() && !addMemberId}>
                추가
              </PrimaryButton>
            </div>
          )}

          {isAdmin && <AdminControls venue={venue} booking={booking} onUpdate={onUpdate} onDelete={onDelete} />}
        </>
      )}
    </BottomSheet>
  );
}
