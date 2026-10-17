import type { ReactNode } from "react";

export function SectionCard({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        border: "1px solid rgba(0,0,0,0.06)",
        padding: 18,
      }}
    >
      {children}
    </div>
  );
}
