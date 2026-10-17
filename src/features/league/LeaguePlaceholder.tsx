import { EmptyHint } from "@/components/ui/EmptyHint";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionCard } from "@/components/ui/SectionCard";

/* Stands in for the league screens until they are rebuilt on league events. */
export function LeaguePlaceholder() {
  return (
    <SectionCard>
      <Eyebrow>리그</Eyebrow>
      <EmptyHint text="리그 이벤트(선수 · 대진표 · 순위)는 다음 업데이트에서 돌아와요." />
    </SectionCard>
  );
}
