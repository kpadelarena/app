import type { Tables, TablesUpdate } from "./database.types";
import { supabase } from "./supabaseClient";
import type {
  Amenities,
  Booking,
  BookingKind,
  Contact,
  League,
  LeagueFormat,
  LeagueSummary,
  Match,
  Member,
  MyBooking,
  MyMatch,
  Role,
  Round,
  Team,
  Venue,
  Visibility,
} from "./types";

/* =====================================================================
   Image helpers — resize in the browser before upload so a phone photo
   doesn't become a multi-MB Storage object.
   ===================================================================== */
export function resizeImageToBlob(file: File, maxWidth = 1000, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("파일을 읽지 못했습니다"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas unavailable"));
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/jpeg", quality);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/* Resizes `file`, stores it at `path` in `bucket`, and returns its public URL. */
async function uploadPhoto(bucket: string, path: string, file: File, maxWidth: number) {
  const blob = await resizeImageToBlob(file, maxWidth);
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    upsert: true,
    contentType: "image/jpeg",
  });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/* =====================================================================
   Members
   ===================================================================== */
export const toMember = (row: Tables<"profiles">): Member => ({
  id: row.id,
  name: row.display_name,
  level: row.level,
  photo: row.photo_url,
  role: row.role,
});

export async function getMembers(): Promise<Member[]> {
  const { data, error } = await supabase.from("profiles").select("*").order("display_name");
  if (error) throw error;
  return data.map(toMember);
}

async function updateProfile(profileId: string, patch: TablesUpdate<"profiles">) {
  const { error } = await supabase.from("profiles").update(patch).eq("id", profileId);
  if (error) throw error;
}

export async function uploadAvatar(profileId: string, file: File) {
  const url = await uploadPhoto("avatars", `${profileId}/avatar-${Date.now()}.jpg`, file, 500);
  await updateProfile(profileId, { photo_url: url });
  return url;
}

export const setAvatarUrl = (profileId: string, url: string) => updateProfile(profileId, { photo_url: url });

export const updateProfileLevel = (profileId: string, level: number) => updateProfile(profileId, { level });

/* Only the person (or an admin) may change it; phone is the only writable column. */
export async function updateContactPhone(profileId: string, phone: string | null) {
  const { error } = await supabase.from("profile_contacts").update({ phone }).eq("id", profileId);
  if (error) throw error;
}

/* Owners only; the database also keeps the last owner in place. */
export const updateMemberRole = (profileId: string, role: Role) => updateProfile(profileId, { role });

/* Contact details by member id. Row-level security returns only the
   caller's own row unless they are an admin. */
export async function getContacts(): Promise<Record<string, Contact>> {
  const { data, error } = await supabase.from("profile_contacts").select("id, email, phone");
  if (error) throw error;
  return Object.fromEntries(data.map((c) => [c.id, { email: c.email, phone: c.phone }]));
}

/* =====================================================================
   Venues and courts
   ===================================================================== */
const toVenue = (row: Tables<"venues"> & { courts: Tables<"courts">[] }): Venue => ({
  id: row.id,
  name: row.name,
  address: row.address,
  timezone: row.timezone,
  openTime: row.open_time.slice(0, 5),
  closeTime: row.close_time.slice(0, 5),
  maxPlayers: row.max_players,
  amenities: (row.amenities || {}) as Amenities,
  photo: row.photo_url,
  courts: row.courts
    .filter((c) => c.active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => ({ id: c.id, name: c.name })),
});

export async function getVenues(): Promise<Venue[]> {
  const { data, error } = await supabase.from("venues").select("*, courts(*)").order("sort_order");
  if (error) throw error;
  return data.map(toVenue);
}

export interface NewVenue {
  name: string;
  address: string | null;
  sortOrder: number;
}

/* Admins only. Hours, capacity and timezone take the schema defaults.
   Resolves to the new venue's id. */
export async function createVenue({ name, address, sortOrder }: NewVenue) {
  const { data, error } = await supabase
    .from("venues")
    .insert({ name, address, sort_order: sortOrder })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export interface VenuePatch {
  name?: string;
  address?: string | null;
  /** "HH:MM" at the venue. */
  openTime?: string;
  closeTime?: string;
  maxPlayers?: number;
  amenities?: Amenities;
  photoUrl?: string;
}

export async function updateVenue(venueId: string, patch: VenuePatch) {
  const row: TablesUpdate<"venues"> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.address !== undefined) row.address = patch.address;
  if (patch.openTime !== undefined) row.open_time = patch.openTime;
  if (patch.closeTime !== undefined) row.close_time = patch.closeTime;
  if (patch.maxPlayers !== undefined) row.max_players = patch.maxPlayers;
  if (patch.amenities !== undefined) row.amenities = patch.amenities;
  if (patch.photoUrl !== undefined) row.photo_url = patch.photoUrl;
  const { error } = await supabase.from("venues").update(row).eq("id", venueId);
  if (error) throw error;
}

/* Courts and bookings go with it; refused while league events exist. */
export async function deleteVenue(venueId: string) {
  const { error } = await supabase.from("venues").delete().eq("id", venueId);
  if (error) throw error;
}

/* A hidden court with the same name comes back instead of a duplicate. */
export async function addCourt(venueId: string, name: string, sortOrder: number) {
  const { error } = await supabase
    .from("courts")
    .upsert({ venue_id: venueId, name, sort_order: sortOrder, active: true }, { onConflict: "venue_id,name" });
  if (error) throw error;
}

/* Hides the court; its past bookings stay on record. */
export async function removeCourt(courtId: string) {
  const { error } = await supabase.from("courts").update({ active: false }).eq("id", courtId);
  if (error) throw error;
}

export async function uploadVenuePhoto(venueId: string, file: File) {
  const url = await uploadPhoto("venue-photos", `${venueId}/photo-${Date.now()}.jpg`, file, 1200);
  await updateVenue(venueId, { photoUrl: url });
  return url;
}

/* =====================================================================
   Bookings — one row per booking on one court, with its participants.
   ===================================================================== */

// `created_by` is deliberately not selected: logged-out visitors may not
// read it, and the participant list already says who is playing.
const BOOKING_COLUMNS =
  "id, court_id, starts_at, ends_at, kind, visibility, booking_participants(id, profile_id, guest_name, added_by, profiles!booking_participants_profile_id_fkey(display_name))";

type BookingRow = {
  id: string;
  court_id: string;
  starts_at: string;
  ends_at: string;
  kind: BookingKind;
  visibility: Visibility;
  booking_participants: {
    id: string;
    profile_id: string | null;
    guest_name: string | null;
    added_by: string | null;
    profiles: { display_name: string } | null;
  }[];
};

const toBooking = (row: BookingRow): Booking => ({
  id: row.id,
  courtId: row.court_id,
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  kind: row.kind,
  visibility: row.visibility,
  participants: row.booking_participants.map((p) => ({
    id: p.id,
    profileId: p.profile_id,
    name: p.profiles?.display_name || p.guest_name || "게스트",
    isGuest: !p.profile_id,
    addedBy: p.added_by,
  })),
});

/* Bookings on the venue's courts that overlap [from, to). */
export async function getBookings(venue: Venue, from: Date, to: Date): Promise<Booking[]> {
  const courtIds = venue.courts.map((c) => c.id);
  if (courtIds.length === 0) return [];
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_COLUMNS)
    .in("court_id", courtIds)
    .lt("starts_at", to.toISOString())
    .gt("ends_at", from.toISOString())
    .order("starts_at");
  if (error) throw error;
  return data.map(toBooking);
}

