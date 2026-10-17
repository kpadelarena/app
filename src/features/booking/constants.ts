import type { BookingKind } from "@/lib/types";

export const KINDS: { key: BookingKind; label: string; color: string }[] = [
  { key: "match", label: "매치", color: "#16A34A" },
  { key: "lesson", label: "레슨", color: "#E4574B" },
  { key: "league", label: "리그", color: "#D97706" },
];

export const kindOf = (key: BookingKind) => KINDS.find((k) => k.key === key) ?? KINDS[0];

/** Members can join or leave a booking until this long before it starts. */
export const CHANGE_CUTOFF_HOURS = 24;

export const changesOpen = (startsAt: string, now = Date.now()) =>
  now < new Date(startsAt).getTime() - CHANGE_CUTOFF_HOURS * 3_600_000;

/** How many days the booking calendar shows, starting today. */
export const DAYS_AHEAD = 7;
