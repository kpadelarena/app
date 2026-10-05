import { describe, expect, it } from "vitest";
import { nextDays } from "./slots";

describe("nextDays", () => {
  it("starts from today's date at the venue, not the UTC date", () => {
    // 02:30 on Monday 5 October in Korea is still 4 October in UTC.
    const days = nextDays(2, new Date("2026-10-04T17:30:00Z"));
    expect(days).toEqual([
      { iso: "2026-10-05", label: "10/5", weekday: "월", isToday: true },
      { iso: "2026-10-06", label: "10/6", weekday: "화", isToday: false },
    ]);
  });

  it("keeps the venue's date late in the evening too", () => {
    // 23:30 on 5 October in Korea.
    expect(nextDays(1, new Date("2026-10-05T14:30:00Z"))[0].iso).toBe("2026-10-05");
  });

  it("rolls over month ends", () => {
    const days = nextDays(2, new Date("2026-10-31T03:00:00Z"));
    expect(days.map((d) => [d.iso, d.label])).toEqual([
      ["2026-10-31", "10/31"],
      ["2026-11-01", "11/1"],
    ]);
  });
});
