import type { Round, Team } from "@/lib/types";
import { matchScore } from "./score";

export interface PlayerStanding {
  id: string;
  name: string;
  points: number;
  played: number;
  wins: number;
}

export interface TeamStanding {
  id: string;
  name: string;
  played: number;
  win: number;
  loss: number;
  /** Points for / against. */
  pf: number;
  pa: number;
  /** League points: 3 per win. */
  pts: number;
  diff: number;
}

/* Calls `visit` with each side of every match that has a score entered. */
function forEachScoredSide(rounds: Round[], visit: (side: string[], own: number, other: number) => void) {
  for (const round of rounds) {
    for (const m of round.matches) {
      const score = matchScore(m);
      if (!score) continue;
      visit(m.sideA, score[0], score[1]);
      visit(m.sideB, score[1], score[0]);
    }
  }
}

/* Americano / Mexicano: every player collects their side's points. */
export function individualStandings(players: { id: string; name: string }[], rounds: Round[]): PlayerStanding[] {
  const stats: Record<string, PlayerStanding> = {};
  players.forEach((p) => {
    stats[p.id] = { id: p.id, name: p.name, points: 0, played: 0, wins: 0 };
  });
  forEachScoredSide(rounds, (side, own, other) =>
    side.forEach((pid) => {
      const s = stats[pid];
      if (!s) return;
      s.points += own;
      s.played += 1;
      if (own > other) s.wins += 1;
    }),
  );
  return Object.values(stats).sort((x, y) => y.points - x.points || y.wins - x.wins);
}

/* Round-robin: each side of a match is a single team id. */
export function teamStandings(teams: Team[], rounds: Round[]): TeamStanding[] {
  const stats: Record<string, Omit<TeamStanding, "pts" | "diff">> = {};
  teams.forEach((t) => {
    stats[t.id] = { id: t.id, name: t.name, played: 0, win: 0, loss: 0, pf: 0, pa: 0 };
  });
  forEachScoredSide(rounds, ([teamId], own, other) => {
    const s = stats[teamId];
    if (!s) return;
    s.played += 1;
    s.pf += own;
    s.pa += other;
    if (own > other) s.win += 1;
    else s.loss += 1;
  });
  return Object.values(stats)
    .map((s) => ({ ...s, pts: s.win * 3, diff: s.pf - s.pa }))
    .sort((x, y) => y.pts - x.pts || y.diff - x.diff);
}
