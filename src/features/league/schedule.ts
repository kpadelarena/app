import type { Match, Round } from "@/lib/types";
import { uid } from "@/lib/uid";
import { matchScore } from "./score";

/* ---------------------------------------------------------
   스케줄 생성 알고리즘
--------------------------------------------------------- */

type HasId = { id: string };

const shuffled = <T>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

const newMatch = (id: string, court: number, sideA: string[], sideB: string[]): Match => ({
  id,
  court,
  sideA,
  sideB,
  scoreA: "",
  scoreB: "",
});

/* How many players play this round and who sits out — whoever has
   played the least gets priority to play. Null when there aren't
   enough players for a single match. */
function pickActive(ids: string[], playCount: Record<string, number>, courtCount: number) {
  const matchCount = Math.min(courtCount, Math.floor(ids.length / 4));
  if (matchCount < 1) return null;
  const byRest = [...ids].sort((a, b) => playCount[a] - playCount[b] || Math.random() - 0.5);
  return { matchCount, active: byRest.slice(0, matchCount * 4), sitOut: byRest.slice(matchCount * 4) };
}

export function generateAmericanoRounds(players: HasId[], courtCount: number, numRounds: number): Round[] {
  const ids = players.map((p) => p.id);
  const partner: Record<string, Record<string, number>> = {};
  const playCount: Record<string, number> = {};
  ids.forEach((a) => {
    partner[a] = {};
    playCount[a] = 0;
    ids.forEach((b) => {
      partner[a][b] = 0;
    });
  });

  /* Takes the next player off the pool, preferring whoever has
     partnered `withPlayer` the least so far. */
  const takeLeastPartnered = (pool: string[], withPlayer: string) => {
    pool.sort((a, b) => partner[withPlayer][a] - partner[withPlayer][b] || Math.random() - 0.5);
    return pool.shift()!;
  };

  const rounds: Round[] = [];
  for (let r = 0; r < numRounds; r++) {
    const picked = pickActive(ids, playCount, courtCount);
    if (!picked) break;

    let pool = shuffled(picked.active);
    const matches: Match[] = [];

    while (pool.length >= 4) {
      const p1 = pool.shift()!;
      const p2 = takeLeastPartnered(pool, p1);
      pool = shuffled(pool);
      const p3 = pool.shift()!;
      const p4 = takeLeastPartnered(pool, p3);

      partner[p1][p2]++;
      partner[p2][p1]++;
      partner[p3][p4]++;
      partner[p4][p3]++;
      [p1, p2, p3, p4].forEach((x) => (playCount[x] += 1));

      matches.push(newMatch(`r${r}-c${matches.length}`, matches.length + 1, [p1, p2], [p3, p4]));
    }
    rounds.push({ roundNumber: r + 1, matches, sitOut: picked.sitOut });
  }
  return rounds;
}

export function generateRoundRobinRounds(teams: HasId[], courtCount: number): Round[] {
  const BYE = "BYE";
  const arr = teams.map((t) => t.id);
  if (arr.length % 2 !== 0) arr.push(BYE);
  const n = arr.length;
  const rounds: Round[] = [];
  let current = [...arr];

  for (let r = 0; r < n - 1; r++) {
    const matches: Match[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = current[i];
      const b = current[n - 1 - i];
      if (a === BYE || b === BYE) continue;
      matches.push(newMatch(`r${r}-m${matches.length}`, (matches.length % courtCount) + 1, [a], [b]));
    }
    rounds.push({ roundNumber: r + 1, matches });
    current = [current[0], current[n - 1], ...current.slice(1, n - 1)];
  }
  return rounds;
}

/* Mexicano — unlike Americano's rotate-for-variety approach, pairing is
   re-computed each round from the CURRENT standings, so it's generated
   one round at a time (not upfront): within each rank-ordered group of
   4 active players, 1st+4th play together against 2nd+3rd, which keeps
   matches close instead of stacking the two best players together. */
export function generateMexicanoRound(players: HasId[], existingRounds: Round[], courtCount: number) {
  const ids = players.map((p) => p.id);
  const points: Record<string, number> = {};
  const playCount: Record<string, number> = {};
  ids.forEach((id) => {
    points[id] = 0;
    playCount[id] = 0;
  });

  existingRounds.forEach((round) => {
    round.matches.forEach((m) => {
      const score = matchScore(m);
      const tally = (side: string[], sidePoints = 0) =>
        side.forEach((pid) => {
          if (points[pid] === undefined) return;
          playCount[pid] += 1;
          points[pid] += sidePoints;
        });
      tally(m.sideA, score?.[0]);
      tally(m.sideB, score?.[1]);
    });
  });

  const picked = pickActive(ids, playCount, courtCount);
  if (!picked) return null;

  // Rank the active players by current points, then chunk into groups of 4.
  const ranked = picked.active.sort((a, b) => points[b] - points[a] || Math.random() - 0.5);

  const matches: Match[] = [];
  for (let i = 0; i < picked.matchCount; i++) {
    const [r1, r2, r3, r4] = ranked.slice(i * 4, i * 4 + 4);
    matches.push(newMatch(uid(), i + 1, [r1, r4], [r2, r3]));
  }

  return { matches, sitOut: picked.sitOut };
}
