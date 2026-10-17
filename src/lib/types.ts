import type { Enums, Tables } from "./database.types";

export type Role = Enums<"member_role">;
export type BookingKind = Enums<"booking_kind">;
export type Visibility = Enums<"visibility">;
export type LeagueFormat = Enums<"league_format">;
export type Amenities = Record<string, boolean>;

export type ProfileRow = Tables<"profiles">;

/* App-side shapes (camelCase), as produced by lib/db.ts from database rows. */

/** A member as every other member sees them: the public part of a profile. */
export interface Member {
  id: string;
  name: string;
  level: number;
  photo: string | null;
  role: Role;
}

/** The signed-in member's own contact details (profile_contacts). */
export interface Contact {
  email: string | null;
  phone: string | null;
}

export interface Court {
  id: string;
  name: string;
}

export interface Venue {
  id: string;
  /** Short name used in URLs, e.g. "yongsan". */
  slug: string;
  name: string;
  address: string | null;
  timezone: string;
  /** Wall-clock "HH:MM" at the venue. */
  openTime: string;
  closeTime: string;
  /** Per booking. */
  maxPlayers: number;
  amenities: Amenities;
  photo: string | null;
  /** Active courts, in display order. */
  courts: Court[];
}

export interface Participant {
  id: string;
  profileId: string | null;
  name: string;
  isGuest: boolean;
  addedBy: string | null;
}

export interface Booking {
  id: string;
  courtId: string;
  /** ISO instants. */
  startsAt: string;
  endsAt: string;
  kind: BookingKind;
  visibility: Visibility;
  /** Empty for logged-out visitors, who may not see who is playing. */
  participants: Participant[];
}

/** One of the signed-in member's own bookings, with where it is. */
export interface MyBooking {
  id: string;
  /** The member's own participant row, for leaving. */
  participantId: string;
  startsAt: string;
  endsAt: string;
  kind: BookingKind;
  courtName: string;
  venueName: string;
}

/* League events */

/** A row in the event list. */
export interface LeagueSummary {
  id: string;
  venueId: string;
  name: string;
  format: LeagueFormat;
  /** YYYY-MM-DD */
  eventDate: string;
  courtCount: number;
  playerCount: number;
}

/** A roster entry: a member or a named guest. Its id is what match sides refer to. */
export interface Player {
  id: string;
  name: string;
  isGuest: boolean;
  profileId: string | null;
}

export interface Match {
  id: string;
  court: number;
  sideA: string[];
  sideB: string[];
  /** Scores are kept as the raw input text; "" means not entered yet. */
  scoreA: string;
  scoreB: string;
}

export interface Round {
  roundNumber: number;
  matches: Match[];
  sitOut?: string[];
}

/** Round-robin pairing of two players. */
export interface Team {
  id: string;
  name: string;
  playerIds: string[];
}

/** One event with everything the league screens need. */
export interface League {
  id: string;
  venueId: string;
  name: string;
  format: LeagueFormat;
  eventDate: string;
  courtCount: number;
  resultPhoto: string | null;
  players: Player[];
  teams: Team[];
  rounds: Round[];
}

/** One of the signed-in member's matches, across events. */
export interface MyMatch {
  id: string;
  leagueId: string;
  leagueName: string;
  venueId: string;
  eventDate: string;
  venueName: string;
  roundNumber: number;
  court: number;
  opponents: string[];
  scoreA: string;
  scoreB: string;
}
