// Render the real Conveyor UI components to a standalone static HTML file so the
// new surfaces can be eyeballed in a browser without bringing up the full stack
// or auth. Run: bun run tools/render-conveyor-preview.tsx -> conveyor-preview.html
import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync } from 'node:fs';
import React from 'react';
import { ToastProvider } from '../src/components/ui/Toast';
import {
  AddCriterionForm,
  AgentRunRegisterForm,
  AttachEvidenceForm,
  CloseGateControls,
  ConveyorForumDigestPanel,
  ConveyorGeneratedReportPanel,
  ConveyorWorkOrderSection,
} from '../src/features/conveyor/components';

const snapshot = {
  criteria: [
    { id: 'c1', title: 'GET /healthz returns 200', state: 'passed', required: true },
    { id: 'c2', title: 'Response includes app version', state: 'unchecked', required: true },
  ],
  evidence: [
    { id: 'e1', type: 'pr', verdict: 'supports', title: 'PR #42 healthcheck', uri: 'https://example.test/pr/42', created_at: '2026-06-18T09:00:00Z' },
    { id: 'e2', type: 'log', verdict: 'contradicts', title: 'Smoke test failed once', uri: 'https://example.test/log/7', created_at: '2026-06-18T09:10:00Z' },
  ],
  events: [], links: [], agentRuns: [],
  errors: {},
};

const noop = () => {};
const section = (title: string, body: React.ReactNode) =>
  React.createElement('div', { style: { marginBottom: '28px' } },
    React.createElement('h2', { style: { color: '#34d399', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' } }, title),
    body);

const tree = React.createElement(ToastProvider, null,
  React.createElement('div', { className: 'mx-auto max-w-3xl space-y-6 p-6' },
    section('Close gate (waiver + approval + contradicts warning)',
      React.createElement(CloseGateControls, { taskId: 't1', snapshot, onMutated: noop })),
    section('Add acceptance criterion',
      React.createElement(AddCriterionForm, { taskId: 't1', onMutated: noop })),
    section('Attach evidence (with criterion link)',
      React.createElement(AttachEvidenceForm, { taskId: 't1', criteria: snapshot.criteria, onMutated: noop })),
    section('Register agent run',
      React.createElement(AgentRunRegisterForm, { taskId: 't1', onMutated: noop })),
    section('Work order (requester/provider)',
      React.createElement(ConveyorWorkOrderSection, { taskId: 't1', approvalRequired: false })),
    section('Generated report',
      React.createElement(ConveyorGeneratedReportPanel, { projects: [{ id: 'p1', name: 'product-a' } as never], projectsLoading: false })),
    section('Forum digest (AI summary)',
      React.createElement(ConveyorForumDigestPanel, { sourceId: 'topic-1', sourceTitle: 'Healthcheck discussion' })),
  ));

const body = renderToStaticMarkup(tree);
const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Conveyor UI preview</title>
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
<style>body{background:#0b1220;color:#e2e8f0;font-family:ui-sans-serif,system-ui,sans-serif}</style>
</head><body>
<div class="mx-auto max-w-3xl px-6 pt-6 text-slate-400 text-sm">Static render of the real Conveyor components with mock data (no backend). Buttons are inert here.</div>
${body}
</body></html>`;

writeFileSync('conveyor-preview.html', page);
console.log('wrote conveyor-preview.html');
