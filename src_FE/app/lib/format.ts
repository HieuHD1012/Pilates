/**
 * Vietnamese-first formatting. Every user-facing number, date and time in this
 * product goes through here so that a studio in Nha Trang reads one consistent
 * convention — and so nothing accidentally renders in en-US.
 */

export const STUDIO_TIME_ZONE = "Asia/Ho_Chi_Minh";
const LOCALE = "vi-VN";

const currency = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const compactNumber = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

const timeOfDay = new Intl.DateTimeFormat(LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: STUDIO_TIME_ZONE,
});

const dayMonth = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
  timeZone: STUDIO_TIME_ZONE,
});

const fullDate = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: STUDIO_TIME_ZONE,
});

/** "1.250.000 ₫" */
export function formatVnd(amount: number): string {
  return currency.format(amount);
}

/**
 * Every number the product prints goes through here, and negatives carry a real
 * minus sign (U+2212) rather than the hyphen `Intl` emits. That is a typeface
 * decision, not a ledger one: in the display serif a hyphen is narrower than the
 * digits beside it, so a hyphen-minus breaks any column it lands in.
 */
export function formatNumber(value: number): string {
  return compactNumber.format(value).replace("-", "\u2212");
}

/**
 * A change, which states its own direction — `+10`, `\u22124`. A balance uses
 * `formatNumber`: a plus sign on a total reads as an increase that is not there.
 */
export function formatSigned(value: number): string {
  return value > 0 ? `+${formatNumber(value)}` : formatNumber(value);
}

/** "06:30" */
export function formatTime(iso: string): string {
  return timeOfDay.format(new Date(iso));
}

/** "06:30 – 07:20" — en dash flanked by thin spaces (U+2009). */
export function formatTimeRange(startIso: string, endIso: string): string {
  return `${formatTime(startIso)}\u2009\u2013\u2009${formatTime(endIso)}`;
}

/** "18/08" */
export function formatDayMonth(iso: string): string {
  return dayMonth.format(new Date(iso));
}

/** "18/08/2026" */
export function formatDate(iso: string): string {
  return fullDate.format(new Date(iso));
}

const WEEKDAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"] as const;
const WEEKDAY_LONG = [
  "Chủ nhật",
  "Thứ hai",
  "Thứ ba",
  "Thứ tư",
  "Thứ năm",
  "Thứ sáu",
  "Thứ bảy",
] as const;

export function weekdayShort(iso: string): string {
  return WEEKDAY_SHORT[dayIndexInStudioTz(iso)] ?? "";
}

export function weekdayLong(iso: string): string {
  return WEEKDAY_LONG[dayIndexInStudioTz(iso)] ?? "";
}

function dayIndexInStudioTz(iso: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: STUDIO_TIME_ZONE,
  }).format(new Date(iso));
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[parts] ?? 0;
}

/** Minutes between two ISO timestamps. Used for calendar block heights. */
export function minutesBetween(startIso: string, endIso: string): number {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000);
}

/** "còn 3 giờ 20 phút" style relative lead time, floored at zero. */
export function formatLeadTime(targetIso: string, now = new Date()): string {
  const diffMinutes = Math.floor((new Date(targetIso).getTime() - now.getTime()) / 60_000);
  if (diffMinutes <= 0) return "đã qua";
  if (diffMinutes < 60) return `${diffMinutes} phút`;
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (hours < 24) return minutes === 0 ? `${hours} giờ` : `${hours} giờ ${minutes} phút`;
  const days = Math.floor(hours / 24);
  return `${days} ngày`;
}

/** Calendar date key in the studio timezone, e.g. "2026-08-18". */
export function studioDateKey(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-CA", { timeZone: STUDIO_TIME_ZONE }).format(value);
}

/** Monday-based start of the week containing `date`, as a studio date key. */
export function startOfStudioWeek(date: Date | string): string {
  const key = studioDateKey(date);
  const parts = key.split("-").map(Number);
  const [y, m, d] = parts as [number, number, number];
  const utc = new Date(Date.UTC(y, m - 1, d));
  const dow = (utc.getUTCDay() + 6) % 7; // Monday = 0
  utc.setUTCDate(utc.getUTCDate() - dow);
  return utc.toISOString().slice(0, 10);
}

export function addDays(dateKey: string, days: number): string {
  const parts = dateKey.split("-").map(Number);
  const [y, m, d] = parts as [number, number, number];
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

/**
 * Vietnamese mobile numbers, grouped 4-3-3 for reading aloud.
 *
 * The fixtures happen to ship pre-spaced strings, which hid the fact that no
 * formatter existed — a real backend, and every record created through the studio
 * form, stores bare digits. Staff read these numbers off the screen while dialling,
 * so the grouping is functional, not decorative.
 *
 * Anything that is not a recognisable Vietnamese mobile is returned untouched: a
 * landline, an international number or a typo should be shown exactly as recorded
 * rather than regrouped into something that looks official and is wrong.
 */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const local = digits.startsWith("84")
    ? `0${digits.slice(2)}`
    : digits.startsWith("0")
      ? digits
      : null;
  if (local === null || local.length !== 10) return raw;
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}

/**
 * A dialable `tel:` href. Eight call sites were each stripping separators with
 * their own regex, two of which disagreed about dots and hyphens — so a number
 * recorded as "0911.000.001" produced a link that dialled nothing on those pages.
 */
export function telHref(raw: string): string {
  return `tel:${raw.replace(/[^\d+]/g, "")}`;
}
