import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { C, FONT } from "@/styles/tokens";

interface PrimaryButtonProps {
  onClick?: () => void;
  children: ReactNode;
  icon?: LucideIcon;
  disabled?: boolean;
  style?: CSSProperties;
}

export function PrimaryButton({ onClick, children, icon: Icon, disabled, style }: PrimaryButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 16px",
        borderRadius: 10,
        border: "none",
        background: disabled ? "#B8BDB2" : C.ink,
        color: disabled ? "#7A7F74" : C.ball,
        fontFamily: FONT.body,
        fontWeight: 600,
        fontSize: 14,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
    >
      {Icon ? <Icon size={16} /> : null}
      {children}
    </button>
  );
}
