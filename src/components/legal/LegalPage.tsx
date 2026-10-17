import type { ReactNode } from "react";
import Link from "next/link";
import { CLUB_NAME, POLICY_DATE } from "@/features/club/constants";
import { C, FONT } from "@/styles/tokens";

/* A plain, printable document page for the terms and the privacy policy. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: C.paper, color: C.charcoal, fontFamily: FONT.body }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 80px", fontSize: 15, lineHeight: 1.7 }}>
        <Link href="/" style={{ fontSize: 13, fontWeight: 700, color: C.turf, textDecoration: "none" }}>
          ← {CLUB_NAME}
        </Link>
        <h1 style={{ fontFamily: FONT.display, fontSize: 30, fontWeight: 700, margin: "16px 0 4px" }}>{title}</h1>
        <div style={{ fontSize: 13, color: "rgba(27,36,34,0.55)", marginBottom: 24 }}>시행일: {POLICY_DATE}</div>
        {children}
        <div style={{ marginTop: 40, fontSize: 13, color: "rgba(27,36,34,0.55)" }}>
          <Link href="/terms" style={{ color: C.turf }}>
            이용약관
          </Link>
          {" · "}
          <Link href="/privacy" style={{ color: C.turf }}>
            개인정보처리방침
          </Link>
        </div>
      </div>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 8px" }}>{title}</h2>
      {children}
    </section>
  );
}

export const listStyle = { margin: "6px 0 0", paddingLeft: 20 } as const;
