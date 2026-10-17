"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarRange, Grid3x3, UserCircle, Users } from "lucide-react";
import { CenteredScreen } from "@/components/ui/CenteredScreen";
import { TabBar } from "@/components/ui/TabBar";
import { AccountButton } from "@/features/auth/AccountButton";
import { AccountPage } from "@/features/auth/AccountPage";
import { useSession } from "@/features/auth/useSession";
import { BookingTab } from "@/features/booking/BookingTab";
import { LeagueTab } from "@/features/league/LeagueTab";
import { MembersTab } from "@/features/members/MembersTab";
import { MyScheduleTab } from "@/features/league/MyScheduleTab";
import { C, FONT } from "@/styles/tokens";
import { ClubHeader } from "./ClubHeader";
import { buildPath, parseRoute, VENUE_TABS, type AppRoute, type TabKey } from "./routes";
import { useVenues } from "./useVenues";
import { NewVenueForm, NewVenueSheet, VenueAdmin } from "./VenueAdmin";
import { VenueInfo } from "./VenueInfo";

const LAST_VENUE_KEY = "kpadelarena.lastVenue";
const readLastVenue = () => {
  try {
    return window.localStorage.getItem(LAST_VENUE_KEY);
  } catch {
    return null;
  }
};
const storeLastVenue = (id: string) => {
  try {
    window.localStorage.setItem(LAST_VENUE_KEY, id);
  } catch {
    // private mode or storage disabled: the default venue is used next time
  }
};

const RETURN_KEY = "kpadelarena.accountReturn";
const readReturnPath = () => {
  try {
    return window.sessionStorage.getItem(RETURN_KEY);
  } catch {
    return null;
  }
};
const storeReturnPath = (path: string | null) => {
  try {
    if (path) window.sessionStorage.setItem(RETURN_KEY, path);
    else window.sessionStorage.removeItem(RETURN_KEY);
  } catch {
    // storage unavailable: leaving the page lands on the venue
  }
};

const TABS: { key: TabKey; label: string; icon: typeof Grid3x3 }[] = [
  { key: "booking", label: "코트 예약", icon: Grid3x3 },
  { key: "league", label: "리그", icon: CalendarRange },
  { key: "myschedule", label: "내 일정", icon: UserCircle },
  { key: "members", label: "회원", icon: Users },
];

