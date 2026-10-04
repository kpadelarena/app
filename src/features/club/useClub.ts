import { useCallback, useEffect, useState } from "react";
import { BOOKING_SLOTS_PER_MATCH } from "@/features/booking/constants";
import type { JoinRequest } from "@/features/booking/BookingTab";
import { TIME_SLOTS } from "@/features/booking/slots";
import { generateAmericanoRounds, generateMexicanoRound, generateRoundRobinRounds } from "@/features/league/schedule";
import {
  addGuestPlayer,
  appendRound,
  clearAllMatches,
  createBookingGroup,
  createClub,
  getBookings,
  getClub,
  getClubPlayers,
  getFirstClub,
  getMyClub,
  getRounds,
  joinBookingGroup,
  joinClubAsPlayer,
  removeBookingParticipant,
  removeClubMember,
  removeLastRound,
  replaceAllRounds,
  setClubPhotoUrl,
  setResultPhotoUrl,
  subscribeToClub,
  updateClub,
  updateMatchScore,
  uploadClubPhoto,
  uploadResultPhoto,
  type ClubPatch,
} from "@/lib/db";
import type { Amenities, Booking, ClubRow, League, LeagueFormat, Participant, Team } from "@/lib/types";
import { uid } from "@/lib/uid";
import { VENUES } from "./constants";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

const PHOTO_ERROR = "사진 저장에 실패했어요. 권한이 있는 계정인지 확인해 주세요.";

async function loadLeague(club: ClubRow): Promise<League> {
  const [players, rounds, bookings] = await Promise.all([
    getClubPlayers(club.id),
    getRounds(club.id),
    getBookings(club.id),
  ]);
  return {
    id: club.id,
    name: club.name,
    venue: club.venue,
    format: club.format as LeagueFormat,
    courtCount: club.court_count,
    amenities: (club.amenities || {}) as Amenities,
    photo: club.photo_url,
    resultPhoto: club.result_photo_url,
    players,
    teams: [], // round-robin pairing preview — session-local only, see README
    rounds,
    bookings,
    createdAt: club.created_at,
  };
}

/* The club being shown and every action that changes it. Changes apply to
   local state first, then save; a failed save raises `saveError`. */
