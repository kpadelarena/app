import { useState, type ReactNode } from "react";
import { ChevronDown, Settings2, Share2, Trophy } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import type { League, LeagueFormat } from "@/lib/types";
import { C, FONT } from "@/styles/tokens";
import { FORMATS, VENUES } from "./constants";
import type { SaveStatus } from "./useClub";

const SAVE_INDICATOR: Record<SaveStatus, { dot: string; label: string }> = {
  idle: { dot: "rgba(255,255,255,0.3)", label: "" },
  saving: { dot: C.ball, label: "저장 중" },
  saved: { dot: C.ball, label: "실시간 저장됨" },
  error: { dot: C.danger, label: "저장 실패" },
};

function SaveIndicator({ status }: { status: SaveStatus }) {
  const { dot, label } = SAVE_INDICATOR[status];
  if (!label) return <div />;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot, display: "inline-block" }} />
      {label}
    </div>
  );
}

/* Uses the native share sheet where there is one, otherwise copies the link. */
function ShareButton() {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const shareData = {
      title: "K-Padel Arena Manager",
      text: "코트 예약 · 리그 · 순위를 한눈에 — K-Padel Arena Manager",
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // user cancelled or share failed; fall through to copy-link
    }
    try {
      await navigator.clipboard.writeText(shareData.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable; nothing more we can do silently
    }
  };

  return (
    <button
      onClick={share}
      title="카카오톡·SNS로 공유하기"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.25)",
        background: "transparent",
        color: copied ? C.ball : "rgba(255,255,255,0.75)",
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      <Share2 size={12} />
      {copied ? "링크 복사됨" : "공유"}
    </button>
  );
}

const nameStyle = { fontFamily: FONT.display, fontSize: 28, fontWeight: 700 };

/* The club name; click to edit in place, blur or Enter to save. */
function ClubName({ name, onRename }: { name: string; onRename: (name: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null); // null = not editing

  if (draft === null) {
    return (
      <h1 onClick={() => setDraft(name)} style={{ ...nameStyle, margin: 0, cursor: "text" }}>
        {name}
      </h1>
    );
  }
  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setDraft(null);
        if (draft !== name) onRename(draft);
      }}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      style={{
        ...nameStyle,
        background: "transparent",
        border: "none",
        borderBottom: `2px solid ${C.ball}`,
        color: "#fff",
        outline: "none",
        padding: "2px 0",
      }}
    />
  );
}

function VenueSelect({ value, onChange }: { value: string; onChange: (venue: string) => void }) {
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          background: "transparent",
          border: `1px solid ${C.glass}`,
          borderRadius: 999,
          color: "#fff",
          padding: "6px 30px 6px 12px",
          fontSize: 13,
          fontWeight: 600,
          fontFamily: FONT.body,
          cursor: "pointer",
        }}
      >
        {VENUES.map((v) => (
          <option key={v} value={v} style={{ color: C.charcoal }}>
            {v}
          </option>
        ))}
      </select>
      <ChevronDown
        size={13}
        color="rgba(255,255,255,0.65)"
        style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
      />
    </div>
  );
}

interface FormatPillProps {
  label: string;
  tooltip: string;
  active: boolean;
  onClick: () => void;
}

function FormatPill({ active, onClick, label, tooltip }: FormatPillProps) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      style={{
        padding: "7px 12px",
        borderRadius: 999,
        border: `1px solid ${active ? C.ball : "rgba(255,255,255,0.25)"}`,
        background: active ? "rgba(215,241,59,0.12)" : "transparent",
        color: active ? C.ball : "rgba(255,255,255,0.65)",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

const stepButtonStyle = {
  background: "none",
  border: "none",
  color: C.ball,
  fontSize: 16,
  cursor: "pointer",
  width: 18,
};

function CourtStepper({ value, onChange }: { value: number; onChange: (count: number) => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.25)",
      }}
    >
      <Settings2 size={13} color="rgba(255,255,255,0.6)" />
      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)" }}>코트</span>
      <button onClick={() => onChange(Math.max(1, value - 1))} style={stepButtonStyle}>
        −
      </button>
      <span style={{ fontFamily: FONT.mono, fontWeight: 700, color: "#fff", width: 14, textAlign: "center" }}>
        {value}
      </span>
      <button onClick={() => onChange(Math.min(8, value + 1))} style={stepButtonStyle}>
        +
      </button>
    </div>
  );
}

interface ClubHeaderProps {
  league: Pick<League, "name" | "venue" | "format" | "courtCount">;
  saveStatus: SaveStatus;
  onRename: (name: string) => void;
  onChangeVenue: (venue: string) => void;
  onChangeFormat: (format: LeagueFormat) => void;
  onChangeCourtCount: (count: number) => void;
  /** Shown at the right of the settings row. */
  account: ReactNode;
  /** Shown along the bottom edge. */
  tabs: ReactNode;
}

/* The dark page header: brand, club name and settings, account button and tabs. */
export function ClubHeader({
  league,
  saveStatus,
  onRename,
  onChangeVenue,
  onChangeFormat,
  onChangeCourtCount,
  account,
  tabs,
}: ClubHeaderProps) {
  return (
    <div style={{ background: C.ink, color: "#fff", padding: "20px 20px 0" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Trophy size={18} color={C.ball} />
            <Eyebrow>K-PADEL ARENA MANAGER</Eyebrow>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <img src="/brand-logo.jpg" alt="K-Padel Arena" style={{ width: 108, height: 27, objectFit: "contain" }} />
            <SaveIndicator status={saveStatus} />
            <ShareButton />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
          <ClubName name={league.name} onRename={onRename} />
        </div>

        <div style={{ marginTop: 10 }}>
          <VenueSelect value={league.venue} onChange={onChangeVenue} />
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
          {FORMATS.map((f) => (
            <FormatPill
              key={f.key}
              label={f.label}
              tooltip={f.tooltip}
              active={league.format === f.key}
              onClick={() => onChangeFormat(f.key)}
            />
          ))}
          <CourtStepper value={league.courtCount} onChange={onChangeCourtCount} />
          <div style={{ flex: 1 }} />
          {account}
        </div>

        {tabs}
      </div>
    </div>
  );
}
