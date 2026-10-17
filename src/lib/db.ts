import { supabase } from "./supabaseClient";
import type { TablesUpdate } from "./database.types";
import type {
  Amenities,
  Booking,
  BookingCategory,
  ClubRow,
  LeagueFormat,
  Participant,
  Player,
  Role,
  Round,
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

async function updateProfileRow(profileId: string, patch: TablesUpdate<"profiles">) {
  const { error } = await supabase.from("profiles").update(patch).eq("id", profileId);
  if (error) throw error;
}

async function updateClubRow(clubId: string, patch: TablesUpdate<"clubs">) {
  const { error } = await supabase.from("clubs").update(patch).eq("id", clubId);
  if (error) throw error;
}

export async function uploadAvatar(profileId: string, file: File) {
  const url = await uploadPhoto("avatars", `${profileId}/avatar-${Date.now()}.jpg`, file, 500);
  await setAvatarUrl(profileId, url);
  return url;
}

export const setAvatarUrl = (profileId: string, url: string) => updateProfileRow(profileId, { photo_url: url });

export const updateProfileLevel = (profileId: string, level: number) => updateProfileRow(profileId, { level });

export async function uploadClubPhoto(clubId: string, file: File) {
  const url = await uploadPhoto("club-photos", `${clubId}/banner-${Date.now()}.jpg`, file, 1200);
  await setClubPhotoUrl(clubId, url);
  return url;
}

export async function uploadResultPhoto(clubId: string, file: File) {
  const url = await uploadPhoto("result-photos", `${clubId}/result-${Date.now()}.jpg`, file, 1400);
  await setResultPhotoUrl(clubId, url);
  return url;
}

export const setClubPhotoUrl = (clubId: string, url: string) => updateClubRow(clubId, { photo_url: url });

export const setResultPhotoUrl = (clubId: string, url: string) => updateClubRow(clubId, { result_photo_url: url });

export async function uploadCourtPhoto(clubId: string, courtNumber: number, file: File) {
  const url = await uploadPhoto("court-photos", `${clubId}/court-${courtNumber}-${Date.now()}.jpg`, file, 900);
  const { error } = await supabase
    .from("courts")
    .upsert({ club_id: clubId, court_number: courtNumber, photo_url: url }, { onConflict: "club_id,court_number" });
  if (error) throw error;
  return url;
}

/* =====================================================================
   Club: load-or-create "my" club, and field updates.
   ===================================================================== */
export async function getMyClub(profileId: string): Promise<ClubRow | null> {
  const { data: membership, error: memErr } = await supabase
    .from("club_members")
    .select("club_id")
    .eq("profile_id", profileId)
    .limit(1)
    .maybeSingle();
  if (memErr) throw memErr;
  if (!membership) return null;

  const { data: club, error } = await supabase.from("clubs").select("*").eq("id", membership.club_id).single();
  if (error) throw error;
  return club;
}

export async function createClub(profileId: string, { venue }: { venue: string }): Promise<ClubRow> {
  const { data: club, error } = await supabase
    .from("clubs")
    .insert({ name: "새 리그", venue, owner_id: profileId })
    .select()
    .single();
  if (error) throw error;

  const { error: memErr } = await supabase
    .from("club_members")
    .insert({ club_id: club.id, profile_id: profileId, role: "owner" });
  if (memErr) throw memErr;

  return club;
}

export interface ClubPatch {
  name?: string;
  venue?: string;
  format?: LeagueFormat;
  courtCount?: number;
  amenities?: Amenities;
}

export function updateClub(clubId: string, patch: ClubPatch) {
  // camelCase app fields -> snake_case columns
  const row: TablesUpdate<"clubs"> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.venue !== undefined) row.venue = patch.venue;
  if (patch.format !== undefined) row.format = patch.format;
  if (patch.courtCount !== undefined) row.court_count = patch.courtCount;
  if (patch.amenities !== undefined) row.amenities = patch.amenities;
  return updateClubRow(clubId, row);
}

/* =====================================================================
   Players (club_members + profiles) and self-service join/leave.
   ===================================================================== */
