import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'src/locales/en/conveyor.json',
  'src/features/conveyor/api.ts',
  'src/features/conveyor/components.tsx',
];

const requiredApiPaths = [
  '/api/work-items/{id}/criteria',
  '/api/work-items/{id}/evidence',
  '/api/work-items/{id}/events',
  '/api/work-items/{id}/links',
  '/api/work-items/{id}/agent-runs',
  '/api/projects/{project_id}/generated-reports',
  '/api/generated-reports/{id}',
  '/api/generated-reports/{id}/markdown',
  '/api/work-orders',
  '/api/work-orders/{id}/accept',
  '/api/work-orders/{id}/complete',
  '/api/work-orders/{id}/reject',
  '/api/work-orders/{id}/cancel',
  '/api/work-orders/{id}/fail',
  '/api/forum-digests',
  '/api/forum-action-candidates/{id}/confirm',
  '/api/forum-action-candidates/{id}/reject',
];

const requiredWorkOrderSurfaceSnippets = [
  'function ConveyorWorkOrderSection',
  'copy.workOrders',
  'createWorkOrder(',
  'acceptWorkOrder(',
  'completeWorkOrder(',
  'rejectWorkOrder(',
  'cancelWorkOrder(',
  'failWorkOrder(',
  'requested',
  'accepted',
  'completed',
  'rejected',
  'canceled',
  'failed',
  'approval_required',
];

const errors = [];

for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) {
    errors.push(`Missing required file: ${file}`);
  }
}

const apiPath = join(root, 'src/features/conveyor/api.ts');
if (existsSync(apiPath)) {
  const api = readFileSync(apiPath, 'utf8');
  for (const path of requiredApiPaths) {
    if (!api.includes(path)) {
      errors.push(`Missing Conveyor API path literal: ${path}`);
    }
  }
  if (/on_behalf_of_user_id/i.test(api)) {
    errors.push('Conveyor API client must not expose on_behalf_of_user_id');
  }
}

const localePath = join(root, 'src/locales/en/conveyor.json');
if (existsSync(localePath)) {
  try {
    const parsed = JSON.parse(readFileSync(localePath, 'utf8'));
    for (const key of ['taskPanel', 'workOrders', 'reports', 'forumDigest', 'states']) {
      if (!parsed[key]) errors.push(`Missing locale section: ${key}`);
    }
  } catch (error) {
    errors.push(`Invalid locale JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const componentPath = join(root, 'src/features/conveyor/components.tsx');
if (existsSync(componentPath)) {
  const componentSource = readFileSync(componentPath, 'utf8');
  for (const snippet of requiredWorkOrderSurfaceSnippets) {
    if (!componentSource.includes(snippet)) {
      errors.push(`Missing WorkOrder UI surface snippet: ${snippet}`);
    }
  }
}

const addedLines = [];
try {
  const output = execSync('git diff --unified=0 -- src app tools package.json', { cwd: root, encoding: 'utf8' });
  let currentFile = '';
  for (const line of output.split('\n')) {
    if (line.startsWith('+++ b/')) currentFile = line.slice('+++ b/'.length);
    if (!line.startsWith('+') || line.startsWith('+++')) continue;
    addedLines.push({ file: currentFile, text: line.slice(1) });
  }
} catch (error) {
  errors.push(`Unable to inspect changed files: ${error instanceof Error ? error.message : String(error)}`);
}

const cyrillicPattern = /[\u0400-\u04FF]/;
for (const { file, text } of addedLines) {
  if (!/\.(ts|tsx|js|jsx|mjs)$/.test(file)) continue;
  if (file.startsWith('src/locales/')) continue;
  if (cyrillicPattern.test(text)) {
    errors.push(`Cyrillic text found in added non-locale source line: ${file}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('Conveyor web contract checks passed.');
