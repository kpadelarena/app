import type { ReactNode } from "react";
import { C, FONT } from "@/styles/tokens";

/* A full-height page with its content centred, for loading and empty states. */
export function CenteredScreen({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        alignItems: "center",
        justifyContent: "center",
        background: C.paper,
        fontFamily: FONT.body,
        color: C.charcoal,
        padding: 20,
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}