export interface NewBooking {
  courtId: string;
  startsAt: Date;
  endsAt: Date;
  kind: BookingKind;
  visibility: Visibility;
}

/* The creator becomes the first participant (database trigger). */
export async function createBooking({ courtId, startsAt, endsAt, kind, visibility }: NewBooking, createdBy: string) {
  const { error } = await supabase.from("bookings").insert({
    court_id: courtId,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    kind,
    visibility,
    created_by: createdBy,
  });
  if (error) throw error;
}

export interface BookingPatch {
  startsAt?: Date;
  endsAt?: Date;
  kind?: BookingKind;
  visibility?: Visibility;
}

/* Admins only (row-level security). Overlaps are rejected by the database. */
export async function updateBooking(bookingId: string, patch: BookingPatch) {
  const row: TablesUpdate<"bookings"> = {};
  if (patch.startsAt) row.starts_at = patch.startsAt.toISOString();
  if (patch.endsAt) row.ends_at = patch.endsAt.toISOString();
  if (patch.kind) row.kind = patch.kind;
  if (patch.visibility) row.visibility = patch.visibility;
  const { error } = await supabase.from("bookings").update(row).eq("id", bookingId);
  if (error) throw error;
}

/* Admins only; participants go with it. */
export async function deleteBooking(bookingId: string) {
  const { error } = await supabase.from("bookings").delete().eq("id", bookingId);
  if (error) throw error;
}

export type Who = { profileId: string } | { guestName: string };

export async function addParticipant(bookingId: string, who: Who, addedBy: string) {
  const { error } = await supabase.from("booking_participants").insert({
    booking_id: bookingId,
    profile_id: "profileId" in who ? who.profileId : null,
    guest_name: "guestName" in who ? who.guestName : null,
    added_by: addedBy,
  });
  if (error) throw error;
}

/* Removing the last participant deletes the booking (database trigger). */
export async function removeParticipant(participantId: string) {
  const { error } = await supabase.from("booking_participants").delete().eq("id", participantId);
  if (error) throw error;
}

