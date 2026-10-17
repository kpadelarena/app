/** One bookable hour on one court, in the venue's wall-clock time. */
export interface Slot {
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  time: string;
  courtId: string;
}

export interface DayOption {
  iso: string;
  label: string;
  weekday: string;
  isToday: boolean;
}

const WEEKDAY_KR = ["일", "월", "화", "수", "목", "금", "토"];
const pad = (n: number) => String(n).padStart(2, "0");

/* Each date/time part of `at`, read in `timeZone`. */
function zonedParts(at: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** The calendar date of `at` in `timeZone`, as YYYY-MM-DD. */
export function zonedDate(at: Date, timeZone: string) {
  const { year, month, day } = zonedParts(at, timeZone);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** The instant at which the wall clock in `timeZone` reads `date` `time`. */
export function toInstant(date: string, time: string, timeZone: string): Date {
  // Read the naive timestamp as UTC, then shift by the zone's offset at that moment.
  const naive = new Date(`${date}T${time}:00Z`);
  const p = zonedParts(naive, timeZone);
  const offsetMs = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - naive.getTime();
  return new Date(naive.getTime() - offsetMs);
}

export const addHours = (at: Date, hours: number) => new Date(at.getTime() + hours * 3_600_000);

/** Hourly slot starts between opening and closing time, e.g. 07:00 … 21:00 for 07:00–22:00. */
export function hoursBetween(openTime: string, closeTime: string) {
  const [openH] = openTime.split(":").map(Number);
  const [closeH] = closeTime.split(":").map(Number);
  const out: string[] = [];
  for (let h = openH; h < closeH; h++) out.push(`${pad(h)}:00`);
  return out;
}

/** The next `count` calendar days at the venue, starting today there. */
export function nextDays(count: number, timeZone: string, now = new Date()): DayOption[] {
  // Held as UTC midnight so the day arithmetic below is timezone-free.
  const today = new Date(`${zonedDate(now, timeZone)}T00:00:00Z`);
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

/** The wall-clock "HH:MM" of `at` in `timeZone`. */
export function zonedTime(at: Date, timeZone: string) {
  const { hour, minute } = zonedParts(at, timeZone);
  return `${pad(hour)}:${pad(minute)}`;
}
