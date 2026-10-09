// Date picker values are local calendar dates. Never use toISOString() on them.
export function calendarDateToISO(date: Date): string {
  if (!Number.isFinite(date.getTime())) throw new Error('Data inválida.');
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function calendarDateFromISO(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('Data inválida.');
  // Noon avoids midnight DST transitions and Date's 0–99 year shortcut.
  const date = new Date(2000, 0, 1, 12);
  date.setFullYear(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (Number(match[1]) < 1 || calendarDateToISO(date) !== value) throw new Error('Data inválida.');
  return date;
}
export function displayCalendarDate(value: string): string {
  calendarDateFromISO(value);
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}
