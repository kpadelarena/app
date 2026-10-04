import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { EmptyHint } from "@/components/ui/EmptyHint";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SectionCard } from "@/components/ui/SectionCard";
import type { League } from "@/lib/types";
import { C, FONT } from "@/styles/tokens";
import { CourtMatch } from "./CourtMatch";
import { nameOf } from "./names";

const FORMAT_DESCRIPTION = {
  americano: "매 라운드 파트너가 바뀌는 아메리카노 방식이에요.",
  mexicano: "매 라운드 현재 순위 기준으로 짝을 다시 맞추는 멕시카노 방식이에요.",
  round_robin: "고정된 팀끼리 한 번씩 맞붙는 라운드로빈 방식이에요.",
};

interface ScheduleTabProps {
  league: Pick<League, "format" | "players" | "teams" | "rounds">;
  /** Creates (or re-creates) the schedule; `numRounds` only applies to Americano. */
  onGenerate: (numRounds: number) => void;
  onUpdateScore: (roundIndex: number, matchId: string, field: "scoreA" | "scoreB", value: string) => void;
  onGenerateNextMexicanoRound: () => void;
  onRemoveLastMexicanoRound: () => void;
}

export function ScheduleTab({
  league,
  onGenerate,
  onUpdateScore,
  onGenerateNextMexicanoRound,
  onRemoveLastMexicanoRound,
}: ScheduleTabProps) {
  const [numRounds, setNumRounds] = useState(5);
  const isMexicano = league.format === "mexicano";
  const isAmericano = league.format === "americano";
  const isIndividual = isAmericano || isMexicano;
  const hasRounds = league.rounds.length > 0;
  const canGenerate = isIndividual ? league.players.length >= 4 : league.teams.length >= 2;
  const generate = () => onGenerate(numRounds);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionCard>
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}
        >
          <div>
            <Eyebrow>대진표 생성</Eyebrow>
            <div style={{ fontSize: 12, color: "rgba(27,36,34,0.55)", marginTop: 4 }}>
              {FORMAT_DESCRIPTION[league.format]}
            </div>
          </div>
          {isAmericano && (
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              라운드 수
              <input
                type="number"
                min={1}
                max={20}
                value={numRounds}
                onChange={(e) => setNumRounds(Number(e.target.value) || 1)}
                style={{
                  width: 52,
                  padding: "6px 8px",
                  borderRadius: 8,
                  border: "1px solid rgba(0,0,0,0.15)",
                  fontFamily: FONT.mono,
                  textAlign: "center",
                }}
              />
            </label>
          )}
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {isMexicano ? (
            <>
              <PrimaryButton
                onClick={hasRounds ? onGenerateNextMexicanoRound : generate}
                icon={RefreshCw}
                disabled={!canGenerate}
              >
                {hasRounds ? "다음 라운드 생성" : "1라운드 생성"}
              </PrimaryButton>
              {hasRounds && (
                <PrimaryButton
                  onClick={onRemoveLastMexicanoRound}
                  style={{ background: "transparent", color: C.danger, border: `1px solid ${C.danger}` }}
                >
                  마지막 라운드 취소
                </PrimaryButton>
              )}
            </>
          ) : (
            <PrimaryButton onClick={generate} icon={RefreshCw} disabled={!canGenerate}>
              {hasRounds ? "대진표 다시 생성" : "대진표 생성"}
            </PrimaryButton>
          )}
        </div>

        {isMexicano && hasRounds && (
          <div style={{ marginTop: 8, fontSize: 12, color: "rgba(27,36,34,0.5)" }}>
            다음 라운드는 지금까지 입력된 점수를 기준으로 순위를 다시 계산해 짝을 맞춰요. 이번 라운드 점수를 먼저
            입력하세요.
          </div>
        )}

        {!canGenerate && (
          <div style={{ marginTop: 10, fontSize: 12, color: "rgba(27,36,34,0.5)" }}>
            {isIndividual
              ? "선수 · 팀 탭에서 4명 이상 등록해 주세요."
              : "선수 · 팀 탭에서 팀을 2개 이상 편성해 주세요."}
          </div>
        )}
      </SectionCard>

      {!hasRounds ? (
        <EmptyHint text="아직 생성된 라운드가 없어요." />
      ) : (
        league.rounds.map((round, ri) => (
          <div key={round.roundNumber}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
              <span style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700 }}>ROUND {round.roundNumber}</span>
              {round.sitOut && round.sitOut.length > 0 && (
                <span style={{ fontSize: 12, color: "rgba(27,36,34,0.5)" }}>
                  대기: {round.sitOut.map((id) => nameOf(league, id)).join(", ")}
                </span>
              )}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 12,
              }}
            >
              {round.matches.map((m) => (
                <CourtMatch
                  key={m.id}
                  match={m}
                  nameOf={(id) => nameOf(league, id)}
                  onScore={(field, value) => onUpdateScore(ri, m.id, field, value)}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
