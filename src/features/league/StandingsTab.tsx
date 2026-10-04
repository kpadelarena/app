import type { ReactNode } from "react";
import { EmptyHint } from "@/components/ui/EmptyHint";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { PhotoInput } from "@/components/ui/PhotoInput";
import { SectionCard } from "@/components/ui/SectionCard";
import { Td, Th } from "@/components/ui/Table";
import type { League } from "@/lib/types";
import { C, FONT } from "@/styles/tokens";
import { individualStandings, teamStandings, type PlayerStanding, type TeamStanding } from "./standings";

interface Column<Row> {
  header: string;
  cell: (row: Row) => ReactNode;
}

const strong = (value: ReactNode) => <span style={{ fontFamily: FONT.mono, fontWeight: 700 }}>{value}</span>;

const PLAYER_COLUMNS: Column<PlayerStanding>[] = [
  { header: "경기", cell: (s) => s.played },
  { header: "승", cell: (s) => s.wins },
  { header: "포인트", cell: (s) => strong(s.points) },
];

const TEAM_COLUMNS: Column<TeamStanding>[] = [
  { header: "경기", cell: (s) => s.played },
  { header: "승", cell: (s) => s.win },
  { header: "패", cell: (s) => s.loss },
  { header: "득실차", cell: (s) => (s.diff > 0 ? `+${s.diff}` : s.diff) },
  { header: "승점", cell: (s) => strong(s.pts) },
];

interface StandingsTableProps<Row> {
  nameHeader: string;
  rows: Row[];
  columns: Column<Row>[];
}

function StandingsTable<Row extends { id: string; name: string }>({
  nameHeader,
  rows,
  columns,
}: StandingsTableProps<Row>) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: `2px solid ${C.ink}` }}>
          <Th align="left">#</Th>
          <Th align="left">{nameHeader}</Th>
          {columns.map((col) => (
            <Th key={col.header}>{col.header}</Th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr
            key={row.id}
            style={{
              borderBottom: "1px solid rgba(0,0,0,0.06)",
              background: i < 3 ? "rgba(215,241,59,0.15)" : "transparent",
            }}
          >
            <Td>
              <span style={{ fontFamily: FONT.mono, fontWeight: 700, color: i === 0 ? C.turf : C.charcoal }}>
                {i + 1}
              </span>
            </Td>
            <Td align="left">
              <span style={{ fontWeight: 700 }}>{row.name}</span>
            </Td>
            {columns.map((col) => (
              <Td key={col.header}>{col.cell(row)}</Td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface StandingsTabProps {
  league: Pick<League, "name" | "format" | "players" | "teams" | "rounds" | "resultPhoto">;
  onUploadResultPhoto: (file: File) => void;
  onSetResultPhotoUrl: (url: string) => void;
  resultPhotoUploading: boolean;
}

export function StandingsTab({
  league,
  onUploadResultPhoto,
  onSetResultPhotoUrl,
  resultPhotoUploading,
}: StandingsTabProps) {
  const table =
    league.format === "round_robin" ? (
      <StandingsTable nameHeader="팀" rows={teamStandings(league.teams, league.rounds)} columns={TEAM_COLUMNS} />
    ) : (
      <StandingsTable
        nameHeader="선수"
        rows={individualStandings(league.players, league.rounds)}
        columns={PLAYER_COLUMNS}
      />
    );
  const isEmpty = (league.format === "round_robin" ? league.teams : league.players).length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionCard>
        <Eyebrow>결과 사진</Eyebrow>
        {league.resultPhoto && (
          <img
            src={league.resultPhoto}
            alt="경기 결과"
            style={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 12, marginTop: 10 }}
          />
        )}
        <div style={{ marginTop: 10 }}>
          <PhotoInput
            label={league.resultPhoto ? "사진 교체" : "사진 추가"}
            uploading={resultPhotoUploading}
            onFile={onUploadResultPhoto}
            onSetUrl={onSetResultPhotoUrl}
          />
        </div>
      </SectionCard>

      {isEmpty ? (
        <EmptyHint text="아직 순위 데이터가 없어요. 대진표에서 경기 결과를 입력해 주세요." />
      ) : (
        <SectionCard>
          <Eyebrow>{league.name} · 순위</Eyebrow>
          <div style={{ marginTop: 14, overflowX: "auto" }}>{table}</div>
        </SectionCard>
      )}
    </div>
  );
}
