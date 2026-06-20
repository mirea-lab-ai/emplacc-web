// Единые форматтеры дат (ru-RU). Заменяют разрозненные toLocaleDateString по коду.

function toDate(value?: string | number | Date | null): Date | null {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 14 фев — короткая дата (день + месяц). */
export function formatDateShort(value?: string | number | Date | null): string {
  const d = toDate(value);
  return d ? d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }) : '';
}

/** 14.02.2026 — полная дата. */
export function formatDate(value?: string | number | Date | null): string {
  const d = toDate(value);
  return d ? d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
}

/** 14.02 15:30 — дата и время. */
export function formatDateTime(value?: string | number | Date | null): string {
  const d = toDate(value);
  return d
    ? d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '';
}
