import { describe, expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ToastProvider } from '../src/components/ui/Toast';
import { ConveyorApiError } from '../src/features/conveyor/api';
import {
  ConveyorForumDigestPanel,
  ConveyorGeneratedReportPanel,
  ConveyorTaskPanel,
  ConveyorWorkOrderSection,
  ErrorText,
} from '../src/features/conveyor/components';
import copy from '../src/locales/ru/conveyor.json';

function renderWithToast(element: React.ReactElement) {
  return renderToStaticMarkup(<ToastProvider>{element}</ToastProvider>);
}

function disabledCount(markup: string) {
  return (markup.match(/disabled=""/g) ?? []).length;
}

describe('Conveyor web behavior states', () => {
  test('task panel renders a loading skeleton before snapshot data arrives', () => {
    const markup = renderWithToast(<ConveyorTaskPanel taskId="task-1" />);

    expect(markup).toContain(copy.taskPanel.title);
    expect(markup).toContain(copy.taskPanel.retry);
    expect((markup.match(/class="skeleton/g) ?? []).length).toBe(4);
  });

  test('error state renders a machine-code-specific user message', () => {
    const markup = renderToStaticMarkup(
      <ErrorText error={new ConveyorApiError(409, 'approval_required', 'approval_required')} />,
    );

    expect(markup).toContain(copy.states.approval_required);
    expect(markup).toContain(copy.taskPanel.error);
  });

  test('generated report panel covers loading, empty, and disabled project states', () => {
    const loadingMarkup = renderWithToast(<ConveyorGeneratedReportPanel projects={[]} projectsLoading />);
    const emptyMarkup = renderWithToast(<ConveyorGeneratedReportPanel projects={[]} projectsLoading={false} />);

    expect(loadingMarkup).toContain(copy.reports.loading);
    expect(emptyMarkup).toContain(copy.reports.emptyProjects);
    expect(emptyMarkup).toContain(copy.reports.disabledReason);
    expect(disabledCount(emptyMarkup)).toBeGreaterThanOrEqual(2);
  });

  test('work order section covers approval-required, empty, disabled, and state legend behavior', () => {
    const markup = renderWithToast(<ConveyorWorkOrderSection taskId="task-1" approvalRequired />);

    expect(markup).toContain(copy.workOrders.approvalRequired);
    expect(markup).toContain(copy.workOrders.empty);
    expect(markup).toContain(copy.workOrders.createDisabled);
    for (const state of ['requested', 'accepted', 'completed', 'rejected', 'canceled', 'failed', 'approval_required'] as const) {
      expect(markup).toContain(copy.states[state]);
    }
    expect(disabledCount(markup)).toBeGreaterThanOrEqual(6);
  });

  test('forum digest panel distinguishes missing source from empty digest state', () => {
    // Панель сворачиваемая (по умолчанию свёрнута); для проверки тела рендерим развёрнутой.
    const missingSourceMarkup = renderWithToast(<ConveyorForumDigestPanel sourceId="" initialCollapsed={false} />);
    const emptyDigestMarkup = renderWithToast(<ConveyorForumDigestPanel sourceId="topic-1" sourceTitle="Topic" initialCollapsed={false} />);

    expect(missingSourceMarkup).toContain(copy.forumDigest.sourceRequired);
    expect(disabledCount(missingSourceMarkup)).toBeGreaterThanOrEqual(2);
    expect(emptyDigestMarkup).toContain(copy.forumDigest.empty);
    expect(emptyDigestMarkup).not.toContain(copy.forumDigest.sourceRequired);
  });
});
