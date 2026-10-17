import type { Match } from "@/lib/types";

/** Both sides' scores as numbers, or null until both have been entered. */
export function matchScore(m: Match): [number, number] | null {
  const a = Number(m.scoreA);
  const b = Number(m.scoreB);
  if (m.scoreA === "" || m.scoreB === "" || isNaN(a) || isNaN(b)) return null;
  return [a, b];
}
