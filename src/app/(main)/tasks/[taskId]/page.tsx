'use client';

import { use, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import { fetchTaskById, fetchTaskBoardProject, updateTask, moveTask, deleteTask, improveTaskReport } from '@/features/tasks/api';
import { fetchBoardStatus, type UIStatus } from '@/features/status/api';
import { fetchProjectById, type UIProject } from '@/features/projects/api';
import { fetchAllUsers, type UIUser } from '@/features/user/api';
import { getTaskPriorityMeta, TASK_PRIORITY_OPTIONS, type TaskPriorityValue } from '@/features/tasks/types';
import MarkdownEditor, { MarkdownView } from '@/components/ui/MarkdownEditor';
import { SkeletonTaskDetail } from '@/components/ui/Skeleton';

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

const fmt     = (iso?: string) => iso ? new Date(iso).toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric' }) : '—';
const fmtFull = (iso?: string) => iso ? new Date(iso).toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';

export default function TaskPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = use(params);
  const router = useRouter();

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
  const [savingTitle, setSavingTitle] = useState(false);
  const [savingDesc,  setSavingDesc]  = useState(false);
  const [improving,   setImproving]   = useState(false);
  const [aiNote,      setAiNote]      = useState(false);

  const [savingStatus,   setSavingStatus]   = useState(false);
  const [savingPriority, setSavingPriority] = useState(false);
  const [savingAssignee, setSavingAssignee] = useState(false);
  const [savingDeadline, setSavingDeadline] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [userQuery,      setUserQuery]      = useState('');
  const [deleting,       setDeleting]       = useState(false);

  useEffect(() => { load(); }, [taskId]);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [raw, loc] = await Promise.all([fetchTaskById(taskId), fetchTaskBoardProject(taskId)]);
      const t = mapTaskFull(raw);
      setTask(t); setTitleDraft(t.name); setDescDraft(t.description);
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

  async function saveTitle() {
    if (!task || !titleDraft.trim() || titleDraft.trim() === task.name) { setEditTitle(false); return; }
    setSavingTitle(true);
    try { await updateTask(task.id, { name: titleDraft.trim() }); setTask(t => t ? {...t, name: titleDraft.trim(), updatedAt: now()} : t); }
    finally { setSavingTitle(false); setEditTitle(false); }
  }
  async function saveDesc() {
    if (!task) return;
    setSavingDesc(true);
    try { await updateTask(task.id, { description: descDraft }); setTask(t => t ? {...t, description: descDraft, updatedAt: now()} : t); setAiNote(false); }
    finally { setSavingDesc(false); }
  }
  async function handleImprove() {
    if (!task) return;
    setImproving(true); setAiNote(false);
    try { const r = await improveTaskReport(task.id, descDraft); const text = r.improved_text ?? r.original_text ?? ''; setDescDraft(text); setAiNote(true); }
    finally { setImproving(false); }
  }
  async function handleStatusChange(id: string) {
    if (!task || id === task.statusId) return;
    setSavingStatus(true);
    try { await moveTask({ task_id: task.id, status_id: id }); setTask(t => t ? {...t, statusId: id, updatedAt: now()} : t); }
    finally { setSavingStatus(false); }
  }
  async function handlePriorityChange(val: number) {
    if (!task || val === task.priority) return;
    setSavingPriority(true);
    try { await updateTask(task.id, { priority: val }); setTask(t => t ? {...t, priority: val, updatedAt: now()} : t); }
    finally { setSavingPriority(false); }
  }
  async function handleAssign(u: UIUser) {
    if (!task) return;
    setSavingAssignee(true); setShowUserPicker(false);
    try {
      await updateTask(task.id, { assigned_to: u.id });
      setTask(t => t ? {...t, assignedTo: { id: u.id, firstName: u.firstName, lastName: u.lastName }, updatedAt: now()} : t);
    } finally { setSavingAssignee(false); }
  }
  async function handleDeadlineChange(val: string) {
    if (!task) return;
    setSavingDeadline(true);
    try { await updateTask(task.id, { deadline: val ? new Date(val).toISOString() : undefined }); setTask(t => t ? {...t, deadline: val ? new Date(val).toISOString() : undefined, updatedAt: now()} : t); }
    finally { setSavingDeadline(false); }
  }
  async function handleDelete() {
    if (!task || !confirm(`Удалить задачу «${task.name}»?`)) return;
    setDeleting(true);
    try { await deleteTask(task.id); router.push(projectId ? `/projects/${projectId}` : '/projects'); }
    finally { setDeleting(false); }
  }

  const filteredUsers = userQuery.trim()
    ? users.filter(u => `${u.firstName} ${u.lastName}`.toLowerCase().includes(userQuery.toLowerCase()) || u.email.toLowerCase().includes(userQuery.toLowerCase()))
    : users;

  if (loading) return (
    <div className="flex h-full min-h-0 flex-col gap-4 animate-fade-in p-1">
      <div className="flex items-center gap-2">
        <div className="skeleton h-4 w-16 rounded-lg" />
        <div className="skeleton h-3 w-3 rounded" />
        <div className="skeleton h-4 w-24 rounded-lg" />
      </div>
      <SkeletonTaskDetail />
    </div>
  );
  if (error || !task) return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="text-red-400 text-lg">{error ?? 'Задача не найдена'}</div>
      <button onClick={() => router.back()} className="text-emerald-400 hover:underline">← Назад</button>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 flex-wrap">
        <button onClick={() => router.back()} className="hover:text-emerald-300 transition-colors">← Назад</button>
        {project && (<><span>/</span><Link href={`/projects/${projectId}`} className="hover:text-emerald-300 transition-colors">{project.name}</Link></>)}
        <span>/</span>
        <span className="text-slate-300 truncate max-w-xs">{task.name}</span>
      </div>

      <div className="flex flex-1 min-h-0 gap-5 overflow-hidden flex-col lg:flex-row">

        {/* ── Left ── */}
        <div className="flex-1 min-w-0 min-h-0 overflow-y-auto space-y-4">

          {/* Title */}
          <div className="t-surface rounded-2xl p-6">
            {editTitle ? (
              <div className="flex gap-2">
                <input value={titleDraft} onChange={e => setTitleDraft(e.target.value)}
                  onKeyDown={e => { if(e.key==='Enter') saveTitle(); if(e.key==='Escape'){setEditTitle(false);setTitleDraft(task.name);} }}
                  className="flex-1 bg-transparent border-b border-emerald-500 text-2xl font-semibold outline-none pb-1" autoFocus/>
                <button onClick={saveTitle} disabled={savingTitle} className="text-sm px-3 py-1 rounded-lg bg-emerald-600 hover:brightness-110 disabled:opacity-50 text-black font-semibold shrink-0">
                  {savingTitle ? '…' : 'OK'}
                </button>
                <button onClick={() => {setEditTitle(false);setTitleDraft(task.name);}} className="text-sm px-3 py-1 rounded-lg bg-white/5 text-slate-400 hover:text-white shrink-0">✕</button>
              </div>
            ) : (
              <h1 className="text-2xl font-semibold cursor-pointer hover:text-emerald-300 transition-colors group flex items-start gap-2"
                onClick={() => setEditTitle(true)}>
                {task.name}
                <span className="opacity-0 group-hover:opacity-50 text-base mt-1 shrink-0">✏️</span>
              </h1>
            )}
            <div className="mt-1 text-xs text-slate-500 font-mono select-all">#{task.id.slice(0,8)}</div>
          </div>

          {/* Description */}
          <div className="t-surface rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Описание</h2>
              <button onClick={handleImprove} disabled={improving}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
                {improving ? <span className="animate-pulse">AI…</span> : <>✨ AI улучшить</>}
              </button>
            </div>
            {aiNote && (
              <div className="rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20 px-3 py-2 text-xs text-emerald-300">
                AI улучшил описание — нажмите «Сохранить» чтобы применить
              </div>
            )}
            <MarkdownEditor
              value={descDraft}
              onChange={setDescDraft}
              rows={10}
              disabled={savingDesc}
              withImages
            />
            <div className="flex justify-end">
              <button onClick={saveDesc} disabled={savingDesc || descDraft === task.description}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-lime-500 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-40 transition">
                {savingDesc ? 'Сохранение…' : 'Сохранить описание'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <aside className="w-full lg:w-64 shrink-0 space-y-3 overflow-y-auto">

          <SidebarCard label="Статус">
            {statuses.length > 0 ? (
              <select disabled={savingStatus} value={task.statusId} onChange={e => handleStatusChange(e.target.value)}
                className="w-full rounded-xl bg-white/5 ring-1 ring-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-emerald-500/50 disabled:opacity-50">
                {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            ) : <span className="text-slate-400 text-sm">{task.statusId ? `ID: ${task.statusId.slice(0,8)}` : '—'}</span>}
            {currentStatus?.color && (
              <div className="flex items-center gap-2 mt-2">
                <div className="w-3 h-3 rounded-full" style={{background: currentStatus.color}}/>
                <span className="text-xs text-slate-400">{currentStatus.name}</span>
              </div>
            )}
          </SidebarCard>

          <SidebarCard label="Приоритет">
            <select disabled={savingPriority} value={task.priority} onChange={e => handlePriorityChange(Number(e.target.value))}
              className="w-full rounded-xl bg-white/5 ring-1 ring-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-emerald-500/50 disabled:opacity-50">
              {TASK_PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <span className={`mt-2 inline-flex text-xs px-2 py-0.5 rounded-full ring-1 font-medium ${priorityMeta.badgeClass}`}>
              {priorityMeta.label}
            </span>
          </SidebarCard>

          <SidebarCard label="Исполнитель">
            {task.assignedTo ? (
              <div className="flex items-center gap-2">
                <Avatar name={`${task.assignedTo.firstName} ${task.assignedTo.lastName}`} url={findAvatarUrl(task.assignedTo.id)} email={findEmail(task.assignedTo.id)} fallbackKey={task.assignedTo.id} size="sm"/>
                <span className="text-sm">{task.assignedTo.firstName} {task.assignedTo.lastName}</span>
              </div>
            ) : <span className="text-slate-500 text-sm">Не назначен</span>}
            <button onClick={() => setShowUserPicker(v => !v)}
              className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 hover:underline">
              {task.assignedTo ? 'Сменить' : 'Назначить'}
            </button>
            {showUserPicker && (
              <div className="mt-2 t-surface rounded-xl overflow-hidden">
                <input value={userQuery} onChange={e => setUserQuery(e.target.value)} placeholder="Поиск…" autoFocus
                  className="w-full bg-transparent px-3 py-2 text-sm border-b border-white/10 focus:outline-none"/>
                <div className="max-h-48 overflow-y-auto">
                  {filteredUsers.slice(0,20).map(u => (
                    <button key={u.id} onClick={() => handleAssign(u)} disabled={savingAssignee}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 text-left disabled:opacity-50">
                      <Avatar name={`${u.firstName} ${u.lastName}`} url={u.avatarUrl} email={u.email} fallbackKey={u.id} size="xs"/>
                      <span>{u.firstName} {u.lastName}</span>
                    </button>
                  ))}
                  {filteredUsers.length === 0 && <div className="px-3 py-2 text-slate-500 text-sm">Не найдено</div>}
                </div>
              </div>
            )}
          </SidebarCard>

          <SidebarCard label="Автор">
            <div className="flex items-center gap-2">
              <Avatar name={`${task.createdBy.firstName} ${task.createdBy.lastName}`} url={findAvatarUrl(task.createdBy.id)} email={findEmail(task.createdBy.id)} fallbackKey={task.createdBy.id} size="sm"/>
              <span className="text-sm">{task.createdBy.firstName} {task.createdBy.lastName}</span>
            </div>
          </SidebarCard>

          <SidebarCard label="Даты">
            <div className="space-y-2 text-sm">
              <Row label="Начало" value={fmt(task.startDate)}/>
              <Row label="Дедлайн" value={
                <input type="date" defaultValue={task.deadline ? task.deadline.split('T')[0] : ''}
                  onChange={e => handleDeadlineChange(e.target.value)} disabled={savingDeadline}
                  className="bg-transparent focus:outline-none text-slate-200 disabled:opacity-50 cursor-pointer w-full text-right"/>
              }/>
              <Row label="Создана"   value={fmtFull(task.createdAt)}/>
              <Row label="Обновлена" value={fmtFull(task.updatedAt)}/>
            </div>
          </SidebarCard>

          {task.gitlabIssueId && (
            <SidebarCard label="GitLab">
              <span className="text-sm text-emerald-400">Issue #{task.gitlabIssueId}</span>
            </SidebarCard>
          )}

          <div className="t-surface rounded-2xl ring-1 ring-red-500/20 p-4">
            <button onClick={handleDelete} disabled={deleting}
              className="w-full rounded-xl bg-red-500/10 ring-1 ring-red-500/20 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50">
              {deleting ? 'Удаление…' : 'Удалить задачу'}
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
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">{label}</div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-200 text-right flex-1">{value}</span>
    </div>
  );
}
