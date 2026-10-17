import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  addLeaguePlayer,
  appendMatches,
  clearMatches,
  getLeague,
  removeLeaguePlayer,
  removeRound,
  replaceMatches,
  setLeagueTeams,
  updateLeague,
  updateMatchScore,
  uploadResultPhoto,
  type LeaguePatch,
} from "@/lib/db";
import { queryKeys } from "@/lib/queryKeys";
import type { League, Match, Team } from "@/lib/types";
import { generateAmericanoRounds, generateMexicanoRound, generateRoundRobinRounds } from "./schedule";

/* One league event with its roster, teams and schedule, and the actions on it. */
export function useLeague(leagueId: string | null, memberId: string | null) {
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState(false);
  const [resultPhotoUploading, setResultPhotoUploading] = useState(false);

  const detail = useQuery({
    queryKey: queryKeys.league.detail(leagueId ?? ""),
    queryFn: () => getLeague(leagueId!),
    enabled: !!leagueId,
  });
  const league = detail.data ?? null;

  const invalidate = () => {
    if (leagueId) void queryClient.invalidateQueries({ queryKey: queryKeys.league.detail(leagueId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.leagues.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.myMatches.all });
  };

  const write = useMutation({
    mutationFn: (action: (league: League) => Promise<unknown>) => (league ? action(league) : Promise.resolve()),
    onSuccess: () => setSaveError(false),
    onError: () => setSaveError(true),
    onSettled: invalidate,
  });
  const run = (action: (league: League) => Promise<unknown>) => write.mutate(action);

  const patchLeague = (changes: Partial<League>) => {
    if (!leagueId) return;
    const key = queryKeys.league.detail(leagueId);
    void queryClient.cancelQueries({ queryKey: key });
    queryClient.setQueryData<League | null>(key, (prev) => (prev ? { ...prev, ...changes } : prev));
  };

  /* The signed-in member's roster entry, if they are in this event. */
  const myPlayerId = league?.players.find((p) => p.profileId === memberId)?.id ?? null;
  const playsIn = (match: Match) => {
    if (!league || !myPlayerId) return false;
    const sides = [...match.sideA, ...match.sideB];
    return (
      sides.includes(myPlayerId) || league.teams.some((t) => sides.includes(t.id) && t.playerIds.includes(myPlayerId))
    );
  };

  return {
    league,
    loading: detail.isPending && !!leagueId,
    saveError,
    resultPhotoUploading,
    playsIn,

    updateLeague: (patch: LeaguePatch) => run((l) => updateLeague(l.id, patch)),
    addMember: (profileId: string) => run((l) => addLeaguePlayer(l.id, { profileId })),
    addGuest: (name: string) => run((l) => addLeaguePlayer(l.id, { guestName: name })),
    removePlayer: (leaguePlayerId: string) => run(() => removeLeaguePlayer(leaguePlayerId)),

    /* Pairs the roster at random into round-robin teams, replacing the old ones. */
    autoAssignTeams: () =>
      run((l) => {
        const shuffled = [...l.players].sort(() => Math.random() - 0.5);
        const teams: Pick<Team, "name" | "playerIds">[] = [];
        for (let i = 0; i + 1 < shuffled.length; i += 2) {
          const pair = [shuffled[i], shuffled[i + 1]];
          teams.push({ name: pair.map((p) => p.name).join(" & "), playerIds: pair.map((p) => p.id) });
        }
        return setLeagueTeams(l.id, teams);
      }),

    generateSchedule: (numRounds: number) =>
      run((l) => {
        if (l.format === "round_robin") {
          if (l.teams.length < 2) return Promise.resolve();
          return replaceMatches(l.id, generateRoundRobinRounds(l.teams, l.courtCount));
        }
        if (l.players.length < 4) return Promise.resolve();
        if (l.format === "americano") {
          return replaceMatches(l.id, generateAmericanoRounds(l.players, l.courtCount, numRounds));
        }
        const first = generateMexicanoRound(l.players, [], l.courtCount);
        return first ? replaceMatches(l.id, [{ roundNumber: 1, ...first }]) : Promise.resolve();
      }),
    generateNextMexicanoRound: () =>
      run((l) => {
        const next = l.players.length >= 4 && generateMexicanoRound(l.players, l.rounds, l.courtCount);
        return next ? appendMatches(l.id, { roundNumber: l.rounds.length + 1, ...next }) : Promise.resolve();
      }),
    removeLastRound: () =>
      run((l) => {
        const last = l.rounds[l.rounds.length - 1];
        return last ? removeRound(l.id, last.roundNumber) : Promise.resolve();
      }),
    resetMatches: () => run((l) => clearMatches(l.id)),

    updateScore: (roundIdx: number, matchId: string, field: "scoreA" | "scoreB", value: string) => {
      if (!league) return;
      patchLeague({
        rounds: league.rounds.map((round, ri) =>
          ri !== roundIdx
            ? round
            : { ...round, matches: round.matches.map((m) => (m.id === matchId ? { ...m, [field]: value } : m)) },
        ),
      });
      run(() => updateMatchScore(matchId, field, value));
    },

    uploadResultPhoto: async (file: File) => {
      if (!league) return;
      setResultPhotoUploading(true);
      patchLeague({ resultPhoto: URL.createObjectURL(file) });
      try {
        patchLeague({ resultPhoto: await uploadResultPhoto(league.id, file) });
        setSaveError(false);
      } catch {
        setSaveError(true);
      } finally {
        setResultPhotoUploading(false);
        invalidate();
      }
    },
    setResultPhotoUrl: (url: string) => {
      patchLeague({ resultPhoto: url });
      run((l) => updateLeague(l.id, { resultPhotoUrl: url }));
    },
  };
}