/* ---------------------------------------------------------
   메인 앱 — what is on screen comes from the URL (see routes.ts)
--------------------------------------------------------- */
export function ClubApp() {
  const router = useRouter();
  const pathname = usePathname();
  const route = useMemo(() => parseRoute(pathname), [pathname]);

  // Club-wide tabs carry no venue in the URL; the last venue shown stays selected.
  const [lastVenueId, setLastVenueId] = useState<string | null>(null);
  useEffect(() => setLastVenueId(readLastVenue()), []);

  const session = useSession();
  const club = useVenues(session.member?.id ?? null, route.venueId ?? lastVenueId);
  const { venue } = club;
  const [addingVenue, setAddingVenue] = useState(false);

  useEffect(() => {
    if (!venue) return;
    setLastVenueId(venue.id);
    storeLastVenue(venue.id);
  }, [venue]);

  /* Navigates to a changed route. Closing a sheet replaces the entry so
     Back does not reopen it. */
  const go = (changes: Partial<AppRoute>, replace = false) => {
    const path = buildPath({ ...route, venueId: route.venueId ?? venue?.id ?? null, ...changes });
    if (replace) router.replace(path);
    else router.push(path);
  };

  // "/" or an unknown venue id on a venue tab: settle on the venue actually shown.
  useEffect(() => {
    if (venue && !route.account && VENUE_TABS.includes(route.tab) && route.venueId !== venue.id) {
      router.replace(buildPath({ ...route, venueId: venue.id }));
    }
  }, [venue, route, router]);

  // Day changes replace the entry: flipping through the week should not pile up history.
  const selectDate = useCallback(
    (date: string | null) => router.replace(buildPath({ ...route, date, bookingId: null })),
    [route, router],
  );

  // /account is its own page. Opened from inside the app it remembers the
  // screen to return to (across reloads); opened from a link, leaving it
  // lands on the venue page.
  const openAuth = () => {
    storeReturnPath(pathname);
    router.push("/account");
  };
  const closeAuth = () => {
    const returnTo = readReturnPath();
    storeReturnPath(null);
    router.replace(returnTo ?? buildPath({ ...route, account: false }));
  };
  const accountPage = route.account && (
    <AccountPage
      member={session.member}
      contact={session.contact}
      onLogIn={session.logIn}
      onGoogle={session.logInWithGoogle}
      onResetPassword={session.resetPassword}
      onLogout={() => session.logOut(buildPath({ ...route, account: false }))}
      onSignUp={session.signUp}
      onUploadProfilePhoto={session.updatePhoto}
      onSetProfilePhotoUrl={session.updatePhotoUrl}
      onSaveProfile={session.saveProfile}
      onChangePassword={session.changePassword}
      canChangePassword={session.hasPassword}
      profileUploading={session.profileUploading}
      onClose={closeAuth}
    />
  );

  if (club.loading || session.isLoading) return <CenteredScreen>불러오는 중...</CenteredScreen>;
  if (!venue) {
    return (
      <CenteredScreen>
        <div>아직 등록된 지점이 없어요.</div>
        {session.isAdmin ? (
          <NewVenueForm
            onCreate={async (input) => {
              const id = await club.createVenue(input);
              if (id) go({ venueId: id, tab: "booking" });
              return id;
            }}
          />
        ) : (
          <div style={{ fontSize: 13, color: "rgba(27,36,34,0.55)" }}>
            관리자가 지점과 코트를 등록하면 여기에 표시돼요.
          </div>
        )}
        {accountPage ? (
          <div style={{ width: "100%", textAlign: "left", marginTop: 12 }}>{accountPage}</div>
        ) : (
          <AccountButton member={session.member} onClick={openAuth} dark={false} />
        )}
      </CenteredScreen>
    );
  }

  // On /account no tab is active and the page replaces the tab content.
  const tab = route.account ? null : route.tab;

  return (
    <div style={{ minHeight: "100vh", background: C.paper, fontFamily: FONT.body, color: C.charcoal }}>
      <ClubHeader
        venues={club.venues}
        venueId={venue.id}
        onSelectVenue={(id) => go({ venueId: id, date: null, bookingId: null, leagueId: null, leagueTab: "players" })}
        onAddVenue={session.isAdmin ? () => setAddingVenue(true) : undefined}
        account={<AccountButton member={session.member} onClick={openAuth} active={route.account} />}
        tabs={
          <TabBar
            tabs={TABS}
            active={tab}
            onChange={(key) =>
              go({ tab: key, date: null, bookingId: null, leagueId: null, leagueTab: "players", account: false })
            }
          />
        }
      />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px 80px" }}>
        {accountPage}
        {tab === "booking" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <VenueInfo
              venue={venue.name}
              photo={venue.photo}
              amenities={venue.amenities}
              canEdit={session.isAdmin}
              photoUploading={club.photoUploading}
              photoError={club.photoError}
              onUploadPhoto={club.uploadVenuePhoto}
              onSetPhotoUrl={club.setVenuePhotoUrl}
              onToggleAmenity={club.toggleAmenity}
            />
            {session.isAdmin && (
              <VenueAdmin
                key={venue.id}
                venue={venue}
                onUpdate={club.updateVenue}
                onDelete={club.deleteVenue}
                onAddCourt={club.addCourt}
                onRemoveCourt={club.removeCourt}
              />
            )}
            <BookingTab
              venue={venue}
              bookings={club.bookings}
              member={session.member}
              isAdmin={session.isAdmin}
              onCreate={club.createBooking}
              onJoin={club.joinBooking}
              onLeave={club.leaveBooking}
              onUpdate={club.updateBooking}
              onDelete={club.deleteBooking}
              date={route.date}
              onSelectDate={selectDate}
              bookingId={route.bookingId}
              bookingsLoading={club.bookingsLoading}
              onOpenBooking={(bookingId, date) => {
                const path = buildPath({ ...route, date, bookingId });
                if (bookingId) router.push(path);
                else router.replace(path);
              }}
              onOpenAuth={openAuth}
            />
          </div>
        )}

        {tab === "myschedule" && (
          <MyScheduleTab
            member={session.member}
            isAdmin={session.isAdmin}
            onLeave={club.leaveBooking}
            onOpenAuth={openAuth}
          />
        )}

        {tab === "league" && (
          <LeagueTab
            venueId={venue.id}
            member={session.member}
            isAdmin={session.isAdmin}
            leagueId={route.leagueId}
            leagueTab={route.leagueTab}
            onOpenLeague={(leagueId) => go({ leagueId, leagueTab: "players" })}
            onLeagueTab={(leagueTab) => go({ leagueTab })}
            onOpenAuth={openAuth}
          />
        )}

        {tab === "members" && (
          <MembersTab
            member={session.member}
            isAdmin={session.isAdmin}
            isOwner={session.member?.role === "owner"}
            onOpenAuth={openAuth}
          />
        )}

        {club.saveError && (
          <div style={{ marginTop: 24, textAlign: "center", fontSize: 12, color: C.danger }}>
            저장에 실패했어요. 권한이 있는지, 시작 24시간 전인지 확인해 주세요.
          </div>
        )}
      </div>

      {addingVenue && (
        <NewVenueSheet
          onCreate={async (input) => {
            // Land on the new venue's booking tab; its settings open by themselves while it has no courts.
            const id = await club.createVenue(input);
            if (id) go({ venueId: id, tab: "booking", leagueId: null });
            return id;
          }}
          onClose={() => setAddingVenue(false)}
        />
      )}
    </div>
  );
}
