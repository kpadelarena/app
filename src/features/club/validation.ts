import { z } from "zod";

export const SLUG_HINT = "영문 소문자 · 숫자 · 하이픈, 2~40자 (예: yongsan)";

/** Matches the database check on venues.slug. */
export const venueSlugSchema = z
  .string()
  .trim()
  .min(2, SLUG_HINT)
  .max(40, SLUG_HINT)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, SLUG_HINT);

export const isValidSlug = (slug: string) => venueSlugSchema.safeParse(slug).success;