export async function getClubPlayers(clubId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from("club_members")
    .select("id, profile_id, guest_name, role, profiles(id, display_name, level, photo_url)")
    .eq("club_id", clubId);
  if (error) throw error;
  return data.map((row) => ({
    id: row.profile_id || row.id,
    name: row.profiles?.display_name || row.guest_name || "?",
    role: row.role as Role,
    level: row.profiles?.level,
    photo: row.profiles?.photo_url,
    isGuest: !row.profile_id,
  }));
}

export async function addGuestPlayer(clubId: string, name: string): Promise<Player> {
  const { data, error } = await supabase
    .from("club_members")
    .insert({ club_id: clubId, guest_name: name, role: "player" })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, name };
}

export async function removeClubMember(clubId: string, memberIdOrProfileId: string) {
  const { error } = await supabase
    .from("club_members")
    .delete()
    .eq("club_id", clubId)
    .or(`profile_id.eq.${memberIdOrProfileId},id.eq.${memberIdOrProfileId}`);
  if (error) throw error;
}

export async function joinClubAsPlayer(clubId: string, profileId: string) {
  const { error } = await supabase
    .from("club_members")
    .upsert(
      { club_id: clubId, profile_id: profileId, role: "player" },
      { onConflict: "club_id,profile_id", ignoreDuplicates: true },
    );
  if (error) throw error;
}

/* =====================================================================
   Matches (rounds). Rounds are grouped client-side from flat match rows.
   ===================================================================== */
const scoreToColumn = (score: string) => (score === "" ? null : Number(score));

const toMatchRows = (clubId: string, round: Round) =>
  round.matches.map((m) => ({
    club_id: clubId,
    round_number: round.roundNumber,
    court_number: m.court,
    side_a_ids: m.sideA,
    side_b_ids: m.sideB,
    score_a: scoreToColumn(m.scoreA),
    score_b: scoreToColumn(m.scoreB),
    sit_out_ids: round.sitOut || [],
  }));

export async function getRounds(clubId: string): Promise<Round[]> {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("club_id", clubId)
    .order("round_number", { ascending: true })
    .order("court_number", { ascending: true });
  if (error) throw error;

  const byRound = new Map<number, Round>();
  for (const row of data) {
    let round = byRound.get(row.round_number);
    if (!round) {
      round = { roundNumber: row.round_number, matches: [], sitOut: row.sit_out_ids || [] };
      byRound.set(row.round_number, round);
    }
    round.matches.push({
      id: row.id,
      court: row.court_number,
      sideA: row.side_a_ids,
      sideB: row.side_b_ids,
      scoreA: row.score_a === null ? "" : String(row.score_a),
      scoreB: row.score_b === null ? "" : String(row.score_b),
    });
  }
  return Array.from(byRound.values());
}

/* Replaces the ENTIRE schedule — used by "대진표 생성/다시 생성"
   (Americano upfront, or round-robin). */
export async function replaceAllRounds(clubId: string, rounds: Round[]) {
  await clearAllMatches(clubId);
  if (rounds.length === 0) return;

  const { error } = await supabase.from("matches").insert(rounds.flatMap((round) => toMatchRows(clubId, round)));
  if (error) throw error;
}

/* Appends ONE round — used by Mexicano's "다음 라운드 생성". */
export async function appendRound(clubId: string, round: Round) {
  const { error } = await supabase.from("matches").insert(toMatchRows(clubId, round));
  if (error) throw error;
}

/* Removes the highest-numbered round — used by Mexicano's "마지막 라운드 취소". */
export async function removeLastRound(clubId: string, roundNumber: number) {
  const { error } = await supabase.from("matches").delete().eq("club_id", clubId).eq("round_number", roundNumber);
  if (error) throw error;
}

/* Clears all matches for a club — used by "새 시즌으로 초기화". Never
   deletes the club, its members, or their profiles. */
export async function clearAllMatches(clubId: string) {
  const { error } = await supabase.from("matches").delete().eq("club_id", clubId);
  if (error) throw error;
}

