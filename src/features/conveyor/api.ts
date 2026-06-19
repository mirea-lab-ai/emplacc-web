import { extractErrorMessage, http } from '@/lib/http';

export type ConveyorErrorCode =
  | 'permission_denied'
  | 'not_found'
  | 'conflict'
  | 'approval_required'
  | 'validation_error'
  | 'dependency_unavailable'
  | 'unknown';

export class ConveyorApiError extends Error {
  status: number;
  code: ConveyorErrorCode;

  constructor(status: number, code: ConveyorErrorCode, message: string) {
    super(message);
    this.name = 'ConveyorApiError';
    this.status = status;
    this.code = code;
  }
}

export type JsonRecord = Record<string, unknown>;

export type ConveyorCriterion = {
  id: string;
  title?: string;
  state?: string;
  required?: boolean;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

export type ConveyorEvidence = {
  id: string;
  type?: string;
  verdict?: string;
  uri?: string;
  title?: string;
  metadata?: unknown;
  revoked_at?: string | null;
  created_at?: string;
  [key: string]: unknown;
};

export type ConveyorEvent = {
  id: string;
  type?: string;
  event_type?: string;
  summary?: string;
  created_at?: string;
  actor_id?: string;
  payload?: unknown;
  [key: string]: unknown;
};

export type ConveyorTaskLink = {
  id?: string;
  source_task_id?: string;
  target_task_id?: string;
  link_type?: string;
  created_at?: string;
  [key: string]: unknown;
};

export type ConveyorAgentRun = {
  id: string;
  source?: string;
  harness?: string;
  status?: string;
  summary?: string;
  log_uri?: string;
  workspace_uri?: string;
  metadata?: unknown;
  last_heartbeat_at?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

export type ConveyorWorkOrder = {
  id: string;
  source_task_id?: string;
  status?: string;
  goal?: string;
  reason?: string;
  result_evidence_id?: string;
  requester_context?: unknown;
  provider_context?: unknown;
  inputs?: unknown;
  acceptance_criteria?: unknown;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

export type ConveyorGeneratedReport = {
  id: string;
  project_id?: string;
  status?: string;
  title?: string;
  summary?: string;
  markdown?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

export type ConveyorForumDigest = {
  id: string;
  source_type?: string;
  source_id?: string;
  source_title?: string;
  summary?: string;
  decisions?: unknown;
  candidates?: ConveyorForumActionCandidate[];
  action_candidates?: ConveyorForumActionCandidate[];
  created_at?: string;
  [key: string]: unknown;
};

export type ConveyorForumActionCandidate = {
  id: string;
  title?: string;
  summary?: string;
  status?: string;
  status_id?: string;
  assigned_to?: string;
  priority?: number;
  reason?: string;
  [key: string]: unknown;
};

export type ConveyorMutationResult = {
  entity_id?: string;
  event_id?: string;
  replayed?: boolean;
  [key: string]: unknown;
};

export type ConveyorApprovalRequest = {
  id: string;
  work_item_id?: string;
  action?: string;
  status?: string;
  risk_level?: string;
  reason?: string;
  expires_at?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

type ConveyorSnapshotCollectionKey = 'criteria' | 'evidence' | 'events' | 'links' | 'agentRuns';

export type ConveyorSnapshot = {
  criteria: ConveyorCriterion[];
  evidence: ConveyorEvidence[];
  events: ConveyorEvent[];
  links: ConveyorTaskLink[];
  agentRuns: ConveyorAgentRun[];
  errors: Partial<Record<ConveyorSnapshotCollectionKey, ConveyorApiError>>;
};

export type CreateCriterionPayload = { title: string; required?: boolean; ac_id?: string; spec_ids?: string[]; idempotency_key: string };
export type UpdateCriterionStatePayload = { state: string; idempotency_key: string };
export type AttachEvidencePayload = { type: string; verdict: string; uri: string; title: string; criterion_id?: string; sha256?: string; metadata?: unknown; idempotency_key: string };
export type RevokeEvidencePayload = { reason: string; idempotency_key: string };
export type LinkTasksPayload = { target_task_id: string; link_type: string; idempotency_key: string };
export type CloseWorkItemPayload = { to_status_id: string; task_waiver_id?: string; risk_level: string; approval_granted: boolean; allow_dependency_auto_ready: boolean; idempotency_key: string };
export type CreateWaiverPayload = { scope: string; criterion_id?: string; reason: string; approval_request_id?: string; expires_at?: string; idempotency_key?: string };
export type RequestApprovalPayload = { work_item_id?: string; action: string; risk_level?: string; reason?: string; resource?: unknown; expires_at?: string; idempotency_key?: string };
export type ApprovalDecisionPayload = { reason?: string; idempotency_key?: string };
export type RegisterAgentRunPayload = { source: string; harness: string; status: string; summary?: string; log_uri?: string; workspace_uri?: string; metadata?: unknown; idempotency_key: string };
export type UpdateAgentRunPayload = Partial<Omit<RegisterAgentRunPayload, 'source' | 'harness'>> & { idempotency_key: string };
export type CreateGeneratedReportPayload = { period_start: string; period_end: string; include_llm: boolean; idempotency_key: string };
export type CreateWorkOrderPayload = { source_task_id: string; provider_board_id: string; provider_status_id: string; goal: string; inputs?: unknown; acceptance_criteria?: unknown; required_evidence_metadata?: unknown; requester_context?: unknown; provider_context?: unknown; idempotency_key: string };
export type AcceptWorkOrderPayload = { target_name: string; idempotency_key: string };
export type ReasonPayload = { reason: string; idempotency_key: string };
export type CompleteWorkOrderPayload = { result_evidence_id?: string; evidence_waiver?: string; idempotency_key: string };
export type CreateForumDigestPayload = { source_type: string; source_id: string; source_title: string; source_locator?: string; period_start: string; period_end: string; summary?: string; decisions?: unknown; source_metadata?: unknown; messages?: unknown[]; candidate_inputs?: unknown[] };
export type ConfirmForumCandidatePayload = { status_id: string; assigned_to?: string; priority?: number; idempotency_key: string };

const WORK_ITEM_CRITERIA_PATH = '/api/work-items/{id}/criteria';
const WORK_ITEM_EVIDENCE_PATH = '/api/work-items/{id}/evidence';
const WORK_ITEM_EVENTS_PATH = '/api/work-items/{id}/events';
const WORK_ITEM_LINKS_PATH = '/api/work-items/{id}/links';
const WORK_ITEM_AGENT_RUNS_PATH = '/api/work-items/{id}/agent-runs';
const WORK_ITEM_WAIVERS_PATH = '/api/work-items/{id}/waivers';
const WORK_ITEM_APPROVAL_REQUESTS_PATH = '/api/work-items/{id}/approval-requests';
const APPROVAL_REQUESTS_PATH = '/api/approval-requests';
const GENERATED_REPORT_CREATE_PATH = '/api/projects/{project_id}/generated-reports';
const GENERATED_REPORT_GET_PATH = '/api/generated-reports/{id}';
const GENERATED_REPORT_MARKDOWN_PATH = '/api/generated-reports/{id}/markdown';
const WORK_ORDERS_PATH = '/api/work-orders';
const WORK_ORDER_ACCEPT_PATH = '/api/work-orders/{id}/accept';
const WORK_ORDER_COMPLETE_PATH = '/api/work-orders/{id}/complete';
const WORK_ORDER_REJECT_PATH = '/api/work-orders/{id}/reject';
const WORK_ORDER_CANCEL_PATH = '/api/work-orders/{id}/cancel';
const WORK_ORDER_FAIL_PATH = '/api/work-orders/{id}/fail';
const FORUM_DIGESTS_PATH = '/api/forum-digests';
const FORUM_CANDIDATE_CONFIRM_PATH = '/api/forum-action-candidates/{id}/confirm';
const FORUM_CANDIDATE_REJECT_PATH = '/api/forum-action-candidates/{id}/reject';

function withId(template: string, id: string) {
  return template.replace('{id}', encodeURIComponent(id));
}

function withProjectId(template: string, projectId: string) {
  return template.replace('{project_id}', encodeURIComponent(projectId));
}

function normalizeList<T>(payload: unknown, keys: string[]): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of keys) {
      if (Array.isArray(record[key])) return record[key] as T[];
    }
  }
  return [];
}

function normalizeErrorCode(status: number, detail: string): ConveyorErrorCode {
  const text = detail.toLowerCase();
  if (status === 401 || status === 403 || text.includes('permission_denied')) return 'permission_denied';
  if (status === 404 || text.includes('not_found')) return 'not_found';
  if (status === 409 || text.includes('conflict')) return 'conflict';
  if (text.includes('approval_required')) return 'approval_required';
  if (status === 400 || status === 422 || text.includes('validation_error')) return 'validation_error';
  if (status === 502 || status === 503 || status === 504 || text.includes('dependency_unavailable')) return 'dependency_unavailable';
  return 'unknown';
}

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await http(path, init);
  if (!res.ok) {
    const detail = await extractErrorMessage(res.clone());
    throw new ConveyorApiError(res.status, normalizeErrorCode(res.status, detail), detail || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function requestText(path: string): Promise<string> {
  const res = await http(path, { method: 'GET' });
  if (!res.ok) {
    const detail = await extractErrorMessage(res.clone());
    throw new ConveyorApiError(res.status, normalizeErrorCode(res.status, detail), detail || `HTTP ${res.status}`);
  }
  return res.text();
}

function jsonPost(payload: unknown): RequestInit {
  return { method: 'POST', body: JSON.stringify(payload) };
}

function jsonPatch(payload: unknown): RequestInit {
  return { method: 'PATCH', body: JSON.stringify(payload) };
}

export async function listCriteria(workItemId: string) {
  const payload = await requestJson<unknown>(withId(WORK_ITEM_CRITERIA_PATH, workItemId));
  return normalizeList<ConveyorCriterion>(payload, ['criteria', 'items']);
}

export async function createCriterion(workItemId: string, payload: CreateCriterionPayload) {
  return requestJson<ConveyorCriterion>(withId(WORK_ITEM_CRITERIA_PATH, workItemId), jsonPost(payload));
}

export async function updateCriterionState(workItemId: string, criterionId: string, payload: UpdateCriterionStatePayload) {
  return requestJson<ConveyorCriterion>(`${withId(WORK_ITEM_CRITERIA_PATH, workItemId)}/${encodeURIComponent(criterionId)}`, jsonPatch(payload));
}

export async function listEvidence(workItemId: string) {
  const payload = await requestJson<unknown>(withId(WORK_ITEM_EVIDENCE_PATH, workItemId));
  return normalizeList<ConveyorEvidence>(payload, ['evidence', 'items']);
}

export async function attachEvidence(workItemId: string, payload: AttachEvidencePayload) {
  return requestJson<ConveyorEvidence>(withId(WORK_ITEM_EVIDENCE_PATH, workItemId), jsonPost(payload));
}

export async function revokeEvidence(workItemId: string, evidenceId: string, payload: RevokeEvidencePayload) {
  return requestJson<ConveyorEvidence>(`${withId(WORK_ITEM_EVIDENCE_PATH, workItemId)}/${encodeURIComponent(evidenceId)}/revoke`, jsonPost(payload));
}

export async function listEvents(workItemId: string) {
  const payload = await requestJson<unknown>(withId(WORK_ITEM_EVENTS_PATH, workItemId));
  return normalizeList<ConveyorEvent>(payload, ['events', 'items']);
}

export async function listLinks(workItemId: string) {
  const payload = await requestJson<unknown>(withId(WORK_ITEM_LINKS_PATH, workItemId));
  return normalizeList<ConveyorTaskLink>(payload, ['links', 'items']);
}

export async function linkTasks(workItemId: string, payload: LinkTasksPayload) {
  return requestJson<ConveyorTaskLink>(withId(WORK_ITEM_LINKS_PATH, workItemId), jsonPost(payload));
}

export async function closeWorkItem(workItemId: string, payload: CloseWorkItemPayload) {
  return requestJson<unknown>(`${withId('/api/work-items/{id}', workItemId)}/close`, jsonPost(payload));
}

export async function listAgentRuns(workItemId: string) {
  const payload = await requestJson<unknown>(withId(WORK_ITEM_AGENT_RUNS_PATH, workItemId));
  return normalizeList<ConveyorAgentRun>(payload, ['agent_runs', 'agentRuns', 'items']);
}

export async function getAgentRun(workItemId: string, agentRunId: string) {
  return requestJson<ConveyorAgentRun>(`${withId(WORK_ITEM_AGENT_RUNS_PATH, workItemId)}/${encodeURIComponent(agentRunId)}`);
}

export async function registerAgentRun(workItemId: string, payload: RegisterAgentRunPayload) {
  return requestJson<ConveyorAgentRun>(withId(WORK_ITEM_AGENT_RUNS_PATH, workItemId), jsonPost(payload));
}

export async function updateAgentRun(workItemId: string, agentRunId: string, payload: UpdateAgentRunPayload) {
  return requestJson<ConveyorAgentRun>(`${withId(WORK_ITEM_AGENT_RUNS_PATH, workItemId)}/${encodeURIComponent(agentRunId)}`, jsonPatch(payload));
}

export async function heartbeatAgentRun(workItemId: string, agentRunId: string, payload: { idempotency_key?: string } = {}) {
  return requestJson<ConveyorAgentRun>(`${withId(WORK_ITEM_AGENT_RUNS_PATH, workItemId)}/${encodeURIComponent(agentRunId)}/heartbeat`, jsonPost(payload));
}

export async function createWaiver(workItemId: string, payload: CreateWaiverPayload) {
  return requestJson<ConveyorMutationResult>(withId(WORK_ITEM_WAIVERS_PATH, workItemId), jsonPost(payload));
}

export async function listApprovalRequests(workItemId: string) {
  const payload = await requestJson<unknown>(withId(WORK_ITEM_APPROVAL_REQUESTS_PATH, workItemId));
  return normalizeList<ConveyorApprovalRequest>(payload, ['approval_requests', 'approvalRequests', 'items']);
}

export async function requestApproval(payload: RequestApprovalPayload) {
  return requestJson<ConveyorMutationResult>(APPROVAL_REQUESTS_PATH, jsonPost(payload));
}

export async function grantApprovalRequest(approvalRequestId: string, payload: ApprovalDecisionPayload = {}) {
  return requestJson<ConveyorMutationResult>(`${APPROVAL_REQUESTS_PATH}/${encodeURIComponent(approvalRequestId)}/grant`, jsonPost(payload));
}

export async function denyApprovalRequest(approvalRequestId: string, payload: ApprovalDecisionPayload = {}) {
  return requestJson<ConveyorMutationResult>(`${APPROVAL_REQUESTS_PATH}/${encodeURIComponent(approvalRequestId)}/deny`, jsonPost(payload));
}

export async function createGeneratedReport(projectId: string, payload: CreateGeneratedReportPayload) {
  return requestJson<ConveyorGeneratedReport>(withProjectId(GENERATED_REPORT_CREATE_PATH, projectId), jsonPost(payload));
}

export async function getGeneratedReport(reportId: string) {
  return requestJson<ConveyorGeneratedReport>(withId(GENERATED_REPORT_GET_PATH, reportId));
}

export async function getGeneratedReportMarkdown(reportId: string) {
  return requestText(withId(GENERATED_REPORT_MARKDOWN_PATH, reportId));
}

export async function createWorkOrder(payload: CreateWorkOrderPayload) {
  return requestJson<ConveyorWorkOrder>(WORK_ORDERS_PATH, jsonPost(payload));
}

export async function getWorkOrder(workOrderId: string) {
  return requestJson<ConveyorWorkOrder>(`${WORK_ORDERS_PATH}/${encodeURIComponent(workOrderId)}`);
}

export async function acceptWorkOrder(workOrderId: string, payload: AcceptWorkOrderPayload) {
  return requestJson<ConveyorWorkOrder>(withId(WORK_ORDER_ACCEPT_PATH, workOrderId), jsonPost(payload));
}

export async function rejectWorkOrder(workOrderId: string, payload: ReasonPayload) {
  return requestJson<ConveyorWorkOrder>(withId(WORK_ORDER_REJECT_PATH, workOrderId), jsonPost(payload));
}

export async function completeWorkOrder(workOrderId: string, payload: CompleteWorkOrderPayload) {
  return requestJson<ConveyorWorkOrder>(withId(WORK_ORDER_COMPLETE_PATH, workOrderId), jsonPost(payload));
}

export async function cancelWorkOrder(workOrderId: string, payload: ReasonPayload) {
  return requestJson<ConveyorWorkOrder>(withId(WORK_ORDER_CANCEL_PATH, workOrderId), jsonPost(payload));
}

export async function failWorkOrder(workOrderId: string, payload: ReasonPayload) {
  return requestJson<ConveyorWorkOrder>(withId(WORK_ORDER_FAIL_PATH, workOrderId), jsonPost(payload));
}

export async function createForumDigest(payload: CreateForumDigestPayload) {
  return requestJson<ConveyorForumDigest>(FORUM_DIGESTS_PATH, jsonPost(payload));
}

export async function listForumDigests(sourceType: string, sourceId: string) {
  const params = new URLSearchParams({ source_type: sourceType, source_id: sourceId });
  const payload = await requestJson<unknown>(`${FORUM_DIGESTS_PATH}?${params.toString()}`);
  return normalizeList<ConveyorForumDigest>(payload, ['digests', 'items']);
}

export async function getForumDigest(digestId: string) {
  return requestJson<ConveyorForumDigest>(`${FORUM_DIGESTS_PATH}/${encodeURIComponent(digestId)}`);
}

export async function confirmForumActionCandidate(candidateId: string, payload: ConfirmForumCandidatePayload) {
  return requestJson<ConveyorForumActionCandidate>(withId(FORUM_CANDIDATE_CONFIRM_PATH, candidateId), jsonPost(payload));
}

export async function rejectForumActionCandidate(candidateId: string, payload: ReasonPayload) {
  return requestJson<ConveyorForumActionCandidate>(withId(FORUM_CANDIDATE_REJECT_PATH, candidateId), jsonPost(payload));
}

export async function fetchConveyorSnapshot(workItemId: string): Promise<ConveyorSnapshot> {
  const [criteria, evidence, events, links, agentRuns] = await Promise.allSettled([
    listCriteria(workItemId),
    listEvidence(workItemId),
    listEvents(workItemId),
    listLinks(workItemId),
    listAgentRuns(workItemId),
  ]);

  const errors: ConveyorSnapshot['errors'] = {};
  const unwrap = <T>(key: ConveyorSnapshotCollectionKey, result: PromiseSettledResult<T[]>): T[] => {
    if (result.status === 'fulfilled') return result.value;
    errors[key] = result.reason instanceof ConveyorApiError
      ? result.reason
      : new ConveyorApiError(0, 'unknown', result.reason instanceof Error ? result.reason.message : String(result.reason));
    return [];
  };

  return {
    criteria: unwrap('criteria', criteria),
    evidence: unwrap('evidence', evidence),
    events: unwrap('events', events),
    links: unwrap('links', links),
    agentRuns: unwrap('agentRuns', agentRuns),
    errors,
  };
}

const SECRET_KEY_PATTERN = /(secret|token|password|passwd|authorization|api[_-]?key|private[_-]?key|session|cookie)/i;

export function redactSecretLikeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecretLikeValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as JsonRecord).map(([key, entry]) => [
      key,
      SECRET_KEY_PATTERN.test(key) ? '[redacted]' : redactSecretLikeValue(entry),
    ])
  );
}
