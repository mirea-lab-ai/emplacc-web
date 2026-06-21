import { describe, expect, test } from 'bun:test';
import { eventLabel } from '../src/features/conveyor/labels';

// CONVEYOR-EVENTS-RU (task 879a69c8): события показываются русскими названиями,
// а не сырыми ключами вроде criterion.created.

describe('eventLabel', () => {
  test('известные типы → точные русские названия', () => {
    expect(eventLabel('criterion.created')).toBe('Критерий создан');
    expect(eventLabel('evidence.attached')).toBe('Доказательство прикреплено');
    expect(eventLabel('criterion.state_changed')).toBe('Состояние критерия изменено');
  });

  test('неизвестная комбинация → композиция «Сущность: действие», не сырой ключ', () => {
    const label = eventLabel('evidence.created'); // нет в types, но есть entity+action
    expect(label).toBe('Доказательство: создан');
    expect(label).not.toContain('.');
  });

  test('совсем неизвестный тип → без сырого dotted-ключа', () => {
    const label = eventLabel('something.weird_thing');
    expect(label).not.toMatch(/\./); // точек быть не должно
    expect(label.length).toBeGreaterThan(0);
  });

  test('пустой тип → дефолтная подпись', () => {
    expect(eventLabel(undefined)).toBe('Событие');
    expect(eventLabel('')).toBe('Событие');
  });

  test('ни один известный отображаемый тип не остаётся сырым ключом', () => {
    const displayed = [
      'criterion.created', 'criterion.state_changed', 'evidence.attached', 'evidence.revoked',
      'agent_run.registered', 'agent_run.status_changed', 'approval.requested', 'approval.granted',
      'approval.denied', 'task.linked', 'task.completed', 'work_order.created', 'work_order.completed',
      'waiver.created', 'generated_report.created',
    ];
    for (const t of displayed) {
      const label = eventLabel(t);
      expect(label).not.toBe(t);
      expect(label).not.toContain('.');
    }
  });
});
