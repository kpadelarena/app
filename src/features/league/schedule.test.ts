import { describe, expect, it } from "vitest";
import type { Round } from "@/lib/types";
import { generateAmericanoRounds, generateMexicanoRound, generateRoundRobinRounds } from "./schedule";
import { individualStandings, teamStandings } from "./standings";

const people = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }));
const playersIn = (round: Pick<Round, "matches">) => round.matches.flatMap((m) => [...m.sideA, ...m.sideB]);

describe("generateAmericanoRounds", () => {
  it("fills every court with four distinct players per round", () => {
    const rounds = generateAmericanoRounds(people(8), 2, 3);
    expect(rounds).toHaveLength(3);
    for (const round of rounds) {
      expect(round.matches.map((m) => m.court)).toEqual([1, 2]);
      expect(new Set(playersIn(round)).size).toBe(8);
      expect(round.sitOut).toEqual([]);
    }
  });

  it("rotates who sits out when players don't divide by four", () => {
    const rounds = generateAmericanoRounds(people(5), 2, 5);
    const satOut = rounds.flatMap((r) => r.sitOut ?? []);
    expect(rounds.every((r) => r.matches.length === 1)).toBe(true);
    expect(new Set(satOut).size).toBe(5);
  });

  it("returns no rounds with fewer than four players", () => {
    expect(generateAmericanoRounds(people(3), 2, 5)).toEqual([]);
  });
});

describe("generateMexicanoRound", () => {
  it("pairs 1st+4th against 2nd+3rd by points so far", () => {
    const played: Round[] = [
      {
        roundNumber: 1,
        matches: [{ id: "m", court: 1, sideA: ["p1", "p2"], sideB: ["p3", "p4"], scoreA: "20", scoreB: "12" }],
      },
      {
        roundNumber: 2,
        matches: [{ id: "n", court: 1, sideA: ["p1", "p3"], sideB: ["p2", "p4"], scoreA: "18", scoreB: "14" }],
      },
    ];
    // points so far: p1 38, p2 34, p3 30, p4 26
    const next = generateMexicanoRound(people(4), played, 2);
    expect(next?.matches).toHaveLength(1);
    expect(next?.matches[0].sideA).toEqual(["p1", "p4"]);
    expect(next?.matches[0].sideB).toEqual(["p2", "p3"]);
  });

  it("returns null with fewer than four players", () => {
    expect(generateMexicanoRound(people(3), [], 2)).toBeNull();
  });
});

describe("generateRoundRobinRounds", () => {
  it("has every team meet every other team exactly once", () => {
    const rounds = generateRoundRobinRounds(people(5), 2);
    const pairings = rounds.flatMap((r) => r.matches.map((m) => [m.sideA[0], m.sideB[0]].sort().join("-")));
    expect(pairings).toHaveLength(10);
    expect(new Set(pairings).size).toBe(10);
  });
});

describe("standings", () => {
  const rounds: Round[] = [
    {
      roundNumber: 1,
      matches: [
        { id: "a", court: 1, sideA: ["p1", "p2"], sideB: ["p3", "p4"], scoreA: "24", scoreB: "8" },
        { id: "b", court: 2, sideA: ["p1", "p3"], sideB: ["p2", "p4"], scoreA: "", scoreB: "" },
      ],
    },
  ];

  it("gives each player their side's points and ignores unscored matches", () => {
    const table = individualStandings(people(4), rounds);
    expect(table.map((s) => [s.id, s.points, s.played, s.wins])).toEqual([
      ["p1", 24, 1, 1],
      ["p2", 24, 1, 1],
      ["p3", 8, 1, 0],
      ["p4", 8, 1, 0],
    ]);
  });

  it("ranks teams by wins, then point difference", () => {
    const teams = [
      { id: "t1", name: "A", playerIds: [] },
      { id: "t2", name: "B", playerIds: [] },
    ];
    const played: Round[] = [
      { roundNumber: 1, matches: [{ id: "x", court: 1, sideA: ["t1"], sideB: ["t2"], scoreA: "3", scoreB: "6" }] },
    ];
    expect(teamStandings(teams, played).map((s) => [s.id, s.pts, s.diff])).toEqual([
      ["t2", 3, 3],
      ["t1", 0, -3],
    ]);
  });
});