/* The signed-in member's upcoming bookings, at any venue. */
export async function getMyBookings(profileId: string, from: Date): Promise<MyBooking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("id, starts_at, ends_at, kind, booking_participants!inner(id, profile_id), courts(name, venues(name))")
    .eq("booking_participants.profile_id", profileId)
    .gt("ends_at", from.toISOString())
    .order("starts_at");
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    participantId: row.booking_participants[0]?.id ?? "",
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    kind: row.kind,
    courtName: row.courts?.name ?? "?",
    venueName: row.courts?.venues?.name ?? "?",
  }));
}

/* =====================================================================
   League events
   ===================================================================== */
export async function getLeagues(venueId: string): Promise<LeagueSummary[]> {
  const { data, error } = await supabase
    .from("leagues")
    .select("*, league_players(count)")
    .eq("venue_id", venueId)
    .order("event_date", { ascending: false });
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    venueId: row.venue_id,
    name: row.name,
    format: row.format,
    eventDate: row.event_date,
    courtCount: row.court_count,
    playerCount: row.league_players[0]?.count ?? 0,
  }));
}

export interface NewLeague {
  venueId: string;
  name: string;
  format: LeagueFormat;
  eventDate: string;
  courtCount: number;
}

/* Admins only. Resolves to the new event's id. */
export async function createLeague({ venueId, name, format, eventDate, courtCount }: NewLeague, createdBy: string) {
  const { data, error } = await supabase
    .from("leagues")
    .insert({ venue_id: venueId, name, format, event_date: eventDate, court_count: courtCount, created_by: createdBy })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export interface LeaguePatch {
  name?: string;
  format?: LeagueFormat;
  eventDate?: string;
  courtCount?: number;
  resultPhotoUrl?: string;
}

export async function updateLeague(leagueId: string, patch: LeaguePatch) {
  const row: TablesUpdate<"leagues"> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.format !== undefined) row.format = patch.format;
  if (patch.eventDate !== undefined) row.event_date = patch.eventDate;
  if (patch.courtCount !== undefined) row.court_count = patch.courtCount;
  if (patch.resultPhotoUrl !== undefined) row.result_photo_url = patch.resultPhotoUrl;
  const { error } = await supabase.from("leagues").update(row).eq("id", leagueId);
  if (error) throw error;
}

/* Roster, teams and matches go with it. */
export async function deleteLeague(leagueId: string) {
  const { error } = await supabase.from("leagues").delete().eq("id", leagueId);
  if (error) throw error;
}

const toMatch = (row: Tables<"matches">): Match => ({
  id: row.id,
  court: row.court_number,
  sideA: row.side_a,
  sideB: row.side_b,
  scoreA: row.score_a === null ? "" : String(row.score_a),
  scoreB: row.score_b === null ? "" : String(row.score_b),
});

/* Groups flat match rows into rounds, in order. */
function toRounds(rows: Tables<"matches">[]): Round[] {
  const byRound = new Map<number, Round>();
  for (const row of [...rows].sort((a, b) => a.round_number - b.round_number || a.court_number - b.court_number)) {
    let round = byRound.get(row.round_number);
    if (!round) {
      round = { roundNumber: row.round_number, matches: [], sitOut: row.sit_out };
      byRound.set(row.round_number, round);
    }
    round.matches.push(toMatch(row));
  }
  return [...byRound.values()];
}

const LEAGUE_COLUMNS =
  "*, league_players(id, profile_id, guest_name, created_at, profiles(display_name)), league_teams(*), matches(*)";

/* The event with its roster, teams and matches. Roster and matches are
   empty for logged-out visitors, who may not read them. */
export async function getLeague(leagueId: string): Promise<League | null> {
  const { data, error } = await supabase.from("leagues").select(LEAGUE_COLUMNS).eq("id", leagueId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    venueId: data.venue_id,
    name: data.name,
    format: data.format,
    eventDate: data.event_date,
    courtCount: data.court_count,
    resultPhoto: data.result_photo_url,
    players: [...data.league_players]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((p) => ({
        id: p.id,
        name: p.profiles?.display_name || p.guest_name || "?",
        isGuest: !p.profile_id,
        profileId: p.profile_id,
      })),
    teams: data.league_teams.map((t) => ({ id: t.id, name: t.name, playerIds: t.player_ids })),
    rounds: toRounds(data.matches),
  };
}

export async function addLeaguePlayer(leagueId: string, who: Who) {
  const { error } = await supabase.from("league_players").insert({
    league_id: leagueId,
    profile_id: "profileId" in who ? who.profileId : null,
    guest_name: "guestName" in who ? who.guestName : null,
  });
  if (error) throw error;
}

export async function removeLeaguePlayer(leaguePlayerId: string) {
  const { error } = await supabase.from("league_players").delete().eq("id", leaguePlayerId);
  if (error) throw error;
}

