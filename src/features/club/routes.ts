/* The app is one client-rendered page; these helpers map its state to
   and from the URL so venues, tabs, league events and the account sheet
   are linkable and survive a reload.

     /                                   → default venue (redirects once venues load)
     /venues/<slug>                       코트 예약 (the venue's page, today)
     /venues/<slug>/<YYYY-MM-DD>          코트 예약 on another day of the coming week
     /venues/<slug>/<YYYY-MM-DD>/<bookingId> that day with one booking's sheet open (the share link)
     /venues/<slug>/leagues               리그 list
     /venues/<slug>/leagues/<leagueId>[/schedule|/standings]

   <slug> is the venue's admin-chosen slug (an id still resolves).
     /schedule                            내 일정 (club-wide)
     /schedule/<bookingId>                내 일정 with one booking's sheet open
     /members                             회원 (club-wide)
     /account                             the profile / sign-in sheet, over the last venue shown

   The club-wide tabs and /account carry no venue; the app remembers the
   last venue shown so the picker and the venue tabs keep working. */

export const TAB_KEYS = ["booking", "league", "myschedule", "members"] as const;
export type TabKey = (typeof TAB_KEYS)[number];

/** Tabs whose content belongs to one venue and so live under /venues/<id>. */
export const VENUE_TABS: readonly TabKey[] = ["booking", "league"];

const GLOBAL_SEGMENT: Partial<Record<TabKey, string>> = { myschedule: "schedule", members: "members" };

export const LEAGUE_TABS = ["players", "schedule", "standings"] as const;
export type LeagueTabKey = (typeof LEAGUE_TABS)[number];

export interface AppRoute {
  /** The venue's slug from the URL; null on club-wide tabs and on "/". */
  venueId: string | null;
  tab: TabKey;
  /** Booking day as YYYY-MM-DD; null means today. */
  date: string | null;
  /** A booking whose sheet is open: under a venue day, or over 내 일정. */
  bookingId: string | null;
  leagueId: string | null;
  leagueTab: LeagueTabKey;
  account: boolean;
}

export const HOME_ROUTE: AppRoute = {
  venueId: null,
  tab: "booking",
  date: null,
  bookingId: null,
  leagueId: null,
  leagueTab: "players",
  account: false,
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const isLeagueTab = (s: string | undefined): s is LeagueTabKey => LEAGUE_TABS.includes(s as LeagueTabKey);

export function parseRoute(pathname: string): AppRoute {
  const parts = pathname.split("/").filter(Boolean);
  const route: AppRoute = { ...HOME_ROUTE };
  if (parts[parts.length - 1] === "account") {
    route.account = true;
    parts.pop();
  }
  if (parts[0] === "venues" && parts[1]) {
    route.venueId = parts[1];
    if (parts[2] === "leagues") {
      route.tab = "league";
      if (parts[3]) {
        route.leagueId = parts[3];
        if (isLeagueTab(parts[4])) route.leagueTab = parts[4];
      }
    } else if (parts[2] && DATE.test(parts[2])) {
      route.date = parts[2];
      if (parts[3]) route.bookingId = parts[3];
    }
    return route;
  }
  const globalTab = TAB_KEYS.find((key) => GLOBAL_SEGMENT[key] === parts[0]);
  if (globalTab) route.tab = globalTab;
  if (globalTab === "myschedule" && parts[1]) route.bookingId = parts[1];
  return route;
}

export function buildPath(route: AppRoute): string {
  if (route.account) return "/account";
  const parts: string[] = [];
  if (VENUE_TABS.includes(route.tab)) {
    if (route.venueId) {
      parts.push("venues", route.venueId);
      if (route.tab === "booking" && route.date) {
        parts.push(route.date);
        if (route.bookingId) parts.push(route.bookingId);
      }
      if (route.tab === "league") {
        parts.push("leagues");
        if (route.leagueId) {
          parts.push(route.leagueId);
          if (route.leagueTab !== "players") parts.push(route.leagueTab);
        }
      }
    }
  } else {
    parts.push(GLOBAL_SEGMENT[route.tab]!);
    if (route.tab === "myschedule" && route.bookingId) parts.push(route.bookingId);
  }
  return "/" + parts.join("/");
}
