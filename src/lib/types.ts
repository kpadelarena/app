/* App-side shapes (camelCase), as produced by lib/db.ts from database rows. */

export type Role = "owner" | "admin" | "player";
export type LeagueFormat = "americano" | "mexicano" | "round_robin";
export type BookingCategory = "rental" | "match" | "league" | "lesson";
export type Amenities = Record<string, boolean>;

/** A `clubs` row as stored (snake_case). */
export interface ClubRow {
  id: string;
  name: string;
  venue: string;
  format: LeagueFormat;
  court_count: number;
  amenities: Amenities | null;
  photo_url: string | null;
  result_photo_url: string | null;
  owner_id: string;
  created_at: string;
}

export interface Player {
  id: string;
  name: string;
  role?: Role;
  level?: number | null;
  photo?: string | null;
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

export interface BookingPlayer {
  id: string;
  name: string;
}

export interface Booking {
  id: string;
  groupId: string;
  court: number;
  date: string;
  time: string;
  category: BookingCategory;
  players: BookingPlayer[];
}

/** Who is being added to a booking: a signed-in member, or a guest by name. */
export interface Participant {
  profileId?: string | null;
  name: string;
}
