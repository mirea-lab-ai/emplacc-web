import { describe, expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ToastProvider } from '../src/components/ui/Toast';
import type { ConveyorSnapshot } from '../src/features/conveyor/api';
import {
  AddCriterionForm,
  AgentRunRegisterForm,
  AttachEvidenceForm,
  CloseGateControls,
} from '../src/features/conveyor/components';
import copy from '../src/locales/ru/conveyor.json';

function renderWithToast(element: React.ReactElement) {
  return renderToStaticMarkup(<ToastProvider>{element}</ToastProvider>);
}

function disabledCount(markup: string) {
  return (markup.match(/disabled=""/g) ?? []).length;
}

function emptySnapshot(overrides: Partial<ConveyorSnapshot> = {}): ConveyorSnapshot {
  return { criteria: [], evidence: [], events: [], links: [], agentRuns: [], errors: {}, ...overrides };
}

const noop = () => {};

describe('Conveyor web write flows', () => {
  test('add-criterion form renders inputs and is disabled until a title is entered', () => {
    const markup = renderWithToast(<AddCriterionForm taskId="task-1" onMutated={noop} />);
    expect(markup).toContain(copy.criteriaForm.title);
    expect(markup).toContain(copy.criteriaForm.titlePlaceholder);
    expect(markup).toContain(copy.criteriaForm.acIdPlaceholder);
    expect(markup).toContain(copy.criteriaForm.disabled);
    expect(disabledCount(markup)).toBeGreaterThanOrEqual(1);
  });

  test('attach-evidence form exposes type, verdict, uri and criterion-link controls', () => {
    const criteria = [{ id: 'crit-1', title: 'Healthcheck returns 200' }];
    const markup = renderWithToast(<AttachEvidenceForm taskId="task-1" criteria={criteria} onMutated={noop} />);
    expect(markup).toContain(copy.evidenceForm.title);
    expect(markup).toContain(copy.evidenceForm.uriPlaceholder);
    expect(markup).toContain(copy.evidenceForm.criterionNone);
    expect(markup).toContain('Healthcheck returns 200');
    expect(markup).toContain(copy.evidenceForm.disabled);
  });

  test('close-gate is disabled without a target status and warns on contradicting evidence', () => {
    const blank = renderWithToast(<CloseGateControls taskId="task-1" snapshot={emptySnapshot()} onMutated={noop} />);
    expect(blank).toContain(copy.closeGate.title);
    expect(blank).toContain(copy.closeGate.disabled);
    expect(blank).toContain(copy.closeGate.requestApproval);
    expect(blank).toContain(copy.closeGate.createWaiver);
    expect(blank).not.toContain(copy.closeGate.contradictsWarning);

    const contradicts = renderWithToast(
      <CloseGateControls
        taskId="task-1"
        snapshot={emptySnapshot({ evidence: [{ id: 'ev-1', verdict: 'contradicts' }] })}
        onMutated={noop}
      />,
    );
    expect(contradicts).toContain(copy.closeGate.contradictsWarning);
  });

  test('agent-run register form requires source and harness before enabling', () => {
    const markup = renderWithToast(<AgentRunRegisterForm taskId="task-1" onMutated={noop} />);
    expect(markup).toContain(copy.agentRunControls.title);
    expect(markup).toContain(copy.agentRunControls.sourcePlaceholder);
    expect(markup).toContain(copy.agentRunControls.harnessPlaceholder);
    expect(markup).toContain(copy.agentRunControls.registerDisabled);
  });
});
