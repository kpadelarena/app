import type { ReactNode } from "react";
import { C, FONT } from "@/styles/tokens";

/* Small uppercase section label. Dark by default; pass `color={C.ball}`
   on dark backgrounds, where the neon green is readable. */
export function Eyebrow({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <div
      style={{
        fontFamily: FONT.display,
        letterSpacing: "0.18em",
        fontSize: 11,
        fontWeight: 600,
        color: color || C.charcoal,
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}
