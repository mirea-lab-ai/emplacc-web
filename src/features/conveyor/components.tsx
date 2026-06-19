'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Panel from '@/components/ui/Panel';
import { SkeletonText } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import copy from '@/locales/en/conveyor.json';
import {
  ConveyorApiError,
  ConveyorAgentRun,
  ConveyorCriterion,
  ConveyorForumActionCandidate,
  ConveyorForumDigest,
  ConveyorGeneratedReport,
  ConveyorSnapshot,
  ConveyorWorkOrder,
  acceptWorkOrder,
  attachEvidence,
  cancelWorkOrder,
  closeWorkItem,
  completeWorkOrder,
  createCriterion,
  createForumDigest,
  createGeneratedReport,
  createWaiver,
  createWorkOrder,
  fetchConveyorSnapshot,
  failWorkOrder,
  getGeneratedReportMarkdown,
  heartbeatAgentRun,
  listForumDigests,
  redactSecretLikeValue,
  registerAgentRun,
  requestApproval,
  revokeEvidence,
  updateAgentRun,
  updateCriterionState,
  confirmForumActionCandidate,
  rejectWorkOrder,
  rejectForumActionCandidate,
} from './api';
import type { UIProject } from '@/features/projects/api';

type LoadState<T> = { loading: boolean; data: T | null; error: ConveyorApiError | Error | null };

function formatDate(value?: string) {
  if (!value) return copy.common.none;
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) return value;
  return time.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function stateLabel(code?: string) {
  if (!code) return copy.common.unknown;
  return (copy.states as Record<string, string>)[code] ?? code.replaceAll('_', ' ');
}

function statusBadgeClass(status?: string) {
  const normalized = status?.toLowerCase() ?? '';
  if (['passed', 'succeeded', 'completed', 'confirmed', 'accepted'].includes(normalized)) return 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/25';
  if (['failed', 'rejected', 'revoked', 'canceled', 'blocked'].includes(normalized)) return 'bg-red-500/10 text-red-300 ring-red-500/25';
  if (['running', 'queued', 'requested', 'needs_human', 'approval_required'].includes(normalized)) return 'bg-amber-500/10 text-amber-300 ring-amber-500/25';
  return 'bg-white/5 text-slate-300 ring-white/10';
}

