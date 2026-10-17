"use client";

import { useState } from "react";
import { CalendarRange, Grid3x3, UserCircle } from "lucide-react";
import { CenteredScreen } from "@/components/ui/CenteredScreen";
import { TabBar } from "@/components/ui/TabBar";
import { AccountButton } from "@/features/auth/AccountButton";
import { AuthModal } from "@/features/auth/AuthModal";
import { useSession } from "@/features/auth/useSession";
import { BookingTab } from "@/features/booking/BookingTab";
import { LeagueTab } from "@/features/league/LeagueTab";
import { MyScheduleTab } from "@/features/league/MyScheduleTab";
import { C, FONT } from "@/styles/tokens";
import { ClubHeader } from "./ClubHeader";
import { useVenues } from "./useVenues";
import { NewVenueForm, VenueAdmin } from "./VenueAdmin";
import { VenueInfo } from "./VenueInfo";

const TABS = [
  { key: "booking", label: "코트 예약", icon: Grid3x3 },
  { key: "myschedule", label: "내 일정", icon: UserCircle },
  { key: "league", label: "리그", icon: CalendarRange },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/* ---------------------------------------------------------
   메인 앱
--------------------------------------------------------- */
export function ClubApp() {
  const session = useSession();
  const club = useVenues(session.member?.id ?? null);
  const [tab, setTab] = useState<TabKey>("booking");
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const openAuth = () => setAuthModalOpen(true);
  const authModal = authModalOpen && (
    <AuthModal
      member={session.member}
      contact={session.contact}
      onLogIn={session.logIn}
      onLogout={session.logOut}
      onSignUp={session.signUp}
      onUploadProfilePhoto={session.updatePhoto}
      onSetProfilePhotoUrl={session.updatePhotoUrl}
      onUpdateLevel={session.updateLevel}
      profileUploading={session.profileUploading}
      onClose={() => setAuthModalOpen(false)}
    />
  );

  const { venue } = club;
  if (club.loading || session.isLoading) return <CenteredScreen>불러오는 중...</CenteredScreen>;
  if (!venue) {
    return (
      <CenteredScreen>
        <div>아직 등록된 지점이 없어요.</div>
        {session.isAdmin ? (
          <NewVenueForm onCreate={club.createVenue} />
        ) : (
          <div style={{ fontSize: 13, color: "rgba(27,36,34,0.55)" }}>
            관리자가 지점과 코트를 등록하면 여기에 표시돼요.
          </div>
        )}
        <AccountButton member={session.member} onClick={openAuth} />
        {authModal}
      </CenteredScreen>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.paper, fontFamily: FONT.body, color: C.charcoal }}>
      <ClubHeader
        venues={club.venues}
        venueId={venue.id}
        onSelectVenue={club.selectVenue}
        account={<AccountButton member={session.member} onClick={openAuth} />}
        tabs={<TabBar tabs={TABS} active={tab} onChange={setTab} />}
      />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px 80px" }}>
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
                onCreate={club.createVenue}
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
            key={venue.id}
            venueId={venue.id}
            member={session.member}
            isAdmin={session.isAdmin}
            onOpenAuth={openAuth}
          />
        )}

        {club.saveError && (
          <div style={{ marginTop: 24, textAlign: "center", fontSize: 12, color: C.danger }}>
            저장에 실패했어요. 권한이 있는지, 시작 24시간 전인지 확인해 주세요.
          </div>
        )}
      </div>

      {authModal}
    </div>
  );
}
