'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useAllTasks } from '@/features/tasks/hooks';
import {
  fetchConveyorSnapshot,
  listApprovalRequests,
  grantApprovalRequest,
  denyApprovalRequest,
  type ConveyorApprovalRequest,
} from '@/features/conveyor/api';

function newKey() {
  try { return crypto.randomUUID(); } catch { return `k-${Date.now()}-${Math.round(Math.random() * 1e6)}`; }
}

function fmt(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const STATE_COLORS: Record<string, string> = {
  passed: 'text-emerald-300 bg-emerald-500/15',
  granted: 'text-emerald-300 bg-emerald-500/15',
  succeeded: 'text-emerald-300 bg-emerald-500/15',
  supports: 'text-emerald-300 bg-emerald-500/15',
  pending: 'text-amber-300 bg-amber-500/15',
  running: 'text-blue-300 bg-blue-500/15',
  queued: 'text-blue-300 bg-blue-500/15',
  failed: 'text-red-300 bg-red-500/15',
  denied: 'text-red-300 bg-red-500/15',
  contradicts: 'text-red-300 bg-red-500/15',
  revoked: 'text-slate-400 bg-white/8',
};
function Badge({ value }: { value?: string }) {
  if (!value) return null;
  const cls = STATE_COLORS[value.toLowerCase()] ?? 'text-slate-300 bg-white/8';
  return <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-medium ${cls}`}>{value}</span>;
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="t-surface rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="t-title text-white">{title}</h3>
        <span className="rounded-full bg-white/8 text-slate-400 text-xs px-2 py-0.5">{count}</span>
      </div>
      {count === 0 ? <div className="t-caption">Нет данных</div> : children}
    </div>
  );
}

function Inspector({ taskId }: { taskId: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  const snapshot = useQuery({
    queryKey: ['conveyorSnapshot', taskId],
    queryFn: () => fetchConveyorSnapshot(taskId),
    staleTime: 15_000,
  });
  const approvals = useQuery({
    queryKey: ['conveyorApprovals', taskId],
    queryFn: () => listApprovalRequests(taskId),
    staleTime: 15_000,
  });

  const refetch = () => {
    qc.invalidateQueries({ queryKey: ['conveyorApprovals', taskId] });
    qc.invalidateQueries({ queryKey: ['conveyorSnapshot', taskId] });
  };

  const grant = useMutation({
    mutationFn: (id: string) => grantApprovalRequest(id, { idempotency_key: newKey() }),
    onSuccess: () => { toast.success('Одобрение выдано'); refetch(); },
    onError: (e: any) => toast.error(e?.message || 'Не удалось одобрить'),
  });
  const deny = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => denyApprovalRequest(id, { idempotency_key: newKey(), reason }),
    onSuccess: () => { toast.success('Запрос отклонён'); refetch(); },
    onError: (e: any) => toast.error(e?.message || 'Не удалось отклонить'),
  });

  async function onDeny(a: ConveyorApprovalRequest) {
    if (!(await confirm({ title: 'Отклонить запрос', message: `Отклонить approval «${a.action ?? a.id}»?`, danger: true, confirmLabel: 'Отклонить' }))) return;
    deny.mutate({ id: a.id, reason: 'rejected by admin' });
  }

  if (snapshot.isLoading || approvals.isLoading) {
    return <div className="t-body py-6">Загрузка конвейера…</div>;
  }

  const data = snapshot.data;
  const approvalList = approvals.data ?? [];
  const pending = approvalList.filter(a => (a.status ?? '').toLowerCase() === 'pending');

  return (
    <div className="space-y-4">
      {/* Approvals */}
      <Section title="Одобрения" count={approvalList.length}>
        <div className="space-y-2">
          {approvalList.map(a => {
            const isPending = (a.status ?? '').toLowerCase() === 'pending';
            return (
              <div key={a.id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] ring-1 ring-white/8 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white truncate">{a.action ?? 'approval'}</span>
                    <Badge value={a.status} />
                    {a.risk_level && <span className="t-caption">риск: {a.risk_level}</span>}
                  </div>
                  {a.reason && <div className="t-caption truncate">{a.reason}</div>}
                </div>
                {isPending && (
                  <div className="flex shrink-0 gap-1">
                    <button onClick={() => grant.mutate(a.id)} disabled={grant.isPending}
                      className="rounded-lg px-3 py-1.5 text-xs text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors">Одобрить</button>
                    <button onClick={() => onDeny(a)} disabled={deny.isPending}
                      className="rounded-lg px-3 py-1.5 text-xs text-red-300 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 transition-colors">Отклонить</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Criteria */}
        <Section title="Критерии приёмки" count={data?.criteria.length ?? 0}>
          <div className="space-y-1.5">
            {data?.criteria.map(c => (
              <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 bg-white/[0.02]">
                <span className="text-sm text-white/90 truncate">{c.title ?? c.id}{c.required ? ' *' : ''}</span>
                <Badge value={c.state} />
              </div>
            ))}
          </div>
        </Section>

        {/* Evidence */}
        <Section title="Evidence" count={data?.evidence.length ?? 0}>
          <div className="space-y-1.5">
            {data?.evidence.map(ev => (
              <div key={ev.id} className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 bg-white/[0.02]">
                <span className="text-sm text-white/90 truncate">{ev.title || ev.type || ev.id}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge value={ev.verdict} />
                  {ev.revoked_at && <Badge value="revoked" />}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Agent runs */}
        <Section title="Запуски агентов" count={data?.agentRuns.length ?? 0}>
          <div className="space-y-1.5">
            {data?.agentRuns.map(r => (
              <div key={r.id} className="rounded-lg px-2.5 py-1.5 bg-white/[0.02]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-white/90 truncate">{r.harness || r.source || r.id}</span>
                  <Badge value={r.status} />
                </div>
                {r.summary && <div className="t-caption truncate">{r.summary}</div>}
              </div>
            ))}
          </div>
        </Section>

        {/* Event log */}
        <Section title="Лог событий" count={data?.events.length ?? 0}>
          <div className="space-y-1 max-h-72 overflow-y-auto custom-scroll">
            {data?.events.map(e => (
              <div key={e.id} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 bg-white/[0.02]">
                <span className="text-[11px] text-slate-500 shrink-0 w-24">{fmt(e.created_at)}</span>
                <span className="text-sm text-white/80 truncate">{e.event_type || e.type || '—'}{e.summary ? ` · ${e.summary}` : ''}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {pending.length > 0 && (
        <div className="t-caption text-amber-400/80">⚠️ Ожидают решения: {pending.length}</div>
      )}
    </div>
  );
}

export default function AdminConveyorPage() {
  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const { data: tasksData, isLoading } = useAllTasks(1, 200, hasCreds);
  const tasks = tasksData?.tasks ?? [];

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? tasks.filter(t => t.title.toLowerCase().includes(q) || (t.projectName ?? '').toLowerCase().includes(q)) : tasks;
    return list.slice(0, 100);
  }, [tasks, search]);

  const selectedTask = tasks.find(t => t.id === selected);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="t-heading text-white">Конвейер</h1>
        <p className="t-body mt-1">Инспекция приёмочного конвейера задачи: одобрения, критерии, evidence, agent-runs, лог</p>
      </div>

      <div className="rounded-2xl bg-amber-500/8 ring-1 ring-amber-500/20 px-4 py-3 text-sm text-amber-200/90">
        Глобальная очередь одобрений требует отдельного API-эндпоинта (его пока нет). Здесь — инспекция по конкретной задаче: выберите задачу слева.
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        {/* task picker */}
        <div className="t-surface rounded-2xl p-3 space-y-2 lg:max-h-[calc(100vh-16rem)] lg:overflow-y-auto custom-scroll">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск задачи…" className="t-input" />
          {isLoading ? (
            <div className="t-body py-3 px-1">Загрузка…</div>
          ) : filtered.length === 0 ? (
            <div className="t-caption py-3 px-1">Ничего не найдено</div>
          ) : (
            <div className="space-y-1">
              {filtered.map(t => (
                <button key={t.id} onClick={() => setSelected(t.id)}
                  className={`w-full text-left rounded-xl px-3 py-2 transition-colors ${selected === t.id ? 'bg-emerald-500/15 ring-1 ring-emerald-500/30' : 'hover:bg-white/5'}`}>
                  <div className="text-sm text-white truncate">{t.title || 'Без названия'}</div>
                  {t.projectName && <div className="t-caption truncate">{t.projectName}</div>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* inspector */}
        <div className="min-w-0">
          {selected ? (
            <div className="space-y-3">
              <div className="t-surface rounded-2xl px-4 py-3">
                <div className="font-semibold text-white truncate">{selectedTask?.title}</div>
                <div className="t-caption">ID: {selected}</div>
              </div>
              <Inspector taskId={selected} />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
              <div className="text-3xl mb-2">🛠</div>
              <div className="t-body">Выберите задачу, чтобы посмотреть её конвейер</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
