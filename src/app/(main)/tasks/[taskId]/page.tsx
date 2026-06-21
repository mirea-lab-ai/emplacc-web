'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import { fetchTaskById, fetchTaskBoardProject, updateTask, moveTask, deleteTask, improveTaskReport } from '@/features/tasks/api';
import { fetchBoardStatus, type UIStatus } from '@/features/status/api';
import { fetchProjectById, type UIProject } from '@/features/projects/api';
import { fetchAllUsers, type UIUser } from '@/features/user/api';
import { getTaskPriorityMeta, TASK_PRIORITY_OPTIONS, type TaskPriorityValue } from '@/features/tasks/types';
import MarkdownEditor, { MarkdownView } from '@/components/ui/MarkdownEditor';
import DatePicker from '@/components/ui/DatePicker';
import { SkeletonTaskDetail } from '@/components/ui/Skeleton';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { ConveyorTaskPanel } from '@/features/conveyor/components';
import { TaskCommitsPanel } from '@/components/git/GitPanels';
import { formatDateShort, formatDateTime } from '@/lib/date';

type TaskFull = {
  id: string; name: string; description: string; priority: number; statusId: string;
  startDate?: string; deadline?: string; createdAt: string; updatedAt: string;
  gitlabIssueId?: number;
  createdBy:  { id: string; firstName: string; lastName: string };
  assignedTo?: { id: string; firstName: string; lastName: string };
};

function mapTaskFull(raw: any): TaskFull {
  return {
    id: String(raw.id ?? ''), name: raw.name ?? '', description: raw.description ?? '',
    priority: raw.priority ?? 1, statusId: raw.status_id ?? '',
    startDate: raw.start_date, deadline: raw.deadline,
    createdAt: raw.created_at, updatedAt: raw.updated_at,
    gitlabIssueId: raw.gitlab_issue_id || undefined,
    createdBy:  { id: raw.created_by?.id ?? '', firstName: raw.created_by?.first_name ?? '', lastName: raw.created_by?.last_name ?? '' },
    assignedTo: raw.assigned_to?.id ? { id: raw.assigned_to.id, firstName: raw.assigned_to.first_name ?? '', lastName: raw.assigned_to.last_name ?? '' } : undefined,
  };
}

const fmt     = (iso?: string) => iso ? formatDateShort(iso) : '—';
const fmtFull = (iso?: string) => iso ? formatDateTime(iso) : '—';

function isOverdue(iso?: string) { return iso ? new Date(iso) < new Date() : false; }
function isDueSoon(iso?: string) {
  if (!iso) return false;
  const d = new Date(iso); const now = new Date();
  return d > now && d.getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000;
}

