import type { Match } from "@/lib/types";
import { C, FONT } from "@/styles/tokens";
import { matchScore } from "./score";

interface ScoreInputProps {
  value: string;
  onChange: (value: string) => void;
  highlight: boolean;
}

function ScoreInput({ value, onChange, highlight }: ScoreInputProps) {
  return (
    <input
      type="number"
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="-"
      style={{
        width: 48,
        height: 40,
        textAlign: "center",
        borderRadius: 8,
        border: `1px solid ${highlight ? C.ball : "rgba(255,255,255,0.25)"}`,
        background: highlight ? "rgba(215,241,59,0.14)" : "rgba(255,255,255,0.06)",
        color: highlight ? C.ball : "#fff",
        fontFamily: FONT.mono,
        fontWeight: 700,
        fontSize: 17,
        outline: "none",
      }}
    />
  );
}

interface CourtMatchProps {
  match: Match;
  nameOf: (id: string) => string;
  onScore: (field: "scoreA" | "scoreB", value: string) => void;
}

/* ---------------------------------------------------------
   코트 다이어그램 매치 카드 — 시그니처 요소
--------------------------------------------------------- */
export function CourtMatch({ match, nameOf, onScore }: CourtMatchProps) {
  const score = matchScore(match);
  const aWins = !!score && score[0] > score[1];
  const bWins = !!score && score[1] > score[0];

  return (
    <div
      style={{
        borderRadius: 14,
        overflow: "hidden",
        background: C.turf,
        border: `1px solid ${C.turfLight}`,
        boxShadow: "0 1px 0 rgba(255,255,255,0.06) inset",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px",
          borderBottom: `1px solid ${C.line}`,
        }}
      >
        <span
          style={{
            fontFamily: FONT.display,
            fontSize: 11,
            letterSpacing: "0.14em",
            color: "rgba(255,255,255,0.65)",
            textTransform: "uppercase",
          }}
        >
          Court {match.court}
        </span>
      </div>

      <div style={{ display: "flex", position: "relative" }}>
        {/* net line */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            bottom: 0,
            width: 0,
            borderLeft: `2px dashed ${C.line}`,
          }}
        />
        {[match.sideA, match.sideB].map((side, si) => {
          const isWinner = si === 0 ? aWins : bWins;
          return (
            <div
              key={si}
              style={{
                flex: 1,
                padding: "14px 12px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                background: isWinner ? "rgba(215,241,59,0.08)" : "transparent",
              }}
            >
              {side.map((id) => (
                <div
                  key={id}
                  style={{
                    fontFamily: FONT.body,
                    fontWeight: isWinner ? 700 : 500,
                    fontSize: 14,
                    color: isWinner ? C.ball : "#EDEFE8",
                    lineHeight: 1.35,
                  }}
                >
                  {nameOf(id)}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: "10px 12px 14px",
        }}
      >
        <ScoreInput value={match.scoreA} onChange={(v) => onScore("scoreA", v)} highlight={aWins} />
        <span style={{ color: "rgba(255,255,255,0.4)", fontFamily: FONT.mono }}>:</span>
        <ScoreInput value={match.scoreB} onChange={(v) => onScore("scoreB", v)} highlight={bWins} />
      </div>
    </div>
  );
}
