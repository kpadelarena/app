import type { ReactNode } from "react";
import { C, FONT } from "@/styles/tokens";

export function Eyebrow({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <div
      style={{
        fontFamily: FONT.display,
        letterSpacing: "0.18em",
        fontSize: 11,
        fontWeight: 600,
        color: color || C.ball,
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}
