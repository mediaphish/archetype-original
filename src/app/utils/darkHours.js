// Dark hours: 6:00pm–10:00am CST
const TZ = "America/Chicago";
const START_HOUR = 18; // inclusive
const END_HOUR = 10;   // exclusive

export function cstNow() {
  // Return a Date object that represents current time, but we'll always interpret in CST for logic/formatting.
  return new Date();
}

export function isDarkHours(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    hourCycle: "h23",
    timeZone: TZ,
    hour: "2-digit"
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value || "0");
  return hour >= START_HOUR || hour < END_HOUR;
}

export function fmtCST(date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}