export async function updateMatchScore(matchId: string, field: "scoreA" | "scoreB", value: string) {
  const score = scoreToColumn(value);
  const { error } = await supabase
    .from("matches")
    .update(field === "scoreA" ? { score_a: score } : { score_b: score })
    .eq("id", matchId);
  if (error) throw error;
}

/* =====================================================================
   Bookings — one row per hour; a multi-hour reservation shares group_id.
   ===================================================================== */
export async function getBookings(clubId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*, booking_participants(id, profile_id, guest_name, profiles(display_name))")
    .eq("club_id", clubId);
  if (error) throw error;

  return data.map((row) => ({
    id: row.id,
    groupId: row.group_id,
    court: row.court_number,
    date: row.booking_date,
    time: row.booking_time.slice(0, 5),
    category: row.category as BookingCategory,
    players: row.booking_participants.map((p) => ({
      id: p.profile_id || p.id,
      name: p.profiles?.display_name || p.guest_name || "게스트",
    })),
  }));
}

/* Ids of every hourly booking row sharing a group_id. */
async function getGroupBookingIds(clubId: string, groupId: string): Promise<string[]> {
  const { data, error } = await supabase.from("bookings").select("id").eq("club_id", clubId).eq("group_id", groupId);
  if (error) throw error;
  return data.map((b) => b.id);
}

/* Adds `participant` to each of the given booking rows. */
async function addParticipant(bookingIds: string[], participant: Participant) {
  const rows = bookingIds.map((bookingId) => ({
    booking_id: bookingId,
    profile_id: participant.profileId || null,
    guest_name: participant.profileId ? null : participant.name,
  }));
  const { error } = await supabase.from("booking_participants").insert(rows);
  if (error) throw error;
}

export interface NewBookingGroup {
  court: number;
  date: string;
  times: string[];
  category: BookingCategory;
  participant: Participant;
}

/* Creates a new multi-hour booking group with the first participant. */
export async function createBookingGroup(
  clubId: string,
  { court, date, times, category, participant }: NewBookingGroup,
) {
  const groupId = crypto.randomUUID();
  const rows = times.map((time) => ({
    club_id: clubId,
    court_number: court,
    booking_date: date,
    booking_time: time,
    category,
    group_id: groupId,
  }));
  const { data: inserted, error } = await supabase.from("bookings").insert(rows).select();
  if (error) throw error;

  await addParticipant(
    inserted.map((b) => b.id),
    participant,
  );
  return groupId;
}

/* Adds a participant to every booking row sharing a group_id. */
export async function joinBookingGroup(clubId: string, groupId: string, participant: Participant) {
  await addParticipant(await getGroupBookingIds(clubId, groupId), participant);
}

/* Removes one participant from every hour of their group — mirrors the
   old "remove from this slot" behavior, but across the whole multi-hour
   reservation. A member is matched by profile id, a guest by name. */
export async function removeBookingParticipant(
  clubId: string,
  groupId: string,
  participantMatch: { profileId: string } | { name: string },
) {
  const bookingIds = await getGroupBookingIds(clubId, groupId);
  if (bookingIds.length === 0) return;

  const query = supabase.from("booking_participants").delete().in("booking_id", bookingIds);
  const { error } = await ("profileId" in participantMatch
    ? query.eq("profile_id", participantMatch.profileId)
    : query.eq("guest_name", participantMatch.name));
  if (error) throw error;
}

/* =====================================================================
   Realtime — live updates across everyone viewing the same club.
   ===================================================================== */
/* Tables to watch, with the column that holds the club id in each. */
const CLUB_TABLES = {
  clubs: "id",
  matches: "club_id",
  bookings: "club_id",
  club_members: "club_id",
  courts: "club_id",
};

export function subscribeToClub(clubId: string, onChange: () => void) {
  let channel = supabase.channel(`club-${clubId}`);
  for (const [table, column] of Object.entries(CLUB_TABLES)) {
    channel = channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table, filter: `${column}=eq.${clubId}` },
      onChange,
    );
  }
  channel.subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