export default function TaskPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = use(params);
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

  const [task, setTask]       = useState<TaskFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [statuses, setStatuses] = useState<UIStatus[]>([]);
  const [project, setProject]   = useState<UIProject | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [users, setUsers]     = useState<UIUser[]>([]);

  const [editTitle,   setEditTitle]   = useState(false);
  const [titleDraft,  setTitleDraft]  = useState('');
  const [descDraft,   setDescDraft]   = useState('');
  const [descDirty,   setDescDirty]   = useState(false);
  const [savingTitle, setSavingTitle] = useState(false);
  const [savingDesc,  setSavingDesc]  = useState(false);
  const [improving,   setImproving]   = useState(false);
  const [aiNote,      setAiNote]      = useState(false);
  const [copied,      setCopied]      = useState(false);

  const [savingStatus,   setSavingStatus]   = useState(false);
  const [savingPriority, setSavingPriority] = useState(false);
  const [savingAssignee, setSavingAssignee] = useState(false);
  const [savingDeadline, setSavingDeadline] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [userQuery,      setUserQuery]      = useState('');
  const [deleting,       setDeleting]       = useState(false);

  useEffect(() => { void load(); }, [taskId]);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [raw, loc] = await Promise.all([fetchTaskById(taskId), fetchTaskBoardProject(taskId)]);
      const t = mapTaskFull(raw);
      setTask(t); setTitleDraft(t.name); setDescDraft(t.description); setDescDirty(false);
      if (loc.boardId)   { const bs = await fetchBoardStatus(loc.boardId); setStatuses(bs.statuses); }
      if (loc.projectId) { setProjectId(loc.projectId); setProject(await fetchProjectById(loc.projectId)); }
      setUsers(await fetchAllUsers(1, 100));
    } catch (e: any) { setError(e?.message ?? 'Ошибка загрузки'); }
    finally { setLoading(false); }
  }

  const currentStatus = statuses.find(s => s.id === task?.statusId);
  const priorityMeta  = getTaskPriorityMeta(task?.priority);
  const findEmail     = (id: string) => users.find(u => u.id === id)?.email;
  const findAvatarUrl = (id: string) => users.find(u => u.id === id)?.avatarUrl;
  const now = () => new Date().toISOString();

  function copyTaskLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }

  async function saveTitle() {
    if (!task || !titleDraft.trim() || titleDraft.trim() === task.name) { setEditTitle(false); return; }
    setSavingTitle(true);
    try {
      await updateTask(task.id, { name: titleDraft.trim() });
      setTask(t => t ? {...t, name: titleDraft.trim(), updatedAt: now()} : t);
      toast.success('Название обновлено');
    } catch { toast.error('Не удалось обновить название'); }
    finally { setSavingTitle(false); setEditTitle(false); }
  }

  async function saveDesc() {
    if (!task) return;
    setSavingDesc(true);
    try {
      await updateTask(task.id, { description: descDraft });
      setTask(t => t ? {...t, description: descDraft, updatedAt: now()} : t);
      setAiNote(false); setDescDirty(false);
      toast.success('Описание сохранено');
    } catch { toast.error('Не удалось сохранить описание'); }
    finally { setSavingDesc(false); }
  }

  async function handleImprove() {
    if (!task) return;
    setImproving(true); setAiNote(false);
    try {
      const r = await improveTaskReport(task.id, descDraft);
      const text = r.improved_text ?? r.original_text ?? '';
      setDescDraft(text); setAiNote(true); setDescDirty(true);
    } catch { toast.error('Не удалось улучшить описание'); }
    finally { setImproving(false); }
  }

  async function handleStatusChange(id: string) {
    if (!task || id === task.statusId) return;
    setSavingStatus(true);
    try {
      await moveTask({ task_id: task.id, status_id: id });
      setTask(t => t ? {...t, statusId: id, updatedAt: now()} : t);
      const newStatus = statuses.find(s => s.id === id);
      toast.success(`Статус → ${newStatus?.name ?? id}`);
    } catch { toast.error('Не удалось изменить статус'); }
    finally { setSavingStatus(false); }
  }

  async function handlePriorityChange(val: number) {
    if (!task || val === task.priority) return;
    setSavingPriority(true);
    try {
      await updateTask(task.id, { priority: val });
      setTask(t => t ? {...t, priority: val, updatedAt: now()} : t);
      toast.success('Приоритет обновлён');
    } catch { toast.error('Не удалось изменить приоритет'); }
    finally { setSavingPriority(false); }
  }

  async function handleAssign(u: UIUser) {
    if (!task) return;
    setSavingAssignee(true); setShowUserPicker(false); setUserQuery('');
    try {
      await updateTask(task.id, { assigned_to: u.id });
      setTask(t => t ? {...t, assignedTo: { id: u.id, firstName: u.firstName, lastName: u.lastName }, updatedAt: now()} : t);
      toast.success(`Назначен ${u.firstName} ${u.lastName}`);
    } catch { toast.error('Не удалось назначить исполнителя'); }
    finally { setSavingAssignee(false); }
  }

  async function handleUnassign() {
    if (!task) return;
    setSavingAssignee(true);
    try {
      await updateTask(task.id, { assigned_to: '' });
      setTask(t => t ? {...t, assignedTo: undefined, updatedAt: now()} : t);
      toast.info('Исполнитель снят');
    } catch { toast.error('Ошибка'); }
    finally { setSavingAssignee(false); }
  }

  async function handleDeadlineChange(val: string) {
    if (!task) return;
    setSavingDeadline(true);
    try {
      await updateTask(task.id, { deadline: val ? new Date(val).toISOString() : undefined });
      setTask(t => t ? {...t, deadline: val ? new Date(val).toISOString() : undefined, updatedAt: now()} : t);
      toast.success(val ? `Дедлайн: ${fmt(new Date(val).toISOString())}` : 'Дедлайн снят');
    } catch { toast.error('Не удалось изменить дедлайн'); }
    finally { setSavingDeadline(false); }
  }

  async function handleDelete() {
    if (!task || !(await confirm({ message: `Удалить задачу «${task.name}»?`, danger: true, confirmLabel: 'Удалить' }))) return;
    setDeleting(true);
    try {
      await deleteTask(task.id);
      toast.success('Задача удалена');
      router.push(projectId ? `/projects/${projectId}` : '/projects');
    } catch { toast.error('Не удалось удалить задачу'); setDeleting(false); }
  }

  const filteredUsers = userQuery.trim()
    ? users.filter(u => `${u.firstName} ${u.lastName}`.toLowerCase().includes(userQuery.toLowerCase()) || u.email.toLowerCase().includes(userQuery.toLowerCase()))
    : users;

  if (loading) return (
    <div className="flex h-full min-h-0 flex-col gap-4 animate-fade-in p-1">
      <div className="flex items-center gap-2">
        <div className="skeleton h-4 w-16 rounded-lg"/>
        <div className="skeleton h-3 w-3 rounded"/>
        <div className="skeleton h-4 w-24 rounded-lg"/>
      </div>
      <SkeletonTaskDetail/>
    </div>
  );

  if (error || !task) return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="text-red-400 text-lg">{error ?? 'Задача не найдена'}</div>
      <button onClick={() => router.back()} className="text-emerald-400 hover:underline">← Назад</button>
    </div>
  );

  const overdueDeadline = isOverdue(task.deadline);
  const soonDeadline    = isDueSoon(task.deadline);
  const deadlineColor   = overdueDeadline ? 'text-red-400' : soonDeadline ? 'text-amber-400' : 'text-app';

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">

      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-app-2 flex-wrap">
          <button onClick={() => router.back()} className="hover:text-emerald-300 transition-colors">← Назад</button>
          {project && (<><span>/</span><Link href={`/projects/${projectId}`} className="hover:text-emerald-300 transition-colors">{project.name}</Link></>)}
          <span>/</span>
          <span className="text-app-2 truncate max-w-[200px]">{task.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Status badge in header */}
          {currentStatus && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium ring-1"
              style={{ background: currentStatus.color ? `${currentStatus.color}22` : 'rgba(255,255,255,0.05)',
                       color: currentStatus.color ?? '#94a3b8',
                       boxShadow: `0 0 0 1px ${currentStatus.color ?? '#ffffff22'}44` }}>
              {currentStatus.name}
            </span>
          )}
          {/* Priority badge */}
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ring-1 ${priorityMeta.badgeClass}`}>
            {priorityMeta.label}
          </span>
          {/* Copy link */}
          <button onClick={copyTaskLink} title="Скопировать ссылку"
            className="p-1.5 rounded-lg text-app-3 hover:text-app hover:bg-app-hover transition-colors text-xs">
            {copied ? '✓' : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 gap-5 overflow-hidden flex-col lg:flex-row">

        {/* ── Left ── */}
        <div className="flex-1 min-w-0 min-h-0 overflow-y-auto space-y-4">

          {/* Title */}
          <div className="t-surface rounded-2xl p-6">
            {editTitle ? (
              <div className="flex gap-2">
                <input value={titleDraft} onChange={e => setTitleDraft(e.target.value)}
                  onKeyDown={e => { if(e.key==='Enter') void saveTitle(); if(e.key==='Escape'){setEditTitle(false);setTitleDraft(task.name);} }}
                  className="flex-1 bg-transparent border-b border-emerald-500 text-2xl font-semibold outline-none pb-1" autoFocus/>
                <button onClick={() => void saveTitle()} disabled={savingTitle}
                  className="text-sm px-3 py-1 rounded-lg bg-emerald-600 hover:brightness-110 disabled:opacity-50 text-black font-semibold shrink-0">
                  {savingTitle ? '…' : 'OK'}
                </button>
                <button onClick={() => {setEditTitle(false);setTitleDraft(task.name);}} className="text-sm px-3 py-1 rounded-lg bg-app-subtle text-app-2 hover:text-app shrink-0">✕</button>
              </div>
            ) : (
              <h1 className="text-2xl font-semibold cursor-pointer hover:text-emerald-300 transition-colors group flex items-start gap-2"
                onClick={() => setEditTitle(true)}>
                {task.name}
                <span className="opacity-0 group-hover:opacity-40 text-base mt-1 shrink-0">✏️</span>
              </h1>
            )}
            <div className="mt-2 flex items-center gap-3 text-xs text-app-3 flex-wrap">
              <button onClick={copyTaskLink} className="font-mono hover:text-app-2 transition-colors select-all">
                #{task.id.slice(0,8)}
              </button>
              <span>·</span>
              <span>Обновлена {fmtFull(task.updatedAt)}</span>
            </div>
          </div>

          {/* Description */}
          <div className="t-surface rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-app-2 uppercase tracking-wider">Описание</h2>
              <button onClick={() => void handleImprove()} disabled={improving}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
                {improving ? <span className="animate-pulse">AI…</span> : <>✨ AI улучшить</>}
              </button>
            </div>
            {aiNote && (
              <div className="rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20 px-3 py-2 text-xs text-emerald-300 flex items-center gap-2">
                <span>✨</span>
                <span>AI улучшил описание — нажмите «Сохранить» чтобы применить</span>
              </div>
            )}
            <MarkdownEditor
              value={descDraft}
              onChange={v => { setDescDraft(v); setDescDirty(v !== task.description); }}
              rows={10}
              disabled={savingDesc}
              withImages
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-app-3">{descDirty ? 'Есть несохранённые изменения' : ''}</span>
              <button onClick={() => void saveDesc()} disabled={savingDesc || !descDirty}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-lime-500 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-40 transition">
                {savingDesc ? 'Сохранение…' : 'Сохранить описание'}
              </button>
            </div>
          </div>

          <ConveyorTaskPanel taskId={task.id} />

          <TaskCommitsPanel taskId={task.id} />
        </div>

        {/* ── Right sidebar ── */}
        <aside className="w-full lg:w-72 shrink-0 space-y-3 overflow-y-auto">

          {/* Status */}
          <SidebarCard label="Статус">
            {statuses.length > 0 ? (
              <div className="space-y-2">
                {/* Status pills (цветные чипы — один контрол, без дублирующего select) */}
                <div className="flex flex-wrap gap-1.5">
                  {statuses.map(s => (
                    <button key={s.id} disabled={savingStatus} onClick={() => void handleStatusChange(s.id)}
                      className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-all ring-1 ${s.id === task.statusId ? 'ring-2' : 'opacity-50 hover:opacity-80'}`}
                      style={{ background: s.color ? `${s.color}22` : 'rgba(255,255,255,0.05)',
                               color: s.color ?? '#94a3b8',
                               boxShadow: s.id === task.statusId ? `0 0 0 2px ${s.color ?? '#ffffff44'}44` : undefined }}>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : <span className="text-app-2 text-sm">—</span>}
          </SidebarCard>

          {/* Priority */}
          <SidebarCard label="Приоритет">
            <div className="flex flex-wrap gap-1.5">
              {TASK_PRIORITY_OPTIONS.map(o => {
                const meta = getTaskPriorityMeta(o.value);
                return (
                  <button key={o.value} disabled={savingPriority} onClick={() => void handlePriorityChange(o.value)}
                    className={`text-[11px] px-2.5 py-1 rounded-full font-medium ring-1 transition-all ${o.value === task.priority ? meta.badgeClass + ' ring-2' : 'opacity-50 hover:opacity-80 ' + meta.badgeClass}`}>
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </SidebarCard>

          {/* Assignee */}
          <SidebarCard label="Исполнитель">
            {task.assignedTo ? (
              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <Avatar name={`${task.assignedTo.firstName} ${task.assignedTo.lastName}`}
                    url={findAvatarUrl(task.assignedTo.id)} email={findEmail(task.assignedTo.id)}
                    fallbackKey={task.assignedTo.id} size="sm"/>
                  <span className="text-sm font-medium">{task.assignedTo.firstName} {task.assignedTo.lastName}</span>
                </div>
                <button onClick={() => void handleUnassign()} disabled={savingAssignee}
                  className="text-xs text-app-3 hover:text-red-400 transition-colors shrink-0" title="Снять">✕</button>
              </div>
            ) : <span className="text-app-3 text-sm italic">Не назначен</span>}

            <button onClick={() => setShowUserPicker(v => !v)}
              className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 hover:underline block">
              {task.assignedTo ? 'Сменить исполнителя' : '+ Назначить'}
            </button>

            {showUserPicker && (
              <div className="mt-2 rounded-xl overflow-hidden ring-1 ring-app t-surface-elevated">
                <input value={userQuery} onChange={e => setUserQuery(e.target.value)} placeholder="Поиск…" autoFocus
                  className="w-full bg-transparent px-3 py-2 text-sm border-b border-app focus:outline-none"/>
                <div className="max-h-48 overflow-y-auto">
                  {filteredUsers.slice(0,20).map(u => (
                    <button key={u.id} onClick={() => void handleAssign(u)} disabled={savingAssignee}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-app-hover text-left disabled:opacity-50 transition-colors">
                      <Avatar name={`${u.firstName} ${u.lastName}`} url={u.avatarUrl} email={u.email} fallbackKey={u.id} size="xs"/>
                      <div>
                        <div>{u.firstName} {u.lastName}</div>
                        <div className="text-xs text-app-3">{u.email}</div>
                      </div>
                    </button>
                  ))}
                  {filteredUsers.length === 0 && <div className="px-3 py-2 text-app-3 text-sm">Не найдено</div>}
                </div>
              </div>
            )}
          </SidebarCard>

          {/* Author */}
          <SidebarCard label="Автор">
            <div className="flex items-center gap-2">
              <Avatar name={`${task.createdBy.firstName} ${task.createdBy.lastName}`}
                url={findAvatarUrl(task.createdBy.id)} email={findEmail(task.createdBy.id)}
                fallbackKey={task.createdBy.id} size="sm"/>
              <span className="text-sm">{task.createdBy.firstName} {task.createdBy.lastName}</span>
            </div>
          </SidebarCard>

          {/* Dates */}
          <SidebarCard label="Даты">
            <div className="space-y-2.5 text-sm">
              <Row label="Начало" value={fmt(task.startDate)}/>
              <Row label="Дедлайн" value={
                <div className="flex items-center gap-2 justify-end">
                  {overdueDeadline && <span className="text-[10px] text-red-400 font-medium">просрочено</span>}
                  {soonDeadline && !overdueDeadline && <span className="text-[10px] text-amber-400 font-medium">скоро</span>}
                  <DatePicker
                    value={task.deadline}
                    onChange={iso => void handleDeadlineChange(iso ? iso.split('T')[0] : '')}
                    disabled={savingDeadline}
                    className={deadlineColor}
                    placeholder="Не задан"
                  />
                </div>
              }/>
              <Row label="Создана"   value={<span className="text-app-2">{fmtFull(task.createdAt)}</span>}/>
              <Row label="Обновлена" value={<span className="text-app-2">{fmtFull(task.updatedAt)}</span>}/>
            </div>
          </SidebarCard>

          {task.gitlabIssueId && (
            <SidebarCard label="GitLab">
              <span className="text-sm text-blue-400 font-mono">Issue #{task.gitlabIssueId}</span>
            </SidebarCard>
          )}

          {/* Danger zone */}
          <div className="t-surface rounded-2xl ring-1 ring-red-500/15 p-4">
            <p className="text-xs text-app-3 mb-2">Опасная зона</p>
            <button onClick={() => void handleDelete()} disabled={deleting}
              className="w-full rounded-xl bg-red-500/10 ring-1 ring-red-500/20 px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {deleting ? (
                <><span className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin"/>Удаление…</>
              ) : (
                <><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                </svg>Удалить задачу</>
              )}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SidebarCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="t-surface rounded-2xl p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-app-3 mb-3">{label}</div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-app-3 shrink-0 text-xs">{label}</span>
      <span className="text-app text-right flex-1 text-xs">{value}</span>
    </div>
  );
}
