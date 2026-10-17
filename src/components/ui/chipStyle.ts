import { C } from "@/styles/tokens";

/** A pill toggle: filled in `color` when active, outlined otherwise. */
export const chipStyle = (active: boolean, color: string) =>
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
