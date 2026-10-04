export function generateTimeSlots(startHour: number, endHour: number, stepMinutes: number) {
  const slots: string[] = [];
  let mins = startHour * 60;
  const end = endHour * 60;
  while (mins <= end) {
    const h = String(Math.floor(mins / 60)).padStart(2, "0");
    const m = String(mins % 60).padStart(2, "0");
    slots.push(`${h}:${m}`);
    mins += stepMinutes;
  }
  return slots;
}

export const TIME_SLOTS = generateTimeSlots(7, 22, 60);

const WEEKDAY_KR = ["일", "월", "화", "수", "목", "금", "토"];

export interface DayOption {
  iso: string;
  label: string;
  weekday: string;
  isToday: boolean;
}

export function nextDays(count: number) {
  const out: DayOption[] = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push({
      iso: d.toISOString().slice(0, 10),
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      weekday: WEEKDAY_KR[d.getDay()],
      isToday: i === 0,
    });
  }
  return out;
}
