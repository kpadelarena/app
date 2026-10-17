import type { LeagueFormat } from "@/lib/types";

export const VENUES = ["Yongsan Mmove", "Gimpo Padel Society", "Dongtan Garros Padel"];

/** Every venue is in Korea; booking dates and hours are in this timezone. */
export const VENUE_TIME_ZONE = "Asia/Seoul";

export const AMENITIES = [
  { key: "parking", label: "주차" },
  { key: "lockerRoom", label: "탈의실" },
  { key: "shower", label: "샤워시설" },
  { key: "restroom", label: "화장실" },
  { key: "racketRental", label: "라켓대여" },
  { key: "wifi", label: "와이파이" },
];

export const FORMATS: { key: LeagueFormat; label: string; tooltip: string }[] = [
  {
    key: "americano",
    label: "아메리카노 · 개인전",
    tooltip: "매 라운드 파트너가 바뀌며 모두와 한 번씩 게임해요. 개인 포인트 합산으로 순위를 매겨요.",
  },
  {
    key: "mexicano",
    label: "멕시카노 · 개인전",
    tooltip:
      "라운드마다 현재 순위를 기준으로 짝을 다시 맞춰요 (1위+4위 vs 2위+3위). 실력 차가 나도 접전이 되도록 유도해요.",
  },
  {
    key: "round_robin",
    label: "라운드로빈 · 팀전",
    tooltip: "처음에 정한 고정 팀끼리 서로 한 번씩 맞붙는 리그전 방식이에요. (이 형식은 아직 이 기기에만 저장돼요)",
  },
];
