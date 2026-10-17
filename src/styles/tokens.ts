/* ---------------------------------------------------------
   토큰 — 파델 코트의 소재를 그대로 색과 타이포에 옮김
   turf: 코트 인조잔디, ball: 형광 옐로그린 볼,
   glass: 코트 유리벽, ink: 실내 파델장 조명 아래의 어둠
--------------------------------------------------------- */
export const C = {
  ink: "#10151A",
  inkSoft: "#1A2229",
  turf: "#0F3D3E",
  turfLight: "#175651",
  paper: "#ECEFEA",
  paperDim: "#DDE2D8",
  ball: "#D7F13B",
  glass: "#6C97A0",
  charcoal: "#1B2422",
  line: "rgba(255,255,255,0.28)",
  danger: "#C25450",
} as const;

export const FONT = {
  display: "'Oswald', sans-serif",
  mono: "'JetBrains Mono', monospace",
  body: "'Pretendard Variable', sans-serif",
} as const;
