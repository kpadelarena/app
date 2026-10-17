import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createLeague, deleteLeague, getLeagues, type NewLeague } from "@/lib/db";
import { queryKeys } from "@/lib/queryKeys";

/* The league events at one venue, newest first. */
export function useLeagues(venueId: string | null, memberId: string | null) {
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState(false);

  const list = useQuery({
    queryKey: queryKeys.leagues.forVenue(venueId ?? ""),
    queryFn: () => getLeagues(venueId!),
    enabled: !!venueId,
  });

  const write = useMutation({
    mutationFn: (action: () => Promise<unknown>) => action(),
    onSuccess: () => setSaveError(false),
    onError: () => setSaveError(true),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.leagues.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.league.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.myMatches.all });
    },
  });

  return {
    leagues: list.data ?? [],
    loading: list.isPending && !!venueId,
    saveError,
    /** Resolves to the new event's id, or null when it could not be created. */
    createLeague: async (input: NewLeague) => {
      if (!memberId) return null;
      try {
        return (await write.mutateAsync(() => createLeague(input, memberId))) as string;
      } catch {
        return null;
      }
    },
    deleteLeague: (leagueId: string) => write.mutate(() => deleteLeague(leagueId)),
  };
}
