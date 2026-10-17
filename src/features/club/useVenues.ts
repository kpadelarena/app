import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { DAYS_AHEAD } from "@/features/booking/constants";
import { addHours, toInstant, zonedDate } from "@/features/booking/slots";
import {
  addCourt,
  addParticipant,
  createBooking,
  createVenue,
  deleteBooking,
  deleteVenue,
  getBookings,
  getVenues,
  removeCourt,
  removeParticipant,
  subscribeToChanges,
  updateBooking,
  updateVenue,
  uploadVenuePhoto,
  type BookingPatch,
  type NewBooking,
  type NewVenue,
  type VenuePatch,
  type Who,
} from "@/lib/db";
import { queryKeys } from "@/lib/queryKeys";
import type { Venue } from "@/lib/types";

const PHOTO_ERROR = "사진 저장에 실패했어요. 권한이 있는 계정인지 확인해 주세요.";

/* The venues, the one on screen, and its bookings for the coming days.
   Writes go to the database and then invalidate what they changed; a
   failed write raises `saveError`. */
export function useVenues(memberId: string | null) {
  const queryClient = useQueryClient();
  const [venueId, setVenueId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");

  const venuesQuery = useQuery({ queryKey: queryKeys.venues, queryFn: getVenues });
  const venues = venuesQuery.data ?? [];
  const venue = venues.find((v) => v.id === venueId) ?? venues[0] ?? null;

  // The calendar starts at today's midnight at the venue; the key changes
  // once a day, so a tab left open rolls over on its own.
  const from = venue ? toInstant(zonedDate(new Date(), venue.timezone), "00:00", venue.timezone) : null;
  const bookingsQuery = useQuery({
    queryKey: venue && from ? queryKeys.bookings.forVenue(venue.id, from.toISOString()) : queryKeys.bookings.all,
    queryFn: () => getBookings(venue!, from!, addHours(from!, 24 * DAYS_AHEAD)),
    enabled: !!venue && !!from,
  });

  // Live sync: any change to venues or bookings re-reads them.
  useEffect(
    () =>
      subscribeToChanges(() => {
        for (const key of [
          queryKeys.venues,
          queryKeys.bookings.all,
          queryKeys.myBookings.all,
          queryKeys.leagues.all,
          queryKeys.league.all,
          queryKeys.myMatches.all,
        ]) {
          void queryClient.invalidateQueries({ queryKey: key });
        }
      }),
    [queryClient],
  );

  const bookingWrite = useMutation({
    mutationFn: (action: () => Promise<unknown>) => action(),
    onSuccess: () => setSaveError(false),
    onError: () => setSaveError(true),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.myBookings.all });
    },
  });

  const patchVenue = (changes: Partial<Venue>) =>
    queryClient.setQueryData<Venue[]>(queryKeys.venues, (prev) =>
      prev?.map((v) => (v.id === venue?.id ? { ...v, ...changes } : v)),
    );

  const venueWrite = useMutation({
    mutationFn: (action: () => Promise<unknown>) => action(),
    onSuccess: () => setSaveError(false),
    onError: () => setSaveError(true),
    // Courts changing also changes which bookings are on screen.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.venues });
      void queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
    },
  });

  return {
    venues,
    venue,
    bookings: bookingsQuery.data ?? [],
    loading: venuesQuery.isPending,
    saveError,
    photoUploading,
    photoError,
    selectVenue: setVenueId,

    createBooking: (input: NewBooking) => memberId && bookingWrite.mutate(() => createBooking(input, memberId)),
    joinBooking: (bookingId: string, who: Who) =>
      memberId && bookingWrite.mutate(() => addParticipant(bookingId, who, memberId)),
    leaveBooking: (participantId: string) => bookingWrite.mutate(() => removeParticipant(participantId)),
    updateBooking: (bookingId: string, patch: BookingPatch) =>
      bookingWrite.mutate(() => updateBooking(bookingId, patch)),
    deleteBooking: (bookingId: string) => bookingWrite.mutate(() => deleteBooking(bookingId)),

    /* Admins only. Shows the new venue once created; resolves to null on failure. */
    createVenue: async (input: Omit<NewVenue, "sortOrder">) => {
      try {
        const id = (await venueWrite.mutateAsync(() =>
          createVenue({ ...input, sortOrder: venues.length + 1 }),
        )) as string;
        setVenueId(id);
        return id;
      } catch {
        return null;
      }
    },
    updateVenue: (patch: VenuePatch) => {
      if (!venue) return;
      patchVenue(patch);
      venueWrite.mutate(() => updateVenue(venue.id, patch));
    },
    deleteVenue: () => venue && venueWrite.mutate(() => deleteVenue(venue.id)),
    addCourt: (name: string) => venue && venueWrite.mutate(() => addCourt(venue.id, name, venue.courts.length + 1)),
    removeCourt: (courtId: string) => venueWrite.mutate(() => removeCourt(courtId)),

    toggleAmenity: (key: string) => {
      if (!venue) return;
      const amenities = { ...venue.amenities, [key]: !venue.amenities[key] };
      patchVenue({ amenities });
      venueWrite.mutate(() => updateVenue(venue.id, { amenities }));
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
        void queryClient.invalidateQueries({ queryKey: queryKeys.venues });
      } finally {
        setPhotoUploading(false);
      }
    },
    setVenuePhotoUrl: (url: string) => {
      if (!venue) return;
      patchVenue({ photo: url });
      updateVenue(venue.id, { photoUrl: url }).catch(() => {
        setPhotoError(PHOTO_ERROR);
        void queryClient.invalidateQueries({ queryKey: queryKeys.venues });
      });
    },
  };
}
