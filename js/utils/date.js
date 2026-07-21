export const APP_TZ_OFFSET = -3; // UTC-3 (Horário de Brasília)

// Converts a Date to YYYY-MM-DD string using the app timezone (UTC-3),
// avoiding the UTC offset bug that shifts dates near midnight.
export function toDateStr(d) {
  const t = new Date(d.getTime() + APP_TZ_OFFSET * 3600000);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}

export function todayStr() {
  return toDateStr(new Date());
}

export function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function fmtShort(d) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function weekInputVal(monday) {
  const d = new Date(monday);
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const startOfWeek = new Date(jan4);
  startOfWeek.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1);
  const weekNum = Math.ceil(((d - startOfWeek) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// Returns the Monday-start weeks (as { start, end } Date pairs) that cover
// every day of the given month, in order.
export function getWeeksOfMonth(year, month) {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const weeks = [];
  let cursor = getMondayOf(first);
  while (cursor <= last) {
    const start = new Date(cursor);
    const end   = new Date(cursor);
    end.setDate(end.getDate() + 6);
    weeks.push({ start, end });
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() + 7);
  }
  return weeks;
}

// Index (0-based) of the Monday-start week (within its month's week list)
// that contains the given date string 'YYYY-MM-DD'.
export function weekOfMonthIndex(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date  = new Date(y, m - 1, d);
  const weeks = getWeeksOfMonth(y, m - 1);
  return weeks.findIndex(w => date >= w.start && date <= w.end);
}

export function monthInputVal(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
