import { describe, expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TaskGrid, { type Task } from '../src/components/admin/tasks/TaskGrid';

function makeTasks(count: number): Task[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `task-${index}`,
    title: `Task ${index}`,
    subtasks: index % 5 === 0 ? [{ id: `subtask-${index}`, title: `Subtask ${index}` }] : [],
  }));
}

describe('Conveyor performance budgets', () => {
  test('renders a 500-card board under the 1s MVP budget', () => {
    const tasks = makeTasks(500);
    const startedAt = performance.now();

    const markup = renderToStaticMarkup(<TaskGrid tasks={tasks} />);

    const elapsedMs = performance.now() - startedAt;
    const renderedCards = (markup.match(/Task \d+/g) ?? []).length;
    console.info(`conveyor_board_500_cards_ms=${elapsedMs.toFixed(2)} html_bytes=${markup.length}`);
    expect(renderedCards).toBe(500);
    expect(elapsedMs).toBeLessThan(1000);
  });
});
