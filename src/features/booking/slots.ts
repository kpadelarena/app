import { VENUE_TIME_ZONE } from "@/features/club/constants";

/** One bookable hour on one court. */
export interface Slot {
  date: string;
  time: string;
  court: number;
}

export function generateTimeSlots(startHour: number, endHour: number, stepMinutes: number) {
  const slots: string[] = [];
  let mins = startHour * 60;
  const end = endHour * 60;
  while (mins <= end) {
    const h = String(Math.floor(mins / 60)).padStart(2, "0");
    const m = String(mins % 60).padStart(2, "0");
    slots.push(`${h}:${m}`);
    mins += stepMinutes;
  }
  return slots;
}

export const TIME_SLOTS = generateTimeSlots(7, 22, 60);

const WEEKDAY_KR = ["일", "월", "화", "수", "목", "금", "토"];

export interface DayOption {
  iso: string;
  label: string;
  weekday: string;
  isToday: boolean;
}

/* Today's calendar date at the venue, as YYYY-MM-DD. Bookings are for a
   wall-clock hour at the venue, so "today" must not depend on the viewer's
   own timezone, nor on UTC (which is still yesterday until 09:00 in Korea). */
function venueDate(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: VENUE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function nextDays(count: number, now = new Date()) {
  // Held as UTC midnight so the day arithmetic below is timezone-free.
  const today = new Date(`${venueDate(now)}T00:00:00Z`);
  const out: DayOption[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() + i);
    out.push({
      iso: d.toISOString().slice(0, 10),
      label: `${d.getUTCMonth() + 1}/${d.getUTCDate()}`,
      weekday: WEEKDAY_KR[d.getUTCDay()],
      isToday: i === 0,
    });
  }
  return out;
}
