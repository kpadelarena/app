"use client";

import { useEffect, useState } from "react";
import { CalendarRange, Grid3x3, ListOrdered, UserCircle, Users } from "lucide-react";
import { CenteredScreen } from "@/components/ui/CenteredScreen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { TabBar } from "@/components/ui/TabBar";
import { AccountButton } from "@/features/auth/AccountButton";
import { AuthModal, type SignUpForm } from "@/features/auth/AuthModal";
import { useSession } from "@/features/auth/useSession";
import { BookingTab } from "@/features/booking/BookingTab";
import { MyScheduleTab } from "@/features/league/MyScheduleTab";
import { PlayersTab } from "@/features/league/PlayersTab";
import { ScheduleTab } from "@/features/league/ScheduleTab";
import { StandingsTab } from "@/features/league/StandingsTab";
import { supabase } from "@/lib/supabaseClient";
import { C, FONT } from "@/styles/tokens";
import { ClubHeader } from "./ClubHeader";
import { useClub } from "./useClub";
import { VenueInfo } from "./VenueInfo";

const TABS = [
  { key: "booking", label: "코트 예약", icon: Grid3x3 },
  { key: "myschedule", label: "내 일정", icon: UserCircle },
  { key: "players", label: "선수 · 팀", icon: Users },
  { key: "schedule", label: "대진표", icon: CalendarRange },
  { key: "standings", label: "순위", icon: ListOrdered },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/* ---------------------------------------------------------
   메인 앱
--------------------------------------------------------- */
export function ClubApp() {
  const session = useSession();
  const club = useClub();
  const [tab, setTab] = useState<TabKey>("booking");
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Load on mount, and again whenever someone signs in or out.
  const { refresh } = session;
  const { load } = club;
  useEffect(() => {
    const loadEverything = () => load(async () => (await refresh())?.id ?? null);
    loadEverything();
    const { data } = supabase.auth.onAuthStateChange(() => {
      loadEverything();
    });
    return () => data.subscription.unsubscribe();
  }, [load, refresh]);

  const signUp = async (form: SignUpForm) => {
    const result = await session.signUp(form);
    if ("error" in result) return result;
    await club.addMember(result.userId);
    return {};
  };

  const logIn = async (username: string, password: string) => {
    const result = await session.logIn(username, password);
    if ("error" in result) return result;
    await club.showClubOf(result.userId);
    return {};
  };

  const openAuth = () => setAuthModalOpen(true);
  const authModal = authModalOpen && (
    <AuthModal
      currentMember={session.currentMember}
      onLoginWithPassword={logIn}
      onLogout={session.logOut}
      onSignUp={signUp}
      onUploadProfilePhoto={session.updatePhoto}
      onSetProfilePhotoUrl={session.updatePhotoUrl}
      onUpdateLevel={session.updateLevel}
      profileUploading={session.profileUploading}
      onClose={() => setAuthModalOpen(false)}
    />
  );

  const { league } = club;
  if (club.loading) return <CenteredScreen>불러오는 중...</CenteredScreen>;
  if (!league) {
    return (
      <CenteredScreen>
        <div>아직 만들어진 클럽이 없어요.</div>
        <PrimaryButton onClick={openAuth}>회원가입하고 클럽 만들기</PrimaryButton>
        {authModal}
      </CenteredScreen>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.paper, fontFamily: FONT.body, color: C.charcoal }}>
      <ClubHeader
        league={league}
        saveStatus={club.saveStatus}
        onRename={(name) => club.saveSettings({ name })}
        onChangeVenue={(venue) => club.saveSettings({ venue })}
        onChangeFormat={club.changeFormat}
        onChangeCourtCount={(courtCount) => club.saveSettings({ courtCount })}
        account={<AccountButton member={session.currentMember} onClick={openAuth} />}
        tabs={<TabBar tabs={TABS} active={tab} onChange={setTab} />}
      />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px 80px" }}>
        {tab === "booking" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <VenueInfo
              venue={league.venue}
              photo={league.photo}
              amenities={league.amenities}
              photoUploading={club.photoUploading}
              photoError={club.photoError}
              onUploadPhoto={club.uploadVenuePhoto}
              onSetPhotoUrl={club.setVenuePhotoUrl}
              onToggleAmenity={club.toggleAmenity}
            />
            <BookingTab
              bookings={league.bookings}
              players={league.players}
              courtCount={league.courtCount}
              onJoinSlot={club.joinSlot}
              onRemoveParticipant={club.removeParticipant}
            />
          </div>
        )}

        {tab === "myschedule" && (
          <MyScheduleTab league={league} currentMember={session.currentMember} onOpenAuth={openAuth} />
        )}

        {tab === "players" && (
          <PlayersTab
            league={league}
            onAddPlayer={club.addPlayer}
            onRemovePlayer={club.removePlayer}
            onAutoAssignTeams={club.autoAssignTeams}
          />
        )}

        {tab === "schedule" && (
          <ScheduleTab
            league={league}
            onGenerate={club.generateSchedule}
            onUpdateScore={club.updateScore}
            onGenerateNextMexicanoRound={club.generateNextMexicanoRound}
            onRemoveLastMexicanoRound={club.removeLastMexicanoRound}
          />
        )}

        {tab === "standings" && (
          <StandingsTab
            league={league}
            onUploadResultPhoto={club.uploadResultPhoto}
            onSetResultPhotoUrl={club.setResultPhotoUrl}
            resultPhotoUploading={club.resultPhotoUploading}
          />
        )}

        <div style={{ marginTop: 40, textAlign: "center" }}>
          <button
            onClick={() => {
              if (window.confirm("이번 시즌의 대진표를 모두 지우고 새로 시작할까요? (선수·클럽 정보는 유지돼요)"))
                club.resetSeason();
            }}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(27,36,34,0.45)",
              fontSize: 12,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            새 시즌으로 초기화
          </button>
          {club.saveError && (
            <div style={{ marginTop: 8, fontSize: 12, color: C.danger }}>
              저장에 실패했어요. 클럽 관리자 권한이 있는 계정으로 로그인했는지 확인해 주세요.
            </div>
          )}
        </div>
      </div>

      {authModal}
    </div>
  );
}
