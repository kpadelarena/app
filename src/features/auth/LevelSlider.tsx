import { C, FONT } from "@/styles/tokens";
import { LEVEL_MAX, LEVEL_MIN, LEVEL_STEP } from "./constants";

export function LevelSlider({ value, onChange }: { value: number; onChange: (level: number) => void }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.charcoal }}>레벨 (0.0 ~ 7.0)</span>
        <span style={{ fontFamily: FONT.mono, fontSize: 18, fontWeight: 700, color: C.turf }}>{value.toFixed(1)}</span>
      </div>
      <input
        type="range"
        min={LEVEL_MIN}
        max={LEVEL_MAX}
        step={LEVEL_STEP}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", marginTop: 8, accentColor: C.turf }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(27,36,34,0.4)" }}>
        <span>0.0 · 입문</span>
        <span>7.0 · 프로</span>
      </div>
    </div>
  );
}
