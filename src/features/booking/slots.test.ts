import { describe, expect, it } from "vitest";
import { hoursBetween, nextDays, toInstant, zonedDate } from "./slots";

const SEOUL = "Asia/Seoul";

describe("nextDays", () => {
  it("starts from today's date at the venue, not the UTC date", () => {
    // 02:30 on Monday 5 October in Korea is still 4 October in UTC.
    const days = nextDays(2, SEOUL, new Date("2026-10-04T17:30:00Z"));
    expect(days).toEqual([
      { iso: "2026-10-05", label: "10/5", weekday: "월", isToday: true },
      { iso: "2026-10-06", label: "10/6", weekday: "화", isToday: false },
    ]);
  });

  it("rolls over month ends", () => {
    const days = nextDays(2, SEOUL, new Date("2026-10-31T03:00:00Z"));
    expect(days.map((d) => [d.iso, d.label])).toEqual([
      ["2026-10-31", "10/31"],
      ["2026-11-01", "11/1"],
    ]);
  });
});

describe("toInstant", () => {
  it("converts a venue wall-clock time to an instant", () => {
    expect(toInstant("2026-10-05", "19:00", SEOUL).toISOString()).toBe("2026-10-05T10:00:00.000Z");
    expect(toInstant("2026-07-04", "19:00", "America/New_York").toISOString()).toBe("2026-07-04T23:00:00.000Z");
  });

  it("round-trips through zonedDate", () => {
    const at = toInstant("2026-10-05", "00:00", SEOUL);
    expect(zonedDate(at, SEOUL)).toBe("2026-10-05");
    expect(zonedDate(at, "UTC")).toBe("2026-10-04");
  });
});

describe("hoursBetween", () => {
  it("lists hourly starts up to the hour before closing", () => {
    expect(hoursBetween("07:00", "10:00")).toEqual(["07:00", "08:00", "09:00"]);
    expect(hoursBetween("07:00", "22:00")).toHaveLength(15);
  });
});
