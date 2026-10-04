import type { BookingCategory } from "@/lib/types";

export const CATEGORIES: { key: BookingCategory; label: string; color: string }[] = [
  { key: "rental", label: "대관", color: "#8B5CF6" },
  { key: "match", label: "매치", color: "#16A34A" },
  { key: "league", label: "리그매치", color: "#D97706" },
  { key: "lesson", label: "레슨", color: "#E4574B" },
];

export const categoryOf = (key: string) => CATEGORIES.find((c) => c.key === key) || CATEGORIES[0];

/** Players per court booking (doubles). */
export const BOOKING_SLOTS_PER_MATCH = 4;
