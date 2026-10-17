/* Query keys for TanStack Query. Keys are hierarchical: invalidating
   `bookings.all` covers every venue and day. */
export const queryKeys = {
  session: ["session"] as const,
  venues: ["venues"] as const,
  members: ["members"] as const,
  bookings: {
    all: ["bookings"] as const,
    forVenue: (venueId: string, fromIso: string) => ["bookings", venueId, fromIso] as const,
  },
  myBookings: {
    all: ["myBookings"] as const,
    forMember: (memberId: string) => ["myBookings", memberId] as const,
  },
};