export function useClub() {
  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [resultPhotoUploading, setResultPhotoUploading] = useState(false);

  const update = (changes: Partial<League> | ((prev: League) => Partial<League>)) =>
    setLeague((prev) => prev && { ...prev, ...(typeof changes === "function" ? changes(prev) : changes) });

  /* Runs a save against the loaded club; a failure shows the save-error notice. */
  const save = async (action: (league: League) => Promise<unknown>) => {
    if (!league) return;
    try {
      await action(league);
    } catch {
      setSaveError(true);
    }
  };

  /* ---------------------------------------------------------------
     Loading
  --------------------------------------------------------------- */

  /* Shows the signed-in member's own club (created on first use), or the
     first club for a logged-out visitor. `getMemberId` runs inside the
     loading state so the first paint waits for the session too. */
  const load = useCallback(async (getMemberId: () => Promise<string | null>) => {
    setLoading(true);
    try {
      const memberId = await getMemberId();
      const club = memberId
        ? ((await getMyClub(memberId)) ?? (await createClub(memberId, { venue: VENUES[0] })))
        : await getFirstClub();
      setLeague(club ? await loadLeague(club) : null);
    } catch {
      setLeague(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const reload = useCallback(async (clubId: string) => {
    const club = await getClub(clubId);
    if (club) setLeague(await loadLeague(club));
  }, []);

  /* After log-in: switch to the club this user belongs to, if any. */
  const showClubOf = useCallback(async (userId: string) => {
    const club = await getMyClub(userId);
    if (club) setLeague(await loadLeague(club));
  }, []);

  /* After sign-up: the new user joins the club on screen, or gets a club
     of their own when there is none yet. */
  const addMember = async (userId: string) => {
    if (!league) {
      const club = await createClub(userId, { venue: VENUES[0] });
      return reload(club.id);
    }
    // Best effort; RLS or a race is not fatal to the sign-up itself.
    await joinClubAsPlayer(league.id, userId).catch(() => {});
    return reload(league.id);
  };

  // Live sync: reflect other viewers' changes to this same club.
  const clubId = league?.id;
  useEffect(() => {
    if (!clubId) return undefined;
    return subscribeToClub(clubId, () => void reload(clubId));
  }, [clubId, reload]);

  /* ---------------------------------------------------------------
     Club settings and photos
  --------------------------------------------------------------- */

  /* Saves club settings, driving the header's save indicator. Resolves to
     whether the save succeeded. */
  const saveSettings = async (patch: ClubPatch) => {
    if (!league) return false;
    update(patch);
    setSaveStatus("saving");
    try {
      await updateClub(league.id, patch);
      setSaveError(false);
      setSaveStatus("saved");
      return true;
    } catch {
      setSaveError(true);
      setSaveStatus("error");
      return false;
    }
  };

  const changeFormat = async (format: LeagueFormat) => {
    if (!league || format === league.format) return;
    update({ rounds: [] });
    const saved = await saveSettings({ format });
    if (saved && format !== "round_robin") await save((l) => clearAllMatches(l.id));
  };

  const toggleAmenity = (key: string) => {
    if (league) void saveSettings({ amenities: { ...league.amenities, [key]: !league.amenities[key] } });
  };

  const uploadVenuePhoto = async (file: File) => {
    if (!league) return;
    setPhotoUploading(true);
    setPhotoError("");
    update({ photo: URL.createObjectURL(file) });
    try {
      update({ photo: await uploadClubPhoto(league.id, file) });
    } catch {
      setPhotoError(PHOTO_ERROR);
    } finally {
      setPhotoUploading(false);
    }
  };

  const setVenuePhotoUrl = async (url: string) => {
    if (!league) return;
    update({ photo: url });
    await setClubPhotoUrl(league.id, url).catch(() => setPhotoError(PHOTO_ERROR));
  };

  const uploadResult = async (file: File) => {
    setResultPhotoUploading(true);
    update({ resultPhoto: URL.createObjectURL(file) });
    await save(async (l) => update({ resultPhoto: await uploadResultPhoto(l.id, file) }));
    setResultPhotoUploading(false);
  };

  const setResultUrl = (url: string) => {
    update({ resultPhoto: url });
    return save((l) => setResultPhotoUrl(l.id, url));
  };

  /* ---------------------------------------------------------------
     Players and teams
  --------------------------------------------------------------- */

  const addPlayer = (name: string) =>
    save(async (l) => {
      const player = await addGuestPlayer(l.id, name);
      update((prev) => ({ players: [...prev.players, player] }));
    });

  const removePlayer = (id: string) => {
    update((prev) => ({
      players: prev.players.filter((p) => p.id !== id),
      teams: prev.teams.filter((t) => !t.playerIds.includes(id)),
    }));
    return save((l) => removeClubMember(l.id, id));
  };

  // Round-robin team pairing is a session-local preview only, kept in
  // React state and not yet written to Supabase — see README.md
  // ("알려진 제한사항").
  const autoAssignTeams = () =>
    update((prev) => {
      const shuffled = [...prev.players].sort(() => Math.random() - 0.5);
      const teams: Team[] = [];
      for (let i = 0; i < shuffled.length - 1; i += 2) {
        const pair = [shuffled[i], shuffled[i + 1]];
        teams.push({
          id: `team-${uid()}`,
          name: pair.map((p) => p.name).join(" & "),
          playerIds: pair.map((p) => p.id),
        });
      }
      return { teams };
    });

  /* ---------------------------------------------------------------
     Schedule
  --------------------------------------------------------------- */

  /* Re-reads the stored rounds, so matches carry their database ids
     (score edits are saved by match id). */
  const refreshRounds = async (id: string) => update({ rounds: await getRounds(id) });

  const generateSchedule = (numRounds: number) =>
    save(async (l) => {
      if (l.format === "round_robin") {
        // Not stored yet (team ids aren't real player ids) — local-only for this session.
        if (l.teams.length >= 2) update({ rounds: generateRoundRobinRounds(l.teams, l.courtCount) });
        return;
      }
      if (l.players.length < 4) return;
      if (l.format === "americano") {
        await replaceAllRounds(l.id, generateAmericanoRounds(l.players, l.courtCount, numRounds));
      } else {
        const first = generateMexicanoRound(l.players, [], l.courtCount);
        if (!first) return;
        await replaceAllRounds(l.id, [{ roundNumber: 1, ...first }]);
      }
      await refreshRounds(l.id);
    });

  const generateNextMexicanoRound = () =>
    save(async (l) => {
      const next = l.players.length >= 4 && generateMexicanoRound(l.players, l.rounds, l.courtCount);
      if (!next) return;
      await appendRound(l.id, { roundNumber: l.rounds.length + 1, ...next });
      await refreshRounds(l.id);
    });

  const removeLastMexicanoRound = () =>
    save(async (l) => {
      const last = l.rounds[l.rounds.length - 1];
      if (!last) return;
      await removeLastRound(l.id, last.roundNumber);
      update((prev) => ({ rounds: prev.rounds.slice(0, -1) }));
    });

  const updateScore = (roundIdx: number, matchId: string, field: "scoreA" | "scoreB", value: string) => {
    update((prev) => ({
      rounds: prev.rounds.map((round, ri) =>
        ri !== roundIdx
          ? round
          : { ...round, matches: round.matches.map((m) => (m.id === matchId ? { ...m, [field]: value } : m)) },
      ),
    }));
    if (league?.format === "round_robin") return; // local-only, see above
    return save(() => updateMatchScore(matchId, field, value));
  };

  const resetSeason = () =>
    save(async (l) => {
      await clearAllMatches(l.id);
      update({ rounds: [] });
    });

  /* ---------------------------------------------------------------
     Bookings
  --------------------------------------------------------------- */

  const refreshBookings = async (id: string) => update({ bookings: await getBookings(id) });

  const joinSlot = ({ date, time, court, category, duration, existing }: JoinRequest, participant: Participant) =>
    save(async (l) => {
      if (existing) {
        if (existing.players.length >= BOOKING_SLOTS_PER_MATCH) return;
        await joinBookingGroup(l.id, existing.groupId, participant);
      } else {
        const startIdx = TIME_SLOTS.indexOf(time);
        const times = Array.from({ length: duration }, (_, k) => TIME_SLOTS[startIdx + k]);
        await createBookingGroup(l.id, { court, date, times, category, participant });
      }
      await refreshBookings(l.id);
    });

  const removeParticipant = (booking: Booking, participantId: string) =>
    save(async (l) => {
      const player = booking.players.find((p) => p.id === participantId);
      if (!player) return;
      // A club member is removed by profile id, a guest by the name they were added with.
      const isMember = l.players.some((p) => p.id === participantId);
      await removeBookingParticipant(
        l.id,
        booking.groupId,
        isMember ? { profileId: participantId } : { name: player.name },
      );
      await refreshBookings(l.id);
    });

  return {
    league,
    loading,
    saveError,
    saveStatus,
    photoUploading,
    photoError,
    resultPhotoUploading,
    load,
    showClubOf,
    addMember,
    saveSettings,
    changeFormat,
    toggleAmenity,
    uploadVenuePhoto,
    setVenuePhotoUrl,
    uploadResultPhoto: uploadResult,
    setResultPhotoUrl: setResultUrl,
    addPlayer,
    removePlayer,
    autoAssignTeams,
    generateSchedule,
    generateNextMexicanoRound,
    removeLastMexicanoRound,
    updateScore,
    resetSeason,
    joinSlot,
    removeParticipant,
  };
}
