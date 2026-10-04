import type { League } from "@/lib/types";

/** Display name for a player id or (round-robin) team id. */
export function nameOf(league: Pick<League, "players" | "teams">, id: string) {
  return league.players.find((p) => p.id === id)?.name ?? league.teams.find((t) => t.id === id)?.name ?? "?";
}