function Badge({ children, status }: { children: React.ReactNode; status?: string }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${statusBadgeClass(status)}`}>{children}</span>;
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/10">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
        {typeof count === 'number' && <Badge>{count}</Badge>}
      </div>
      {children}
    </section>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-500">{children}</p>;
}

export function ErrorText({ error }: { error: ConveyorApiError | Error }) {
  const code = error instanceof ConveyorApiError ? error.code : 'unknown';
  return (
    <div className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-200 ring-1 ring-red-500/20">
      <span className="font-medium">{stateLabel(code)}.</span> {copy.taskPanel.error}
    </div>
  );
}

function SafeMetadata({ value }: { value: unknown }) {
  const [open, setOpen] = useState(false);
  if (!value || typeof value !== 'object') return null;
  return (
    <div className="mt-2">
      <button type="button" onClick={() => setOpen((current) => !current)} className="text-xs text-emerald-300 hover:text-emerald-200">
        {open ? copy.taskPanel.hideMetadata : copy.taskPanel.showMetadata}
      </button>
      {open && (
        <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-black/25 p-2 text-[11px] text-slate-300 ring-1 ring-white/10">
          {JSON.stringify(redactSecretLikeValue(value), null, 2)}
        </pre>
      )}
    </div>
  );
}

function ListItem({ title, meta, status, children }: { title: React.ReactNode; meta?: React.ReactNode; status?: string; children?: React.ReactNode }) {
  return (
    <li className="rounded-lg bg-black/15 p-2 ring-1 ring-white/5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 text-sm text-slate-100">{title}</div>
        {status && <Badge status={status}>{stateLabel(status)}</Badge>}
      </div>
      {meta && <div className="mt-1 text-xs text-slate-500">{meta}</div>}
      {children}
    </li>
  );
}

const WORK_ORDER_STATES = ['requested', 'accepted', 'completed', 'rejected', 'canceled', 'failed', 'approval_required'];

function actionIdempotencyKey(taskId: string, action: string) {
  return `web-work-order-${action}-${taskId}-${Date.now()}`;
}

export function ConveyorWorkOrderSection({ taskId, approvalRequired }: { taskId: string; approvalRequired: boolean }) {
  const toast = useToast();
  const [workOrder, setWorkOrder] = useState<ConveyorWorkOrder | null>(null);
  const [providerBoardId, setProviderBoardId] = useState('');
  const [providerStatusId, setProviderStatusId] = useState('');
  const [goal, setGoal] = useState('');
  const [targetName, setTargetName] = useState('');
  const [resultEvidenceId, setResultEvidenceId] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const currentStatus = approvalRequired ? 'approval_required' : workOrder?.status;

  const canCreate = Boolean(!busyAction && taskId && providerBoardId.trim() && providerStatusId.trim() && goal.trim());
  const hasWorkOrder = Boolean(workOrder?.id);
  const canAccept = Boolean(hasWorkOrder && targetName.trim() && !busyAction);
  const canComplete = Boolean(hasWorkOrder && resultEvidenceId.trim() && !busyAction);
  const canResolve = Boolean(hasWorkOrder && !busyAction);

  async function handleCreate() {
    if (!canCreate) return;
    setBusyAction('create');
    try {
      const created = await createWorkOrder({
        source_task_id: taskId,
        provider_board_id: providerBoardId.trim(),
        provider_status_id: providerStatusId.trim(),
        goal: goal.trim(),
        idempotency_key: actionIdempotencyKey(taskId, 'create'),
      });
      setWorkOrder(created);
      toast.success(copy.workOrders.created);
    } catch {
      toast.error(copy.workOrders.failed);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleAccept() {
    if (!workOrder?.id || !targetName.trim()) return;
    setBusyAction('accept');
    try {
      const updated = await acceptWorkOrder(workOrder.id, {
        target_name: targetName.trim(),
        idempotency_key: actionIdempotencyKey(workOrder.id, 'accept'),
      });
      setWorkOrder(updated);
      toast.success(copy.workOrders.accepted);
    } catch {
      toast.error(copy.workOrders.failed);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleComplete() {
    if (!workOrder?.id || !resultEvidenceId.trim()) return;
    setBusyAction('complete');
    try {
      const updated = await completeWorkOrder(workOrder.id, {
        result_evidence_id: resultEvidenceId.trim(),
        idempotency_key: actionIdempotencyKey(workOrder.id, 'complete'),
      });
      setWorkOrder(updated);
      toast.success(copy.workOrders.completed);
    } catch {
      toast.error(copy.workOrders.failed);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleReject() {
    if (!workOrder?.id) return;
    setBusyAction('reject');
    try {
      const updated = await rejectWorkOrder(workOrder.id, {
        reason: copy.workOrders.defaultRejectReason,
        idempotency_key: actionIdempotencyKey(workOrder.id, 'reject'),
      });
      setWorkOrder(updated);
      toast.info(copy.workOrders.rejected);
    } catch {
      toast.error(copy.workOrders.failed);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCancel() {
    if (!workOrder?.id) return;
    setBusyAction('cancel');
    try {
      const updated = await cancelWorkOrder(workOrder.id, {
        reason: copy.workOrders.defaultCancelReason,
        idempotency_key: actionIdempotencyKey(workOrder.id, 'cancel'),
      });
      setWorkOrder(updated);
      toast.info(copy.workOrders.canceled);
    } catch {
      toast.error(copy.workOrders.failed);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleFail() {
    if (!workOrder?.id) return;
    setBusyAction('fail');
    try {
      const updated = await failWorkOrder(workOrder.id, {
        reason: copy.workOrders.defaultFailReason,
        idempotency_key: actionIdempotencyKey(workOrder.id, 'fail'),
      });
      setWorkOrder(updated);
      toast.error(copy.workOrders.markedFailed);
    } catch {
      toast.error(copy.workOrders.failed);
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <Section title={copy.workOrders.title} count={workOrder ? 1 : 0}>
      <div className="space-y-3">
        <p className="text-sm text-slate-300">{copy.workOrders.subtitle}</p>
        {currentStatus && <Badge status={currentStatus}>{stateLabel(currentStatus)}</Badge>}
        <div className="flex flex-wrap gap-2" aria-label={copy.workOrders.stateLegend}>
          {WORK_ORDER_STATES.map((status) => <Badge key={status} status={status}>{stateLabel(status)}</Badge>)}
        </div>
        {approvalRequired && <p className="text-xs text-amber-300">{copy.workOrders.approvalRequired}</p>}
        {!workOrder && <EmptyText>{copy.workOrders.empty}</EmptyText>}
        {workOrder && (
          <div className="rounded-lg bg-black/15 p-3 ring-1 ring-white/5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-medium text-slate-100">{workOrder.goal ?? workOrder.id}</div>
                <div className="mt-1 text-xs text-slate-500">{copy.common.updatedAt}: {formatDate(workOrder.updated_at ?? workOrder.created_at)}</div>
              </div>
              <Badge status={workOrder.status}>{stateLabel(workOrder.status)}</Badge>
            </div>
            {workOrder.reason && <p className="mt-2 text-xs text-slate-400">{copy.common.reason}: {workOrder.reason}</p>}
            <SafeMetadata value={workOrder.requester_context} />
            <SafeMetadata value={workOrder.provider_context} />
          </div>
        )}
        <div className="grid gap-2 md:grid-cols-3">
          <input value={providerBoardId} onChange={(event) => setProviderBoardId(event.target.value)} disabled={Boolean(busyAction)} placeholder={copy.workOrders.providerBoardPlaceholder} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 disabled:opacity-50" />
          <input value={providerStatusId} onChange={(event) => setProviderStatusId(event.target.value)} disabled={Boolean(busyAction)} placeholder={copy.workOrders.providerStatusPlaceholder} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 disabled:opacity-50" />
          <input value={goal} onChange={(event) => setGoal(event.target.value)} disabled={Boolean(busyAction)} placeholder={copy.workOrders.goalPlaceholder} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 disabled:opacity-50" />
        </div>
        {!canCreate && !workOrder && <p className="text-xs text-slate-500">{copy.workOrders.createDisabled}</p>}
        <div className="grid gap-2 md:grid-cols-2">
          <input value={targetName} onChange={(event) => setTargetName(event.target.value)} disabled={!hasWorkOrder || Boolean(busyAction)} placeholder={copy.workOrders.targetNamePlaceholder} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 disabled:opacity-50" />
          <input value={resultEvidenceId} onChange={(event) => setResultEvidenceId(event.target.value)} disabled={!hasWorkOrder || Boolean(busyAction)} placeholder={copy.workOrders.resultEvidencePlaceholder} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 disabled:opacity-50" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void handleCreate()} disabled={!canCreate} className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-500/20 disabled:opacity-50">
            {busyAction === 'create' ? copy.workOrders.creating : copy.workOrders.create}
          </button>
          <button type="button" onClick={() => void handleAccept()} disabled={!canAccept} className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 ring-1 ring-white/10 disabled:opacity-50">
            {copy.workOrders.accept}
          </button>
          <button type="button" onClick={() => void handleComplete()} disabled={!canComplete} className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 ring-1 ring-white/10 disabled:opacity-50">
            {copy.workOrders.complete}
          </button>
          <button type="button" onClick={() => void handleReject()} disabled={!canResolve} className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 ring-1 ring-red-500/20 disabled:opacity-50">
            {copy.workOrders.reject}
          </button>
          <button type="button" onClick={() => void handleCancel()} disabled={!canResolve} className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 ring-1 ring-amber-500/20 disabled:opacity-50">
            {copy.workOrders.cancel}
          </button>
          <button type="button" onClick={() => void handleFail()} disabled={!canResolve} className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 ring-1 ring-red-500/20 disabled:opacity-50">
            {copy.workOrders.fail}
          </button>
        </div>
        {!canAccept && hasWorkOrder && <p className="text-xs text-slate-500">{copy.workOrders.acceptDisabled}</p>}
        {!canComplete && hasWorkOrder && <p className="text-xs text-slate-500">{copy.workOrders.completeDisabled}</p>}
      </div>
    </Section>
  );
}

function actionKey(prefix: string, id: string) {
  return `web-${prefix}-${id}-${Date.now()}`;
}

function fieldClass(extra = '') {
  return `rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 disabled:opacity-50 ${extra}`.trim();
}

function CriterionStateControls({ taskId, criterion, onMutated }: { taskId: string; criterion: ConveyorCriterion; onMutated: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  async function setStateValue(next: string) {
    setBusy(next);
    try {
      await updateCriterionState(taskId, criterion.id, { state: next, idempotency_key: actionKey('criterion-state', criterion.id) });
      toast.success(copy.criteriaForm.updated);
      onMutated();
    } catch {
      toast.error(copy.criteriaForm.updateFailed);
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <button type="button" onClick={() => void setStateValue('passed')} disabled={Boolean(busy)} className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 ring-1 ring-emerald-500/20 disabled:opacity-50">{copy.criteriaForm.markPassed}</button>
      <button type="button" onClick={() => void setStateValue('failed')} disabled={Boolean(busy)} className="rounded-lg bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-200 ring-1 ring-red-500/20 disabled:opacity-50">{copy.criteriaForm.markFailed}</button>
      <button type="button" onClick={() => void setStateValue('waived')} disabled={Boolean(busy)} className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200 ring-1 ring-amber-500/20 disabled:opacity-50">{copy.criteriaForm.markWaived}</button>
    </div>
  );
}

export function AddCriterionForm({ taskId, onMutated }: { taskId: string; onMutated: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [acId, setAcId] = useState('');
  const [specIds, setSpecIds] = useState('');
  const [required, setRequired] = useState(true);
  const [busy, setBusy] = useState(false);
  const canAdd = Boolean(title.trim() && !busy);
  async function handleAdd() {
    if (!canAdd) return;
    setBusy(true);
    try {
      const specs = specIds.split(',').map((value) => value.trim()).filter(Boolean);
      await createCriterion(taskId, { title: title.trim(), required, ac_id: acId.trim() || undefined, spec_ids: specs.length ? specs : undefined, idempotency_key: actionKey('criterion-add', taskId) });
      toast.success(copy.criteriaForm.added);
      setTitle('');
      setAcId('');
      setSpecIds('');
      onMutated();
    } catch {
      toast.error(copy.criteriaForm.failed);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-3 space-y-2 rounded-lg bg-black/15 p-2 ring-1 ring-white/5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{copy.criteriaForm.title}</p>
      <input value={title} onChange={(event) => setTitle(event.target.value)} disabled={busy} placeholder={copy.criteriaForm.titlePlaceholder} className={fieldClass('w-full')} />
      <div className="grid gap-2 md:grid-cols-2">
        <input value={acId} onChange={(event) => setAcId(event.target.value)} disabled={busy} placeholder={copy.criteriaForm.acIdPlaceholder} className={fieldClass()} />
        <input value={specIds} onChange={(event) => setSpecIds(event.target.value)} disabled={busy} placeholder={copy.criteriaForm.specIdsPlaceholder} className={fieldClass()} />
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-300">
        <input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} disabled={busy} />
        {copy.criteriaForm.required}
      </label>
      {!canAdd && <p className="text-xs text-slate-500">{copy.criteriaForm.disabled}</p>}
      <button type="button" onClick={() => void handleAdd()} disabled={!canAdd} className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-500/20 disabled:opacity-50">
        {busy ? copy.criteriaForm.adding : copy.criteriaForm.add}
      </button>
    </div>
  );
}

function EvidenceRevokeButton({ taskId, evidenceId, onMutated }: { taskId: string; evidenceId: string; onMutated: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function handleRevoke() {
    setBusy(true);
    try {
      await revokeEvidence(taskId, evidenceId, { reason: copy.evidenceForm.defaultRevokeReason, idempotency_key: actionKey('evidence-revoke', evidenceId) });
      toast.info(copy.evidenceForm.revoked);
      onMutated();
    } catch {
      toast.error(copy.evidenceForm.revokeFailed);
    } finally {
      setBusy(false);
    }
  }
  return (
    <button type="button" onClick={() => void handleRevoke()} disabled={busy} className="mt-2 rounded-lg bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-200 ring-1 ring-red-500/20 disabled:opacity-50">
      {busy ? copy.evidenceForm.revoking : copy.evidenceForm.revoke}
    </button>
  );
}

export function AttachEvidenceForm({ taskId, criteria, onMutated }: { taskId: string; criteria: ConveyorCriterion[]; onMutated: () => void }) {
  const toast = useToast();
  const [type, setType] = useState('link');
  const [verdict, setVerdict] = useState('supports');
  const [uri, setUri] = useState('');
  const [title, setTitle] = useState('');
  const [sha256, setSha256] = useState('');
  const [criterionId, setCriterionId] = useState('');
  const [busy, setBusy] = useState(false);
  const canAttach = Boolean(type.trim() && verdict.trim() && uri.trim() && title.trim() && !busy);
  async function handleAttach() {
    if (!canAttach) return;
    setBusy(true);
    try {
      await attachEvidence(taskId, { type: type.trim(), verdict, uri: uri.trim(), title: title.trim(), criterion_id: criterionId || undefined, sha256: sha256.trim() || undefined, idempotency_key: actionKey('evidence-attach', taskId) });
      toast.success(copy.evidenceForm.added);
      setUri('');
      setTitle('');
      setSha256('');
      setCriterionId('');
      onMutated();
    } catch {
      toast.error(copy.evidenceForm.failed);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-3 space-y-2 rounded-lg bg-black/15 p-2 ring-1 ring-white/5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{copy.evidenceForm.title}</p>
      <div className="grid gap-2 md:grid-cols-2">
        <input value={type} onChange={(event) => setType(event.target.value)} disabled={busy} placeholder={copy.evidenceForm.typePlaceholder} className={fieldClass()} />
        <select value={verdict} onChange={(event) => setVerdict(event.target.value)} disabled={busy} className={fieldClass()}>
          <option value="supports">{copy.evidenceForm.verdictSupports}</option>
          <option value="contradicts">{copy.evidenceForm.verdictContradicts}</option>
          <option value="informational">{copy.evidenceForm.verdictNeutral}</option>
        </select>
        <input value={uri} onChange={(event) => setUri(event.target.value)} disabled={busy} placeholder={copy.evidenceForm.uriPlaceholder} className={fieldClass()} />
        <input value={title} onChange={(event) => setTitle(event.target.value)} disabled={busy} placeholder={copy.evidenceForm.titlePlaceholder} className={fieldClass()} />
        <input value={sha256} onChange={(event) => setSha256(event.target.value)} disabled={busy} placeholder={copy.evidenceForm.sha256Placeholder} className={fieldClass()} />
        <select value={criterionId} onChange={(event) => setCriterionId(event.target.value)} disabled={busy} className={fieldClass()}>
          <option value="">{copy.evidenceForm.criterionNone}</option>
          {criteria.map((criterion) => <option key={criterion.id} value={criterion.id}>{criterion.title ?? criterion.id}</option>)}
        </select>
      </div>
      {!canAttach && <p className="text-xs text-slate-500">{copy.evidenceForm.disabled}</p>}
      <button type="button" onClick={() => void handleAttach()} disabled={!canAttach} className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-500/20 disabled:opacity-50">
        {busy ? copy.evidenceForm.attaching : copy.evidenceForm.attach}
      </button>
    </div>
  );
}

export function CloseGateControls({ taskId, snapshot, onMutated }: { taskId: string; snapshot: ConveyorSnapshot; onMutated: () => void }) {
  const toast = useToast();
  const [toStatusId, setToStatusId] = useState('');
  const [riskLevel, setRiskLevel] = useState('low');
  const [waiverReason, setWaiverReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [lastErrorCode, setLastErrorCode] = useState<string | null>(null);
  const hasContradicts = (snapshot.evidence ?? []).some((item) => !item.revoked_at && item.verdict === 'contradicts');
  const canClose = Boolean(toStatusId.trim() && !busy);
  const canWaive = Boolean(toStatusId.trim() && waiverReason.trim() && !busy);

  async function runClose(taskWaiverId?: string) {
    setBusy(taskWaiverId ? 'waiver' : 'close');
    setLastErrorCode(null);
    try {
      await closeWorkItem(taskId, { to_status_id: toStatusId.trim(), task_waiver_id: taskWaiverId, risk_level: riskLevel || 'low', approval_granted: false, allow_dependency_auto_ready: false, idempotency_key: actionKey('task-close', taskId) });
      toast.success(copy.closeGate.closed);
      onMutated();
    } catch (error) {
      const code = error instanceof ConveyorApiError ? error.code : 'unknown';
      setLastErrorCode(code);
      toast.error(code === 'approval_required' ? copy.closeGate.approvalRequired : copy.closeGate.blocked);
    } finally {
      setBusy(null);
    }
  }

  async function handleCreateWaiverAndRetry() {
    if (!canWaive) return;
    setBusy('waiver');
    try {
      const waiver = await createWaiver(taskId, { scope: 'task', reason: waiverReason.trim(), idempotency_key: actionKey('waiver', taskId) });
      toast.success(copy.closeGate.waiverCreated);
      const waiverId = (waiver as { entity_id?: string; id?: string }).entity_id ?? (waiver as { id?: string }).id;
      await runClose(waiverId);
    } catch (error) {
      const code = error instanceof ConveyorApiError ? error.code : 'unknown';
      setLastErrorCode(code);
      toast.error(copy.closeGate.waiverFailed);
      setBusy(null);
    }
  }

  async function handleRequestApproval() {
    setBusy('approval');
    try {
      await requestApproval({ work_item_id: taskId, action: 'close_with_waiver', risk_level: riskLevel || 'medium', reason: waiverReason.trim() || undefined, idempotency_key: actionKey('approval', taskId) });
      toast.success(copy.closeGate.approvalRequested);
    } catch {
      toast.error(copy.closeGate.approvalFailed);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-3 space-y-2 rounded-lg bg-black/15 p-2 ring-1 ring-white/5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{copy.closeGate.title}</p>
      {hasContradicts && <p className="rounded-lg bg-red-500/10 px-2 py-1 text-xs text-red-200 ring-1 ring-red-500/20">{copy.closeGate.contradictsWarning}</p>}
      {lastErrorCode === 'approval_required' && <p className="text-xs text-amber-300">{copy.closeGate.approvalRequired}</p>}
      {lastErrorCode === 'validation_error' && <p className="text-xs text-amber-300">{copy.closeGate.validationError}</p>}
      <div className="grid gap-2 md:grid-cols-2">
        <input value={toStatusId} onChange={(event) => setToStatusId(event.target.value)} disabled={Boolean(busy)} placeholder={copy.closeGate.toStatusPlaceholder} className={fieldClass()} />
        <input value={riskLevel} onChange={(event) => setRiskLevel(event.target.value)} disabled={Boolean(busy)} placeholder={copy.closeGate.riskPlaceholder} className={fieldClass()} />
      </div>
      {!canClose && <p className="text-xs text-slate-500">{copy.closeGate.disabled}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void runClose()} disabled={!canClose} className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-500/20 disabled:opacity-50">
          {busy === 'close' ? copy.closeGate.closing : copy.closeGate.close}
        </button>
        <button type="button" onClick={() => void handleRequestApproval()} disabled={Boolean(busy)} className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 ring-1 ring-amber-500/20 disabled:opacity-50">
          {busy === 'approval' ? copy.closeGate.requestingApproval : copy.closeGate.requestApproval}
        </button>
      </div>
      <div className="space-y-2 border-t border-white/5 pt-2">
        <p className="text-xs text-slate-400">{copy.closeGate.waiverTitle}</p>
        <input value={waiverReason} onChange={(event) => setWaiverReason(event.target.value)} disabled={Boolean(busy)} placeholder={copy.closeGate.waiverReasonPlaceholder} className={fieldClass('w-full')} />
        {!canWaive && <p className="text-xs text-slate-500">{copy.closeGate.waiverDisabled}</p>}
        <button type="button" onClick={() => void handleCreateWaiverAndRetry()} disabled={!canWaive} className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 ring-1 ring-white/10 disabled:opacity-50">
          {busy === 'waiver' ? copy.closeGate.creatingWaiver : copy.closeGate.createWaiver}
        </button>
      </div>
    </div>
  );
}

function heartbeatOf(run: ConveyorAgentRun): string | undefined {
  const value = run.last_heartbeat_at ?? (run as { heartbeat_at?: string }).heartbeat_at;
  return typeof value === 'string' ? value : undefined;
}

function AgentRunRunControls({ taskId, run, onMutated }: { taskId: string; run: ConveyorAgentRun; onMutated: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  async function heartbeat() {
    setBusy('heartbeat');
    try {
      await heartbeatAgentRun(taskId, run.id, { idempotency_key: actionKey('agent-heartbeat', run.id) });
      toast.success(copy.agentRunControls.heartbeatSent);
      onMutated();
    } catch {
      toast.error(copy.agentRunControls.failed);
    } finally {
      setBusy(null);
    }
  }
  async function setStatusValue(status: string) {
    setBusy(status);
    try {
      await updateAgentRun(taskId, run.id, { status, idempotency_key: actionKey('agent-status', run.id) });
      toast.success(copy.agentRunControls.statusUpdated);
      onMutated();
    } catch {
      toast.error(copy.agentRunControls.failed);
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="mt-2">
      <div className="text-[11px] text-slate-500">{copy.agentRunControls.lastHeartbeat}: {formatDate(heartbeatOf(run))}</div>
      <div className="mt-1 flex flex-wrap gap-2">
        <button type="button" onClick={() => void heartbeat()} disabled={Boolean(busy)} className="rounded-lg bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-200 ring-1 ring-white/10 disabled:opacity-50">{copy.agentRunControls.heartbeat}</button>
        <button type="button" onClick={() => void setStatusValue('running')} disabled={Boolean(busy)} className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200 ring-1 ring-amber-500/20 disabled:opacity-50">{copy.agentRunControls.markRunning}</button>
        <button type="button" onClick={() => void setStatusValue('succeeded')} disabled={Boolean(busy)} className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 ring-1 ring-emerald-500/20 disabled:opacity-50">{copy.agentRunControls.markSucceeded}</button>
        <button type="button" onClick={() => void setStatusValue('failed')} disabled={Boolean(busy)} className="rounded-lg bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-200 ring-1 ring-red-500/20 disabled:opacity-50">{copy.agentRunControls.markFailed}</button>
      </div>
    </div>
  );
}

export function AgentRunRegisterForm({ taskId, onMutated }: { taskId: string; onMutated: () => void }) {
  const toast = useToast();
  const [source, setSource] = useState('');
  const [harness, setHarness] = useState('');
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const canRegister = Boolean(source.trim() && harness.trim() && !busy);
  async function handleRegister() {
    if (!canRegister) return;
    setBusy(true);
    try {
      await registerAgentRun(taskId, { source: source.trim(), harness: harness.trim(), status: 'queued', summary: summary.trim() || undefined, idempotency_key: actionKey('agent-register', taskId) });
      toast.success(copy.agentRunControls.registered);
      setSource('');
      setHarness('');
      setSummary('');
      onMutated();
    } catch {
      toast.error(copy.agentRunControls.failed);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-3 space-y-2 rounded-lg bg-black/15 p-2 ring-1 ring-white/5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{copy.agentRunControls.title}</p>
      <div className="grid gap-2 md:grid-cols-2">
        <input value={source} onChange={(event) => setSource(event.target.value)} disabled={busy} placeholder={copy.agentRunControls.sourcePlaceholder} className={fieldClass()} />
        <input value={harness} onChange={(event) => setHarness(event.target.value)} disabled={busy} placeholder={copy.agentRunControls.harnessPlaceholder} className={fieldClass()} />
      </div>
      <input value={summary} onChange={(event) => setSummary(event.target.value)} disabled={busy} placeholder={copy.agentRunControls.summaryPlaceholder} className={fieldClass('w-full')} />
      {!canRegister && <p className="text-xs text-slate-500">{copy.agentRunControls.registerDisabled}</p>}
      <button type="button" onClick={() => void handleRegister()} disabled={!canRegister} className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-500/20 disabled:opacity-50">
        {busy ? copy.agentRunControls.registering : copy.agentRunControls.register}
      </button>
    </div>
  );
}

export function ConveyorTaskPanel({ taskId }: { taskId: string }) {
  const [state, setState] = useState<LoadState<ConveyorSnapshot>>({ loading: true, data: null, error: null });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await fetchConveyorSnapshot(taskId);
      setState({ loading: false, data, error: null });
    } catch (error) {
      setState({ loading: false, data: null, error: error instanceof Error ? error : new Error(String(error)) });
    }
  }, [taskId]);

  useEffect(() => { void load(); }, [load]);

  const closeState = useMemo(() => {
    const criteria = state.data?.criteria ?? [];
    const required = criteria.filter((item) => item.required !== false);
    if (Object.values(state.data?.errors ?? {}).some((error) => error?.code === 'approval_required')) return 'approval_required';
    if (required.length > 0 && required.every((item) => item.state === 'passed')) return 'ready';
    return 'blocked';
  }, [state.data]);

  return (
    <Panel className="space-y-4 p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{copy.taskPanel.title}</h2>
          <p className="mt-1 text-sm text-slate-400">{copy.taskPanel.subtitle}</p>
        </div>
        <button type="button" onClick={() => void load()} className="rounded-lg px-3 py-1.5 text-xs text-emerald-300 ring-1 ring-emerald-500/20 hover:bg-emerald-500/10">
          {copy.taskPanel.retry}
        </button>
      </header>

      {state.loading && <SkeletonText lines={4} />}
      {state.error && <ErrorText error={state.error} />}
      {!state.loading && state.data && (
        <div className="space-y-3">
          <Section title={copy.taskPanel.closeState}>
            <div className="flex items-start gap-2 text-sm">
              <Badge status={closeState === 'ready' ? 'passed' : closeState}>{stateLabel(closeState === 'ready' ? 'passed' : closeState)}</Badge>
              <p className="text-slate-300">
                {closeState === 'ready' ? copy.taskPanel.readyToClose : closeState === 'approval_required' ? copy.taskPanel.approvalRequired : copy.taskPanel.blockedClose}
              </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {state.data.criteria.length === 0 && <Badge status="blocked">{copy.taskPanel.noCriteria}</Badge>}
              {state.data.evidence.filter((item) => !item.revoked_at).length === 0 && <Badge status="blocked">{copy.taskPanel.noEvidence}</Badge>}
            </div>
            <CloseGateControls taskId={taskId} snapshot={state.data} onMutated={() => void load()} />
          </Section>

          <ConveyorWorkOrderSection taskId={taskId} approvalRequired={closeState === 'approval_required'} />

          <Section title={copy.taskPanel.criteria} count={state.data.criteria.length}>
            {state.data.errors.criteria ? <ErrorText error={state.data.errors.criteria} /> : state.data.criteria.length === 0 ? <EmptyText>{copy.taskPanel.empty}</EmptyText> : (
              <ul className="space-y-2">
                {state.data.criteria.map((item) => (
                  <ListItem key={item.id} title={item.title ?? item.id} status={item.state} meta={item.required === false ? copy.common.optional : copy.common.required}>
                    <CriterionStateControls taskId={taskId} criterion={item} onMutated={() => void load()} />
                  </ListItem>
                ))}
              </ul>
            )}
            <AddCriterionForm taskId={taskId} onMutated={() => void load()} />
          </Section>

          <Section title={copy.taskPanel.evidence} count={state.data.evidence.length}>
            {state.data.errors.evidence ? <ErrorText error={state.data.errors.evidence} /> : state.data.evidence.length === 0 ? <EmptyText>{copy.taskPanel.empty}</EmptyText> : (
              <ul className="space-y-2">
                {state.data.evidence.map((item) => (
                  <ListItem key={item.id} title={item.title ?? item.uri ?? item.id} status={item.revoked_at ? 'revoked' : item.verdict} meta={`${item.type ?? copy.common.type} · ${formatDate(item.created_at)}`}>
                    {item.uri && <a href={item.uri} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-emerald-300 hover:text-emerald-200">{item.uri}</a>}
                    <SafeMetadata value={item.metadata} />
                    {!item.revoked_at && <EvidenceRevokeButton taskId={taskId} evidenceId={item.id} onMutated={() => void load()} />}
                  </ListItem>
                ))}
              </ul>
            )}
            <AttachEvidenceForm taskId={taskId} criteria={state.data.criteria} onMutated={() => void load()} />
          </Section>

          <Section title={copy.taskPanel.agentRuns} count={state.data.agentRuns.length}>
            {state.data.errors.agentRuns ? <ErrorText error={state.data.errors.agentRuns} /> : state.data.agentRuns.length === 0 ? <EmptyText>{copy.taskPanel.empty}</EmptyText> : (
              <ul className="space-y-2">
                {state.data.agentRuns.map((run) => (
                  <ListItem key={run.id} title={run.summary ?? run.harness ?? run.id} status={run.status} meta={`${run.source ?? copy.common.unknown} · ${formatDate(run.updated_at ?? run.created_at)}`}>
                    {run.log_uri && <a href={run.log_uri} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-emerald-300 hover:text-emerald-200">{run.log_uri}</a>}
                    <SafeMetadata value={run.metadata} />
                    <AgentRunRunControls taskId={taskId} run={run} onMutated={() => void load()} />
                  </ListItem>
                ))}
              </ul>
            )}
            <AgentRunRegisterForm taskId={taskId} onMutated={() => void load()} />
          </Section>

          <div className="grid gap-3 md:grid-cols-2">
            <Section title={copy.taskPanel.links} count={state.data.links.length}>
              {state.data.errors.links ? <ErrorText error={state.data.errors.links} /> : state.data.links.length === 0 ? <EmptyText>{copy.taskPanel.empty}</EmptyText> : (
                <ul className="space-y-2">
                  {state.data.links.map((link, index) => <ListItem key={`${link.target_task_id ?? index}`} title={link.target_task_id ?? link.id ?? copy.common.unknown} status={link.link_type} meta={formatDate(link.created_at)} />)}
                </ul>
              )}
            </Section>
            <Section title={copy.taskPanel.events} count={state.data.events.length}>
              {state.data.errors.events ? <ErrorText error={state.data.errors.events} /> : state.data.events.length === 0 ? <EmptyText>{copy.taskPanel.empty}</EmptyText> : (
                <ul className="space-y-2">
                  {state.data.events.slice(0, 6).map((event) => <ListItem key={event.id} title={event.summary ?? event.event_type ?? event.type ?? event.id} status={event.event_type ?? event.type} meta={formatDate(event.created_at)} />)}
                </ul>
              )}
            </Section>
          </div>
        </div>
      )}
    </Panel>
  );
}

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export function ConveyorGeneratedReportPanel({ projects, projectsLoading }: { projects?: UIProject[]; projectsLoading?: boolean }) {
  const toast = useToast();
  const [projectId, setProjectId] = useState('');
  const [periodStart, setPeriodStart] = useState(() => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [includeLlm, setIncludeLlm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<ConveyorGeneratedReport | null>(null);

  const canCreate = Boolean(projectId && periodStart && periodEnd && !busy);

  async function handleCreate() {
    if (!canCreate) return;
    setBusy(true);
    try {
      const created = await createGeneratedReport(projectId, {
        period_start: new Date(periodStart).toISOString(),
        period_end: new Date(periodEnd).toISOString(),
        include_llm: includeLlm,
        idempotency_key: `web-report-${projectId}-${periodStart}-${periodEnd}-${includeLlm ? 'llm' : 'facts'}`,
      });
      setReport(created);
      toast.success(copy.reports.created);
    } catch {
      toast.error(copy.reports.failed);
    } finally {
      setBusy(false);
    }
  }

  async function handleMarkdown() {
    if (!report?.id) return;
    setBusy(true);
    try {
      const markdown = await getGeneratedReportMarkdown(report.id);
      downloadText(markdown, `conveyor-report-${report.id}.md`);
    } catch {
      toast.error(copy.reports.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className="t-surface flex flex-col gap-4 p-5">
      <header>
        <h2 className="text-lg font-semibold">{copy.reports.title}</h2>
        <p className="mt-1 text-sm text-slate-300">{copy.reports.subtitle}</p>
      </header>
      <div className="grid gap-3 md:grid-cols-2">
        <select value={projectId} disabled={projectsLoading || busy || !projects?.length} onChange={(event) => setProjectId(event.target.value)} className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white disabled:opacity-50">
          <option value="">{projectsLoading ? copy.reports.loading : copy.reports.projectPlaceholder}</option>
          {(projects ?? []).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-slate-200">
          <input type="checkbox" checked={includeLlm} onChange={(event) => setIncludeLlm(event.target.checked)} />
          {copy.reports.includeLlm}
        </label>
        <label className="text-xs text-slate-400">
          {copy.reports.periodStart}
          <input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white" />
        </label>
        <label className="text-xs text-slate-400">
          {copy.reports.periodEnd}
          <input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white" />
        </label>
      </div>
      {!projectsLoading && !projects?.length && <EmptyText>{copy.reports.emptyProjects}</EmptyText>}
      {!canCreate && <p className="text-xs text-slate-500">{copy.reports.disabledReason}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void handleCreate()} disabled={!canCreate} className="rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50">
          {busy ? copy.reports.creating : copy.reports.create}
        </button>
        <button type="button" onClick={() => void handleMarkdown()} disabled={!report?.id || busy} className="rounded-xl bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 ring-1 ring-white/10 disabled:opacity-50">
          {copy.reports.exportMarkdown}
        </button>
      </div>
      {report && <Badge status={report.status}>{report.status ?? report.id}</Badge>}
    </Panel>
  );
}

export function ConveyorForumDigestPanel({ sourceId, sourceTitle }: { sourceId: string; sourceTitle?: string }) {
  const toast = useToast();
  const [state, setState] = useState<LoadState<ConveyorForumDigest[]>>({ loading: false, data: null, error: null });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!sourceId) return;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await listForumDigests('problem', sourceId);
      setState({ loading: false, data, error: null });
    } catch (error) {
      setState({ loading: false, data: null, error: error instanceof Error ? error : new Error(String(error)) });
    }
  }, [sourceId]);

  useEffect(() => { void load(); }, [load]);

  const latest = state.data?.[0] ?? null;
  const candidates = latest ? (latest.candidates ?? latest.action_candidates ?? []) : [];

  async function handleCreate() {
    if (!sourceId) return;
    setBusy(true);
    try {
      const now = new Date();
      await createForumDigest({
        source_type: 'problem',
        source_id: sourceId,
        source_title: sourceTitle ?? sourceId,
        source_locator: `/forum?problem=${sourceId}`,
        period_start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        period_end: now.toISOString(),
        summary: '',
      });
      toast.success(copy.forumDigest.created);
      await load();
    } catch {
      toast.error(copy.forumDigest.error);
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm(candidate: ConveyorForumActionCandidate) {
    if (!candidate.status_id) return;
    setBusy(true);
    try {
      await confirmForumActionCandidate(candidate.id, {
        status_id: candidate.status_id,
        assigned_to: candidate.assigned_to,
        priority: candidate.priority,
        idempotency_key: `web-forum-confirm-${candidate.id}`,
      });
      toast.success(copy.forumDigest.confirmed);
      await load();
    } catch {
      toast.error(copy.forumDigest.error);
    } finally {
      setBusy(false);
    }
  }

  async function handleReject(candidate: ConveyorForumActionCandidate) {
    setBusy(true);
    try {
      await rejectForumActionCandidate(candidate.id, { reason: 'Rejected from web review', idempotency_key: `web-forum-reject-${candidate.id}` });
      toast.info(copy.forumDigest.rejected);
      await load();
    } catch {
      toast.error(copy.forumDigest.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className="space-y-3 p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">{copy.forumDigest.title}</h2>
          <p className="mt-1 text-xs text-slate-400">{copy.forumDigest.subtitle}</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={!sourceId || state.loading} className="rounded-lg px-2.5 py-1 text-xs text-emerald-300 ring-1 ring-emerald-500/20 disabled:opacity-50">
          {copy.forumDigest.refresh}
        </button>
      </header>
      {!sourceId && <EmptyText>{copy.forumDigest.sourceRequired}</EmptyText>}
      {state.loading && <SkeletonText lines={2} />}
      {state.error && <ErrorText error={state.error} />}
      {!state.loading && sourceId && !latest && <EmptyText>{copy.forumDigest.empty}</EmptyText>}
      {latest && (
        <div className="space-y-2">
          <p className="text-sm text-slate-200">{latest.summary || copy.forumDigest.empty}</p>
          <div className="space-y-2">
            {candidates.map((candidate) => {
              const canConfirm = Boolean(candidate.status_id);
              return (
                <div key={candidate.id} className="rounded-lg bg-black/15 p-2 ring-1 ring-white/5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm text-slate-100">{candidate.title ?? candidate.summary ?? candidate.id}</div>
                      {!canConfirm && <div className="mt-1 text-xs text-amber-300">{copy.forumDigest.confirmDisabled}</div>}
                    </div>
                    {candidate.status && <Badge status={candidate.status}>{candidate.status}</Badge>}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => void handleConfirm(candidate)} disabled={!canConfirm || busy} className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200 ring-1 ring-emerald-500/20 disabled:opacity-50">
                      {copy.forumDigest.confirm}
                    </button>
                    <button type="button" onClick={() => void handleReject(candidate)} disabled={busy} className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-200 ring-1 ring-red-500/20 disabled:opacity-50">
                      {copy.forumDigest.reject}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <button type="button" onClick={() => void handleCreate()} disabled={!sourceId || busy} className="rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 ring-1 ring-white/10 disabled:opacity-50">
        {busy ? copy.forumDigest.creating : copy.forumDigest.create}
      </button>
    </Panel>
  );
}
