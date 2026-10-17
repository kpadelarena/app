import type { Tables } from "./database.types";

/* App-side shapes (camelCase), as produced by lib/db.ts from database rows. */

export type Role = "owner" | "admin" | "player";
export type LeagueFormat = "americano" | "mexicano" | "round_robin";
export type BookingCategory = "rental" | "match" | "league" | "lesson";
export type Amenities = Record<string, boolean>;

/** Rows as stored (snake_case). Columns with a CHECK constraint, such as
 *  `clubs.format`, are plain strings here; narrow them where they are read. */
export type ClubRow = Tables<"clubs">;
export type ProfileRow = Tables<"profiles">;

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
