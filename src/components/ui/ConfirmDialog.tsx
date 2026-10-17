"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { C, FONT } from "@/styles/tokens";

export interface ConfirmOptions {
  /** Label of the confirming button, e.g. "삭제". */
  confirmLabel?: string;
  /** Red confirming button for destructive actions. */
  danger?: boolean;
}

type Ask = (message: string, options?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Ask | null>(null);

interface Pending {
  message: string;
  options: ConfirmOptions;
  resolve: (ok: boolean) => void;
}

/* An in-app replacement for window.confirm: a small centred dialog that
   resolves true or false. Native dialogs are unstyled, awkward on phones
   and silently dismissed by some embedded browsers. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const ask = useCallback<Ask>(
    (message, options = {}) =>
      new Promise((resolve) => {
        setPending({ message, options, resolve });
      }),
    [],
  );

  const answer = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      {pending && (
        <div
          onClick={() => answer(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(16,21,26,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            fontFamily: FONT.body,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="확인"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 360,
              background: "#fff",
              borderRadius: 16,
              padding: 20,
              color: C.charcoal,
              boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>{pending.message}</div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
              <button
                onClick={() => answer(false)}
                style={{
                  padding: "9px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.15)",
                  background: "transparent",
                  color: C.charcoal,
                  fontFamily: FONT.body,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                취소
              </button>
              <button
                autoFocus
                onClick={() => answer(true)}
                style={{
                  padding: "9px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: pending.options.danger ? C.danger : C.ink,
                  color: pending.options.danger ? "#fff" : C.ball,
                  fontFamily: FONT.body,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                {pending.options.confirmLabel ?? "확인"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

/** Asks the user to confirm; resolves true when they do. */
export function useConfirm(): Ask {
  const ask = useContext(ConfirmContext);
  if (!ask) throw new Error("useConfirm needs a ConfirmProvider");
  return ask;
}
