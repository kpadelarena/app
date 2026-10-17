import type { ReactNode } from "react";

interface CellProps {
  children?: ReactNode;
  align?: "left" | "center" | "right";
}

export function Th({ children, align = "center" }: CellProps) {
  return (
    <th
      style={{
        textAlign: align,
        padding: "8px 6px",
        fontSize: 11,
        letterSpacing: "0.06em",
        color: "rgba(27,36,34,0.55)",
        fontWeight: 600,
      }}
    >
      {children}
    </th>
  );
}

export function Td({ children, align = "center" }: CellProps) {
  return <td style={{ textAlign: align, padding: "10px 6px" }}>{children}</td>;
}
