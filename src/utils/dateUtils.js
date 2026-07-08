// Shared date / time / attendance helpers (extracted from App.jsx so page
// components can import them without depending on the App module).

export const isoToday = new Date().toISOString().slice(0, 10);

export function formatDateTime(value) {
  if (!value) return "No timestamp";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid timestamp";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatShortDate(value) {
  if (!value) return "No date";
  const date = String(value).includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getWeekStart(date = new Date()) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function isWithinCurrentWeek(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const start = getWeekStart();
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return date >= start && date < end;
}

export function isLateCheckIn(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getHours() > 9 || (date.getHours() === 9 && date.getMinutes() > 30);
}

export function getAttendanceStatus(record) {
  if (!record) return "Not Checked In";
  if (record.checkOut) return "Checked Out";
  if (isLateCheckIn(record.checkIn)) return "Late";
  return "Present";
}

export function getDaysUntil(value, todayDate = new Date()) {
  if (!value) return Number.POSITIVE_INFINITY;
  const target = new Date(`${value}T23:59:59`);
  const start = new Date(todayDate);
  start.setHours(0, 0, 0, 0);
  return Math.ceil((target - start) / 86400000);
}
