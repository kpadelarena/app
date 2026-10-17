import type { Tables, TablesUpdate } from "./database.types";
import { supabase } from "./supabaseClient";
import type { Amenities, Booking, BookingKind, Member, MyBooking, Venue, Visibility } from "./types";

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

export interface VenuePatch {
  amenities?: Amenities;
  photoUrl?: string;
}

export async function updateVenue(venueId: string, patch: VenuePatch) {
  const row: TablesUpdate<"venues"> = {};
  if (patch.amenities !== undefined) row.amenities = patch.amenities;
  if (patch.photoUrl !== undefined) row.photo_url = patch.photoUrl;
  const { error } = await supabase.from("venues").update(row).eq("id", venueId);
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
   Realtime — reload whenever bookings or venues change anywhere.
   ===================================================================== */
export function subscribeToChanges(onChange: () => void) {
  let channel = supabase.channel("club-changes");
  for (const table of ["venues", "courts", "bookings", "booking_participants"]) {
    channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, onChange);
  }
  channel.subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
