import { useState } from "react";
import { ArrowLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { chipStyle } from "@/components/ui/chipStyle";
import { EmptyHint } from "@/components/ui/EmptyHint";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { fieldStyle } from "@/components/ui/fieldStyle";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { FORMATS } from "@/features/club/constants";
import type { NewLeague } from "@/lib/db";
import type { LeagueFormat, LeagueSummary, Member } from "@/lib/types";
import { C, FONT } from "@/styles/tokens";
import { type LeagueTabKey } from "@/features/club/routes";
import { formatEventDate, todayDate } from "./eventDate";
import { PlayersTab } from "./PlayersTab";
import { ScheduleTab } from "./ScheduleTab";
import { StandingsTab } from "./StandingsTab";
import { useLeague } from "./useLeague";
import { useLeagues } from "./useLeagues";

const dim = "rgba(27,36,34,0.55)";
const formatLabel = (format: LeagueFormat) => FORMATS.find((f) => f.key === format)?.label ?? format;

const SaveError = () => (
  <div style={{ textAlign: "center", fontSize: 12, color: C.danger }}>
    저장에 실패했어요. 권한이 있는지 확인해 주세요.
  </div>
);

/* ---------------------------------------------------------
   Event list
--------------------------------------------------------- */
function LeagueRow({ league, onClick }: { league: LeagueSummary; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "10px 12px",
        borderRadius: 10,
        border: "none",
        background: C.paperDim,
        color: C.charcoal,
        fontFamily: FONT.body,
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <div>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{league.name}</div>
        <div style={{ fontSize: 12, color: dim, marginTop: 2 }}>
          {formatEventDate(league.eventDate)} · {formatLabel(league.format)} · 코트 {league.courtCount}면 ·{" "}
          {league.playerCount}명
        </div>
      </div>
      <ChevronRight size={16} color={dim} />
    </button>
  );
}

function NewLeagueForm({
  venueId,
  onCreate,
  onCancel,
}: {
  venueId: string;
  onCreate: (input: NewLeague) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [format, setFormat] = useState<LeagueFormat>("americano");
  const [eventDate, setEventDate] = useState(todayDate);
  const [courtCount, setCourtCount] = useState(2);
  const valid = name.trim().length > 0 && eventDate.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="이벤트 이름 (예: 10월 아메리카노 나이트)"
        style={{ ...fieldStyle, outline: "none" }}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {FORMATS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFormat(f.key)}
            title={f.tooltip}
            style={chipStyle(format === f.key, C.turf)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} style={fieldStyle} />
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          코트
          <input
            type="number"
            min={1}
            max={8}
            value={courtCount}
            onChange={(e) => setCourtCount(Math.min(8, Math.max(1, Number(e.target.value) || 1)))}
            style={{ ...fieldStyle, width: 64, fontFamily: FONT.mono, textAlign: "center" }}
          />
          면
        </label>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <PrimaryButton
          onClick={() => onCreate({ venueId, name: name.trim(), format, eventDate, courtCount })}
          icon={Plus}
          disabled={!valid}
        >
          이벤트 만들기
        </PrimaryButton>
        <PrimaryButton onClick={onCancel} style={{ background: "transparent", color: C.charcoal }}>
          취소
        </PrimaryButton>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   One event: roster, schedule and standings
--------------------------------------------------------- */
const DETAIL_TABS = [
  { key: "players", label: "선수 · 팀" },
  { key: "schedule", label: "대진표" },
  { key: "standings", label: "순위" },
] as const;
type DetailTab = LeagueTabKey;

interface LeagueDetailProps {
  leagueId: string;
  tab: DetailTab;
  onTab: (tab: DetailTab) => void;
  member: Member | null;
  isAdmin: boolean;
  onBack: () => void;
  onDelete: () => void;
  onOpenAuth: () => void;
}

function LeagueDetail({ leagueId, tab, onTab, member, isAdmin, onBack, onDelete, onOpenAuth }: LeagueDetailProps) {
  const lg = useLeague(leagueId, member?.id ?? null);
  const { league } = lg;

  const remove = () => {
    if (!confirm("이벤트를 삭제할까요? 선수 · 대진표 · 순위가 함께 삭제돼요.")) return;
    onDelete();
    onBack();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <button
            onClick={onBack}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "none",
              border: "none",
              padding: 0,
              fontSize: 12,
              fontWeight: 700,
              color: dim,
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={14} /> 이벤트 목록
          </button>
          {isAdmin && league && (
            <button
              onClick={remove}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: "none",
                border: "none",
                padding: 0,
                fontSize: 12,
                fontWeight: 700,
                color: C.danger,
                cursor: "pointer",
              }}
            >
              <Trash2 size={14} /> 이벤트 삭제
            </button>
          )}
        </div>

        {lg.loading ? (
          <EmptyHint text="불러오는 중..." />
        ) : !league ? (
          <EmptyHint text="이벤트를 찾을 수 없어요. 삭제되었을 수 있어요." />
        ) : (
          <>
            <div style={{ fontFamily: FONT.display, fontSize: 24, fontWeight: 700, marginTop: 12 }}>{league.name}</div>
            <div style={{ fontSize: 13, color: dim, marginTop: 4 }}>
              {formatEventDate(league.eventDate)} · {formatLabel(league.format)} · 코트 {league.courtCount}면
            </div>
            {member ? (
              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                {DETAIL_TABS.map((t) => (
                  <button key={t.key} onClick={() => onTab(t.key)} style={chipStyle(tab === t.key, C.ink)}>
                    {t.label}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <EmptyHint text="로그인하면 선수 명단과 대진표, 순위를 볼 수 있어요." />
                <div style={{ marginTop: 12 }}>
                  <PrimaryButton onClick={onOpenAuth}>회원가입 · 로그인</PrimaryButton>
                </div>
              </>
            )}
          </>
        )}
      </SectionCard>

      {league && member && tab === "players" && (
        <PlayersTab
          league={league}
          canEdit={isAdmin}
          onAddMember={lg.addMember}
          onAddGuest={lg.addGuest}
          onRemovePlayer={lg.removePlayer}
          onAutoAssignTeams={lg.autoAssignTeams}
        />
      )}
      {league && member && tab === "schedule" && (
        <ScheduleTab
          league={league}
          canEdit={isAdmin}
          canScore={(match) => isAdmin || lg.playsIn(match)}
          onGenerate={lg.generateSchedule}
          onUpdateScore={lg.updateScore}
          onGenerateNextMexicanoRound={lg.generateNextMexicanoRound}
          onRemoveLastMexicanoRound={lg.removeLastRound}
        />
      )}
      {league && member && tab === "standings" && (
        <StandingsTab
          league={league}
          canEdit={isAdmin}
          onUploadResultPhoto={lg.uploadResultPhoto}
          onSetResultPhotoUrl={lg.setResultPhotoUrl}
          resultPhotoUploading={lg.resultPhotoUploading}
        />
      )}
      {lg.saveError && <SaveError />}
    </div>
  );
}

/* ---------------------------------------------------------
   The 리그 tab: the venue's events, and one event when picked
--------------------------------------------------------- */
interface LeagueTabProps {
  venueId: string;
  member: Member | null;
  isAdmin: boolean;
  /** The open event and its inner tab come from the URL. */
  leagueId: string | null;
  leagueTab: DetailTab;
  onOpenLeague: (leagueId: string | null) => void;
  onLeagueTab: (tab: DetailTab) => void;
  onOpenAuth: () => void;
}

export function LeagueTab({
  venueId,
  member,
  isAdmin,
  leagueId: selectedId,
  leagueTab,
  onOpenLeague,
  onLeagueTab,
  onOpenAuth,
}: LeagueTabProps) {
  const [creating, setCreating] = useState(false);
  const events = useLeagues(venueId, member?.id ?? null);

  if (selectedId) {
    return (
      <LeagueDetail
        leagueId={selectedId}
        tab={leagueTab}
        onTab={onLeagueTab}
        member={member}
        isAdmin={isAdmin}
        onBack={() => onOpenLeague(null)}
        onDelete={() => events.deleteLeague(selectedId)}
        onOpenAuth={onOpenAuth}
      />
    );
  }

  const today = todayDate();
  const upcoming = events.leagues
    .filter((l) => l.eventDate >= today)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const past = events.leagues.filter((l) => l.eventDate < today);

  const create = async (input: NewLeague) => {
    const id = await events.createLeague(input);
    if (!id) return;
    setCreating(false);
    onOpenLeague(id);
  };

  const list = (items: LeagueSummary[]) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
      {items.map((l) => (
        <LeagueRow key={l.id} league={l} onClick={() => onOpenLeague(l.id)} />
      ))}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Eyebrow>리그 이벤트</Eyebrow>
          {isAdmin && !creating && (
            <PrimaryButton onClick={() => setCreating(true)} icon={Plus}>
              새 이벤트
            </PrimaryButton>
          )}
        </div>
        {creating && <NewLeagueForm venueId={venueId} onCreate={create} onCancel={() => setCreating(false)} />}
        {events.loading ? null : upcoming.length === 0 ? (
          <EmptyHint
            text={isAdmin ? "예정된 리그 이벤트가 없어요. 새 이벤트를 만들어 보세요." : "예정된 리그 이벤트가 없어요."}
          />
        ) : (
          list(upcoming)
        )}
      </SectionCard>

      {past.length > 0 && (
        <SectionCard>
          <Eyebrow>지난 이벤트</Eyebrow>
          {list(past)}
        </SectionCard>
      )}
      {events.saveError && <SaveError />}
    </div>
  );
}