/* Replaces the round-robin teams. Existing matches refer to the old
   team ids, so they are cleared too. */
export async function setLeagueTeams(leagueId: string, teams: Pick<Team, "name" | "playerIds">[]) {
  await clearMatches(leagueId);
  const { error: delErr } = await supabase.from("league_teams").delete().eq("league_id", leagueId);
  if (delErr) throw delErr;
  if (teams.length === 0) return;
  const { error } = await supabase
    .from("league_teams")
    .insert(teams.map((t) => ({ league_id: leagueId, name: t.name, player_ids: t.playerIds })));
  if (error) throw error;
}

const scoreToColumn = (score: string) => (score === "" ? null : Number(score));

const toMatchRows = (leagueId: string, round: Round) =>
  round.matches.map((m) => ({
    league_id: leagueId,
    round_number: round.roundNumber,
    court_number: m.court,
    side_a: m.sideA,
    side_b: m.sideB,
    score_a: scoreToColumn(m.scoreA),
    score_b: scoreToColumn(m.scoreB),
    sit_out: round.sitOut ?? [],
  }));

/* Replaces the whole schedule. */
export async function replaceMatches(leagueId: string, rounds: Round[]) {
  await clearMatches(leagueId);
  if (rounds.length === 0) return;
  const { error } = await supabase.from("matches").insert(rounds.flatMap((r) => toMatchRows(leagueId, r)));
  if (error) throw error;
}

/* Appends one round (Mexicano). */
export async function appendMatches(leagueId: string, round: Round) {
  const { error } = await supabase.from("matches").insert(toMatchRows(leagueId, round));
  if (error) throw error;
}

export async function removeRound(leagueId: string, roundNumber: number) {
  const { error } = await supabase.from("matches").delete().eq("league_id", leagueId).eq("round_number", roundNumber);
  if (error) throw error;
}

export async function clearMatches(leagueId: string) {
  const { error } = await supabase.from("matches").delete().eq("league_id", leagueId);
  if (error) throw error;
}

/* Players in the match and admins may do this (row-level security). */
export async function updateMatchScore(matchId: string, field: "scoreA" | "scoreB", value: string) {
  const score = scoreToColumn(value);
  const { error } = await supabase
    .from("matches")
    .update(field === "scoreA" ? { score_a: score } : { score_b: score })
    .eq("id", matchId);
  if (error) throw error;
}

export async function uploadResultPhoto(leagueId: string, file: File) {
  const url = await uploadPhoto("result-photos", `${leagueId}/result-${Date.now()}.jpg`, file, 1400);
  await updateLeague(leagueId, { resultPhotoUrl: url });
  return url;
}

/* The signed-in member's matches in upcoming events, at any venue. */
export async function getMyMatches(profileId: string, fromDate: string): Promise<MyMatch[]> {
  const { data: entries, error } = await supabase
    .from("league_players")
    .select("id, league_id, leagues!inner(name, event_date, venues(name))")
    .eq("profile_id", profileId)
    .gte("leagues.event_date", fromDate);
  if (error) throw error;

  const leagues = await Promise.all(entries.map((e) => getLeague(e.league_id)));
  const out: MyMatch[] = [];
  entries.forEach((entry, i) => {
    const league = leagues[i];
    if (!league) return;
    const nameOf = (id: string) =>
      league.players.find((p) => p.id === id)?.name ?? league.teams.find((t) => t.id === id)?.name ?? "?";
    // A side holds player ids, or a single team id for round-robin.
    const isMine = (side: string[]) =>
      side.includes(entry.id) || league.teams.some((t) => t.id === side[0] && t.playerIds.includes(entry.id));
    for (const round of league.rounds) {
      for (const m of round.matches) {
        const onA = isMine(m.sideA);
        if (!onA && !isMine(m.sideB)) continue;
        out.push({
          id: m.id,
          leagueName: entry.leagues.name,
          eventDate: entry.leagues.event_date,
          venueName: entry.leagues.venues?.name ?? "?",
          roundNumber: round.roundNumber,
          court: m.court,
          opponents: (onA ? m.sideB : m.sideA).map(nameOf),
          scoreA: m.scoreA,
          scoreB: m.scoreB,
        });
      }
    }
  });
  return out.sort((a, b) => a.eventDate.localeCompare(b.eventDate) || a.roundNumber - b.roundNumber);
}

/* =====================================================================
   Realtime — reload whenever bookings, venues or leagues change anywhere.
   ===================================================================== */
export function subscribeToChanges(onChange: () => void) {
  let channel = supabase.channel("club-changes");
  for (const table of [
    "venues",
    "courts",
    "bookings",
    "booking_participants",
    "leagues",
    "league_players",
    "league_teams",
    "matches",
  ]) {
    channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, onChange);
  }
  channel.subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
