import { describe, expect, it } from "vitest";
import { buildPath, HOME_ROUTE, parseRoute, type AppRoute } from "./routes";

const at = (changes: Partial<AppRoute>): AppRoute => ({ ...HOME_ROUTE, ...changes });

describe("routes", () => {
  it("maps the home path to the default route", () => {
    expect(parseRoute("/")).toEqual(HOME_ROUTE);
    expect(buildPath(HOME_ROUTE)).toBe("/");
  });

  it("round-trips venue tabs, league detail, club-wide tabs and the account page", () => {
    const routes = [
      at({ venueId: "v1" }),
      at({ venueId: "v1", date: "2026-10-24" }),
      at({ venueId: "v1", date: "2026-10-24", bookingId: "b1" }),
      at({ venueId: "v1", tab: "league" }),
      at({ venueId: "v1", tab: "league", leagueId: "l1" }),
      at({ venueId: "v1", tab: "league", leagueId: "l1", leagueTab: "standings" }),
      at({ tab: "myschedule" }),
      at({ tab: "members" }),
      at({ account: true }),
    ];
    for (const route of routes) expect(parseRoute(buildPath(route))).toEqual(route);
  });

  it("builds readable paths", () => {
    expect(buildPath(at({ venueId: "v1" }))).toBe("/venues/v1");
    expect(buildPath(at({ venueId: "v1", date: "2026-10-24" }))).toBe("/venues/v1/2026-10-24");
    expect(buildPath(at({ venueId: "v1", date: "2026-10-24", bookingId: "b1" }))).toBe("/venues/v1/2026-10-24/b1");
    expect(buildPath(at({ venueId: "v1", tab: "league", leagueId: "l1", leagueTab: "schedule" }))).toBe(
      "/venues/v1/leagues/l1/schedule",
    );
    expect(buildPath(at({ tab: "members" }))).toBe("/members");
    // The account sheet is its own page, whatever was open before.
    expect(buildPath(at({ venueId: "v1", tab: "members", account: true }))).toBe("/account");
  });

  it("falls back to the venue page or home for unknown segments", () => {
    expect(parseRoute("/venues/v1/nope")).toMatchObject({ tab: "booking", date: null, bookingId: null });
    expect(parseRoute("/venues/v1/2026-13-99").date).toBe("2026-13-99"); // shape only; the grid checks the window
    expect(parseRoute("/venues/v1/leagues/l1/nope").leagueTab).toBe("players");
    expect(parseRoute("/nope")).toEqual(HOME_ROUTE);
  });
});
