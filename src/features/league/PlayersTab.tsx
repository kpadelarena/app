import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Shuffle, X } from "lucide-react";
import { EmptyHint } from "@/components/ui/EmptyHint";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { fieldStyle } from "@/components/ui/fieldStyle";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SectionCard } from "@/components/ui/SectionCard";
import { getMembers } from "@/lib/db";
import { queryKeys } from "@/lib/queryKeys";
import type { League } from "@/lib/types";
import { C, FONT } from "@/styles/tokens";

const dim = "rgba(27,36,34,0.5)";

interface PlayersTabProps {
  league: Pick<League, "players" | "teams" | "format">;
  /** Admins manage the roster and teams. */
  canEdit: boolean;
  onAddMember: (profileId: string) => void;
  onAddGuest: (name: string) => void;
  onRemovePlayer: (leaguePlayerId: string) => void;
  onAutoAssignTeams: () => void;
}

export function PlayersTab({
  league,
  canEdit,
  onAddMember,
  onAddGuest,
  onRemovePlayer,
  onAutoAssignTeams,
}: PlayersTabProps) {
  const [memberId, setMemberId] = useState("");
  const [guestName, setGuestName] = useState("");
  const { data: members = [] } = useQuery({ queryKey: queryKeys.members, queryFn: getMembers, enabled: canEdit });
  const inRoster = new Set(league.players.map((p) => p.profileId));
  const available = members.filter((m) => !inRoster.has(m.id));

  const addMember = () => {
    if (!memberId) return;
    setMemberId("");
    onAddMember(memberId);
  };
  const addGuest = () => {
    const name = guestName.trim();
    if (!name) return;
    setGuestName("");
    onAddGuest(name);
  };
  const assignTeams = () => {
    if (league.teams.length > 0 && !confirm("팀을 다시 편성하면 대진표가 초기화돼요. 계속할까요?")) return;
    onAutoAssignTeams();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionCard>
        <Eyebrow>선수</Eyebrow>
        {canEdit && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <select value={memberId} onChange={(e) => setMemberId(e.target.value)} style={{ ...fieldStyle, flex: 1 }}>
                <option value="">회원 선택</option>
                {available.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · {m.level.toFixed(1)}
                  </option>
                ))}
              </select>
              <PrimaryButton onClick={addMember} icon={Plus} disabled={!memberId}>
                추가
              </PrimaryButton>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addGuest()}
                placeholder="게스트 이름"
                style={{ ...fieldStyle, flex: 1, outline: "none" }}
              />
              <PrimaryButton onClick={addGuest} icon={Plus} disabled={!guestName.trim()}>
                게스트
              </PrimaryButton>
            </div>
          </div>
        )}

        {league.players.length === 0 ? (
          <EmptyHint text="선수를 4명 이상 등록하면 대진표를 만들 수 있어요." />
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
            {league.players.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: canEdit ? "6px 8px 6px 12px" : "6px 12px",
                  borderRadius: 999,
                  background: C.paperDim,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {p.name}
                {p.isGuest && <span style={{ fontSize: 10, fontWeight: 700, color: dim }}>게스트</span>}
                {canEdit && (
                  <button
                    onClick={() => onRemovePlayer(p.id)}
                    aria-label={`${p.name} 제외`}
                    style={{ background: "none", border: "none", cursor: "pointer", display: "flex", color: dim }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 10, fontSize: 12, color: dim }}>총 {league.players.length}명 등록됨</div>
      </SectionCard>

      {league.format === "round_robin" && (
        <SectionCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Eyebrow>팀 편성</Eyebrow>
            {canEdit && (
              <PrimaryButton onClick={assignTeams} icon={Shuffle} disabled={league.players.length < 2}>
                자동 팀 편성
              </PrimaryButton>
            )}
          </div>
          {league.teams.length === 0 ? (
            <EmptyHint text="선수를 등록한 뒤 자동 팀 편성을 눌러 2인 1팀으로 묶어주세요." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
              {league.teams.map((t, i) => (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: C.paperDim,
                  }}
                >
                  <span style={{ fontFamily: FONT.mono, fontSize: 12, fontWeight: 700, color: dim }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}
