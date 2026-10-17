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
  startsAt: string;
  endsAt: string;
  kind: BookingKind;
  courtName: string;
  venueName: string;
}

/* League events — the in-memory shape the league screens render. Wired
   to the database in a later PR. */

export interface Player {
  id: string;
  name: string;
  isGuest?: boolean;
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

export interface League {
  id: string;
  name: string;
  format: LeagueFormat;
  eventDate: string;
  courtCount: number;
  resultPhoto: string | null;
  players: Player[];
  teams: Team[];
  rounds: Round[];
}
