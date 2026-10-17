import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { fieldStyle } from "@/components/ui/fieldStyle";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SectionCard } from "@/components/ui/SectionCard";
import type { NewVenue, VenuePatch } from "@/lib/db";
import type { Venue } from "@/lib/types";
import { C, FONT } from "@/styles/tokens";

const dim = "rgba(27,36,34,0.5)";
const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 25 }, (_, h) => `${pad(h)}:00`);
const CAPACITIES = [2, 4, 6, 8, 10, 12];

const labelStyle = { fontSize: 12, fontWeight: 700, color: dim, marginBottom: 4 } as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 120 }}>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  );
}

interface NewVenueFormProps {
  onCreate: (input: Omit<NewVenue, "sortOrder">) => Promise<string | null>;
}

/* Name and address; everything else starts from the defaults and is
   edited in the venue settings afterwards. */
export function NewVenueForm({ onCreate }: NewVenueFormProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    const id = await onCreate({ name: name.trim(), address: address.trim() || null });
    setBusy(false);
    if (id) {
      setName("");
      setAddress("");
    }
  };

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", width: "100%" }}>
      <Field label="지점 이름">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: Yongsan Mmove"
          style={fieldStyle}
        />
      </Field>
      <Field label="주소">
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="선택" style={fieldStyle} />
      </Field>
      <PrimaryButton onClick={create} icon={Plus} disabled={!name.trim() || busy}>
        지점 추가
      </PrimaryButton>
    </div>
  );
}

/* The "+ 지점" sheet: creates the venue and hands back its id so the app
   can switch to it. */
export function NewVenueSheet({ onCreate, onClose }: NewVenueFormProps & { onClose: () => void }) {
  return (
    <BottomSheet header={<Eyebrow>새 지점</Eyebrow>} headerAlign="center" onClose={onClose}>
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 13, color: dim }}>
          이름만 있으면 만들 수 있어요. 운영 시간, 코트, 편의시설은 만든 뒤 지점 설정에서 정해요.
        </div>
        <NewVenueForm
          onCreate={async (input) => {
            const id = await onCreate(input);
            if (id) onClose();
            return id;
          }}
        />
      </div>
    </BottomSheet>
  );
}

interface VenueAdminProps {
  venue: Venue;
  onUpdate: (patch: VenuePatch) => void;
  onDelete: () => void;
  onAddCourt: (name: string) => void;
  onRemoveCourt: (courtId: string) => void;
}

/* Admin-only settings for the venue on screen: details, hours, capacity,
   courts, and deleting the venue. Opens by itself for a venue that has no
   courts yet, which is where a freshly created one lands. */
export function VenueAdmin({ venue, onUpdate, onDelete, onAddCourt, onRemoveCourt }: VenueAdminProps) {
  const [open, setOpen] = useState(venue.courts.length === 0);
  const [name, setName] = useState(venue.name);
  const [address, setAddress] = useState(venue.address ?? "");
  const [courtName, setCourtName] = useState("");

  const detailsChanged = name.trim() !== venue.name || (address.trim() || null) !== venue.address;
  const saveDetails = () => name.trim() && onUpdate({ name: name.trim(), address: address.trim() || null });

  const addCourt = () => {
    const next = courtName.trim() || String(venue.courts.length + 1);
    setCourtName("");
    onAddCourt(next);
  };
  const removeCourt = (courtId: string, courtLabel: string) => {
    if (confirm(`코트 ${courtLabel}을(를) 숨길까요? 이미 잡힌 예약은 그대로 남아요.`)) onRemoveCourt(courtId);
  };
  const remove = () => {
    if (confirm(`${venue.name} 지점을 삭제할까요? 코트와 예약이 함께 삭제돼요. 리그 이벤트가 있으면 삭제할 수 없어요.`))
      onDelete();
  };

  return (
    <SectionCard>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          width: "100%",
          justifyContent: "space-between",
          alignItems: "center",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
        }}
      >
        <Eyebrow>지점 설정</Eyebrow>
        {open ? <ChevronUp size={16} color={dim} /> : <ChevronDown size={16} color={dim} />}
      </button>

      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 14 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <Field label="지점 이름">
              <input value={name} onChange={(e) => setName(e.target.value)} style={fieldStyle} />
            </Field>
            <Field label="주소">
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="선택"
                style={fieldStyle}
              />
            </Field>
            <PrimaryButton onClick={saveDetails} disabled={!detailsChanged || !name.trim()}>
              저장
            </PrimaryButton>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Field label="오픈">
              <select
                value={venue.openTime}
                onChange={(e) => onUpdate({ openTime: e.target.value })}
                style={fieldStyle}
              >
                {HOURS.filter((h) => h < venue.closeTime).map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="마감">
              <select
                value={venue.closeTime}
                onChange={(e) => onUpdate({ closeTime: e.target.value })}
                style={fieldStyle}
              >
                {HOURS.filter((h) => h > venue.openTime).map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="예약당 최대 인원">
              <select
                value={venue.maxPlayers}
                onChange={(e) => onUpdate({ maxPlayers: Number(e.target.value) })}
                style={fieldStyle}
              >
                {CAPACITIES.map((n) => (
                  <option key={n} value={n}>
                    {n}명
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div>
            <div style={labelStyle}>코트</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              {venue.courts.map((c) => (
                <span
                  key={c.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 8px 6px 12px",
                    borderRadius: 999,
                    background: C.paperDim,
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: FONT.mono,
                  }}
                >
                  코트 {c.name}
                  <button
                    onClick={() => removeCourt(c.id, c.name)}
                    aria-label={`코트 ${c.name} 숨기기`}
                    style={{ background: "none", border: "none", cursor: "pointer", display: "flex", color: dim }}
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
              <input
                value={courtName}
                onChange={(e) => setCourtName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCourt()}
                placeholder={String(venue.courts.length + 1)}
                aria-label="새 코트 이름"
                style={{ ...fieldStyle, width: 64, padding: "6px 10px", fontFamily: FONT.mono, textAlign: "center" }}
              />
              <PrimaryButton onClick={addCourt} icon={Plus} style={{ padding: "7px 12px", fontSize: 13 }}>
                코트 추가
              </PrimaryButton>
            </div>
            {venue.courts.length === 0 && (
              <div style={{ fontSize: 12, color: dim, marginTop: 8 }}>코트를 추가해야 예약을 받을 수 있어요.</div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={remove}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: "none",
                border: "none",
                padding: 0,
                fontSize: 12,
                fontWeight: 700,
                color: C.danger,
                cursor: "pointer",
              }}
            >
              <Trash2 size={14} /> 지점 삭제
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
