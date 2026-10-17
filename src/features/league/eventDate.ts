import { zonedDate } from "@/features/booking/slots";

const localTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Today as YYYY-MM-DD where the viewer is. */
export const todayDate = () => zonedDate(new Date(), localTimeZone());

/** "10/24 (금)" for a YYYY-MM-DD event date. */
export function formatEventDate(date: string) {
  const [, month, day] = date.split("-").map(Number);
  const weekday = new Date(`${date}T00:00:00`).toLocaleDateString("ko-KR", { weekday: "short" });
  return `${month}/${day} (${weekday})`;
}
