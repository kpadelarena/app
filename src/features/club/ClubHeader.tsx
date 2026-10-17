import { useState, type ReactNode } from "react";
import { ChevronDown, Share2 } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import type { Venue } from "@/lib/types";
import { C, FONT } from "@/styles/tokens";
import { CLUB_NAME } from "./constants";

/* Uses the native share sheet where there is one, otherwise copies the link. */
function ShareButton() {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const shareData = {
      title: `${CLUB_NAME} Manager`,
      text: `코트 예약 · 리그 · 순위를 한눈에 — ${CLUB_NAME}`,
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

function VenueSelect({ venues, value, onChange }: { venues: Venue[]; value: string; onChange: (id: string) => void }) {
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
        {venues.map((v) => (
          <option key={v.id} value={v.id} style={{ color: C.charcoal }}>
            {v.name}
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

interface ClubHeaderProps {
  venues: Venue[];
  venueId: string;
  onSelectVenue: (id: string) => void;
  /** Shown at the right of the venue row. */
  account: ReactNode;
  /** Shown along the bottom edge. */
  tabs: ReactNode;
}

/* The dark page header: brand, club name, venue switcher, account button and tabs. */
export function ClubHeader({ venues, venueId, onSelectVenue, account, tabs }: ClubHeaderProps) {
  return (
    <div style={{ background: C.ink, color: "#fff", padding: "20px 20px 0" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
            <img
              src="/brand-logo.jpg"
              alt=""
              style={{
                width: 64,
                height: 64,
                borderRadius: 14,
                objectFit: "cover",
                flexShrink: 0,
                border: `1px solid ${C.glass}`,
              }}
            />
            <div style={{ minWidth: 0 }}>
              <Eyebrow color={C.ball}>{CLUB_NAME.toUpperCase()} MANAGER</Eyebrow>
              <h1
                style={{ fontFamily: FONT.display, fontSize: 28, fontWeight: 700, margin: "2px 0 0", lineHeight: 1.1 }}
              >
                {CLUB_NAME}
              </h1>
            </div>
          </div>
          <ShareButton />
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
          <VenueSelect venues={venues} value={venueId} onChange={onSelectVenue} />
          <div style={{ flex: 1 }} />
          {account}
        </div>

        {tabs}
      </div>
    </div>
  );
}
