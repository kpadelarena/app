import { useCallback, useEffect, useState } from "react";
import { DAYS_AHEAD } from "@/features/booking/constants";
import { addHours, toInstant, zonedDate } from "@/features/booking/slots";
import {
  addParticipant,
  createBooking,
  getBookings,
  getVenues,
  removeParticipant,
  subscribeToChanges,
  updateVenue,
  uploadVenuePhoto,
  type NewBooking,
  type Who,
} from "@/lib/db";
import type { Booking, Venue } from "@/lib/types";

const PHOTO_ERROR = "사진 저장에 실패했어요. 권한이 있는 계정인지 확인해 주세요.";

/* The venues, the one on screen, and its bookings for the coming days.
   Changes apply through the database and then re-read; a failed save
   raises `saveError`. */
export function useVenues(memberId: string | null) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");

  const venue = venues.find((v) => v.id === venueId) ?? venues[0] ?? null;

  const loadVenues = useCallback(async () => {
    try {
      setVenues(await getVenues());
    } catch {
      setVenues([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBookings = useCallback(async (v: Venue) => {
    const from = toInstant(zonedDate(new Date(), v.timezone), "00:00", v.timezone);
    setBookings(await getBookings(v, from, addHours(from, 24 * DAYS_AHEAD)).catch(() => []));
  }, []);

  useEffect(() => {
    void loadVenues();
    // Live sync: any change to venues or bookings re-reads everything.
    return subscribeToChanges(() => void loadVenues());
  }, [loadVenues]);

  // Re-read on sign-in/out too: participants are only visible to members.
  useEffect(() => {
    if (venue) void loadBookings(venue);
    else setBookings([]);
  }, [venue, memberId, loadBookings]);

  /* Runs a save, then re-reads the venue's bookings. */
  const save = async (action: () => Promise<unknown>) => {
    if (!venue) return;
    try {
      await action();
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
    await loadBookings(venue);
  };

  const patchVenue = (changes: Partial<Venue>) =>
    setVenues((prev) => prev.map((v) => (v.id === venue?.id ? { ...v, ...changes } : v)));

  return {
    venues,
    venue,
    bookings,
    loading,
    saveError,
    photoUploading,
    photoError,
    selectVenue: setVenueId,

    createBooking: (input: NewBooking) => memberId && save(() => createBooking(input, memberId)),
    joinBooking: (bookingId: string, who: Who) => memberId && save(() => addParticipant(bookingId, who, memberId)),
    leaveBooking: (participantId: string) => save(() => removeParticipant(participantId)),

    toggleAmenity: (key: string) => {
      if (!venue) return;
      const amenities = { ...venue.amenities, [key]: !venue.amenities[key] };
      patchVenue({ amenities });
      void save(() => updateVenue(venue.id, { amenities }));
    },
    uploadVenuePhoto: async (file: File) => {
      if (!venue) return;
      setPhotoUploading(true);
      setPhotoError("");
      patchVenue({ photo: URL.createObjectURL(file) });
      try {
        patchVenue({ photo: await uploadVenuePhoto(venue.id, file) });
      } catch {
        setPhotoError(PHOTO_ERROR);
      } finally {
        setPhotoUploading(false);
      }
    },
    setVenuePhotoUrl: (url: string) => {
      if (!venue) return;
      patchVenue({ photo: url });
      updateVenue(venue.id, { photoUrl: url }).catch(() => setPhotoError(PHOTO_ERROR));
    },
  };
}
