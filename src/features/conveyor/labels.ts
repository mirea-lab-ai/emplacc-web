import copy from '@/locales/ru/conveyor.json';

type EventsCopy = {
  types?: Record<string, string>;
  entities?: Record<string, string>;
  actions?: Record<string, string>;
  unknown?: string;
};

const events = (copy as { events?: EventsCopy }).events ?? {};

/**
 * Человекочитаемое русское название типа события Conveyor.
 * Приоритет: точный словарь types → композиция «Сущность: действие» из словарей
 * entities/actions → как последний рубеж «обезкличенная» строка (без сырых
 * dotted-ключей), чтобы новые типы событий не светили как `entity.action`.
 */
export function eventLabel(type?: string): string {
  if (!type) return events.unknown ?? 'Событие';
  if (events.types?.[type]) return events.types[type];

  const [entity, action] = type.split('.');
  const e = entity ? events.entities?.[entity] : undefined;
  const a = action ? events.actions?.[action] : undefined;
  if (e && a) return `${e}: ${a}`;
  if (e) return e;
  return type.replace(/[._]/g, ' ').trim();
}
