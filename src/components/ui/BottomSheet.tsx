import type { ReactNode } from "react";
import { X } from "lucide-react";
import { C } from "@/styles/tokens";

interface BottomSheetProps {
  /** Left side of the header row; the close button sits on the right. */
  header: ReactNode;
  onClose: () => void;
  children: ReactNode;
  headerAlign?: "center" | "flex-start";
  zIndex?: number;
}

/* A sheet anchored to the bottom of the screen over a dimmed backdrop.
   Clicking the backdrop closes it. */
export function BottomSheet({ header, onClose, children, headerAlign = "flex-start", zIndex = 50 }: BottomSheetProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(16,21,26,0.55)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#fff",
          borderRadius: "18px 18px 0 0",
          padding: 20,
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: headerAlign }}>
          {header}
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <X size={20} color={C.charcoal} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
