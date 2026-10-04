import { useState } from "react";
import { Plus, Shuffle, X } from "lucide-react";
import { EmptyHint } from "@/components/ui/EmptyHint";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { fieldStyle } from "@/components/ui/fieldStyle";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SectionCard } from "@/components/ui/SectionCard";
import type { League } from "@/lib/types";
import { C, FONT } from "@/styles/tokens";

interface PlayersTabProps {
  league: Pick<League, "players" | "teams" | "format">;
  onAddPlayer: (name: string) => void;
  onRemovePlayer: (id: string) => void;
  onAutoAssignTeams: () => void;
}

export function PlayersTab({ league, onAddPlayer, onRemovePlayer, onAutoAssignTeams }: PlayersTabProps) {
  const [newPlayerName, setNewPlayerName] = useState("");

  const addPlayer = () => {
    const name = newPlayerName.trim();
    if (!name) return;
    setNewPlayerName("");
    onAddPlayer(name);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionCard>
        <Eyebrow>선수 등록</Eyebrow>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPlayer()}
            placeholder="이름 입력"
            style={{ ...fieldStyle, flex: 1, outline: "none" }}
          />
          <PrimaryButton onClick={addPlayer} icon={Plus}>
            추가
          </PrimaryButton>
        </div>

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
                  padding: "6px 8px 6px 12px",
                  borderRadius: 999,
                  background: C.paperDim,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {p.name}
                <button
                  onClick={() => onRemovePlayer(p.id)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    color: "rgba(27,36,34,0.5)",
                  }}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 10, fontSize: 12, color: "rgba(27,36,34,0.5)" }}>
          총 {league.players.length}명 등록됨
        </div>
      </SectionCard>

      {league.format === "round_robin" && (
        <SectionCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Eyebrow>팀 편성</Eyebrow>
            <PrimaryButton onClick={onAutoAssignTeams} icon={Shuffle} disabled={league.players.length < 2}>
              자동 팀 편성
            </PrimaryButton>
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
                  <span style={{ fontFamily: FONT.mono, fontSize: 12, fontWeight: 700, color: "rgba(27,36,34,0.5)" }}>
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
