import type { LucideIcon } from "lucide-react";
import { C, FONT } from "@/styles/tokens";

interface TabBarProps<Key extends string> {
  tabs: readonly { key: Key; label: string; icon: LucideIcon }[];
  active: Key;
  onChange: (key: Key) => void;
}

/* Underlined tabs for use on the dark header. */
export function TabBar<Key extends string>({ tabs, active, onChange }: TabBarProps<Key>) {
  return (
    <div style={{ display: "flex", gap: 2, marginTop: 20, overflowX: "auto" }}>
      {tabs.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "8px 10px",
            background: "transparent",
            border: "none",
            borderBottom: `2px solid ${active === key ? C.ball : "transparent"}`,
            color: active === key ? C.ball : "rgba(255,255,255,0.55)",
            fontFamily: FONT.body,
            fontWeight: 600,
            fontSize: 12,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <Icon size={13} />
          {label}
        </button>
      ))}
    </div>
  );
}
