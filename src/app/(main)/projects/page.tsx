'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useIsClient } from '@/hooks/useIsClient';
import { getUserId, isAuthed } from '@/lib/auth';
import { fetchUserProjects, type UIProject } from '@/features/projects/api';
import CreateProjectModal from '@/components/projects/CreateProjectModal';
import { useUserRole } from '@/features/roles/hooks';

const STATUS_META: Record<string, { label: string; color: string }> = {
  active:  { label: 'Активен',    color: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30' },
  frozen:  { label: 'Заморожен',  color: 'bg-blue-500/15    text-blue-300    ring-blue-500/30' },
  support: { label: 'Поддержка',  color: 'bg-amber-500/15   text-amber-300   ring-amber-500/30' },
};

// Project icon — gradient circle with first letter
function ProjectIcon({ name, size = 'lg' }: { name: string; size?: 'sm' | 'lg' }) {
  const char = (name?.[0] ?? '?').toUpperCase();
  const hue = Array.from(name ?? '').reduce((h, c) => h + c.charCodeAt(0), 0) % 360;
  const sz = size === 'lg' ? 'w-12 h-12 text-xl' : 'w-8 h-8 text-sm';
  return (
    <div className={`${sz} rounded-xl flex items-center justify-center font-bold text-white shrink-0`}
      style={{ background: `linear-gradient(135deg, hsl(${hue},60%,35%), hsl(${(hue+40)%360},50%,45%))` }}>
      {char}
    </div>
  );
}

const RU_TO_EN: Record<string, string> = { 'ё':'`','й':'q','ц':'w','у':'e','к':'r','е':'t','н':'y','г':'u','ш':'i','щ':'o','з':'p','х':'[','ъ':']','ф':'a','ы':'s','в':'d','а':'f','п':'g','р':'h','о':'j','л':'k','д':'l','ж':';','э':"'",'я':'z','ч':'x','с':'c','м':'v','и':'b','т':'n','ь':'m','б':',','ю':'.' };
const EN_TO_RU = Object.fromEntries(Object.entries(RU_TO_EN).map(([ru, en]) => [en, ru]));
function swapLayout(v: string, m: Record<string, string>) { return v.split('').map(c => { const l = c.toLowerCase(); const r = m[l]; return r ? (c === l ? r : r.toUpperCase()) : c; }).join(''); }
function buildVariants(s: string) { const t = s.trim().toLowerCase(); if (!t) return []; const ns = t.replace(/\s+/g,''); const ru = swapLayout(t, EN_TO_RU); const en = swapLayout(t, RU_TO_EN); return Array.from(new Set([t, ns, ru, ru.replace(/\s+/g,''), en, en.replace(/\s+/g,'')].filter(Boolean))); }

export default function ProjectsPage() {
  return <Suspense fallback={<LoadingSkeleton/>}><ProjectsListView/></Suspense>;
}

function ProjectsListView() {
  const router = useRouter();
  const isClient = useIsClient();
  const userId = isClient ? getUserId() : null;
  const hasCreds = isClient && isAuthed() && !!userId;
  const { data: userRole } = useUserRole(userId, hasCreds);
  const normalizedRole = userRole?.role?.name?.trim().toLowerCase();
  const isGuest = normalizedRole === 'guest';
  const canManage = normalizedRole === 'admin' || normalizedRole === 'manager';

  const [projects, setProjects] = useState<UIProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!hasCreds || !userId) { setProjects([]); setLoading(false); return; }
    setLoading(true);
    fetchUserProjects(userId).then(setProjects).catch(() => setProjects([])).finally(() => setLoading(false));
  }, [hasCreds, userId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return projects;
    const variants = buildVariants(search);
    return projects.filter(p => {
      const nv = buildVariants(p.name ?? '');
      return variants.some(c => nv.some(v => v.includes(c) || c.includes(v)));
    });
  }, [projects, search]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="t-heading text-white">Проекты</h1>
          <p className="t-body mt-1">{loading ? '…' : `${projects.length} ${projects.length === 1 ? 'проект' : projects.length < 5 ? 'проекта' : 'проектов'}`}</p>
        </div>
        {canManage && (
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm py-2.5 px-5 press btn-shimmer shrink-0">
            + Новый проект
          </button>
        )}
      </div>

      {/* Search */}
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Поиск проектов…"
        className="t-input w-full sm:w-80" />

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({length:6}).map((_,i) => <ProjectCardSkeleton key={i}/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-50">
          <div className="text-5xl">📁</div>
          <div className="t-title text-white">{search ? 'Ничего не найдено' : 'Проектов пока нет'}</div>
          {!search && canManage && <p className="t-body">Создайте первый проект</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 list-appear">
          {filtered.map(p => (
            <ProjectCard key={p.id} project={p} onClick={() => router.push(`/projects/${p.id}`)} />
          ))}
        </div>
      )}

      {!isGuest && showCreate && (
        <CreateProjectModal onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            if (!userId) return;
            setLoading(true);
            fetchUserProjects(userId).then(setProjects).catch(() => setProjects([])).finally(() => setLoading(false));
          }} />
      )}
    </div>
  );
}

function ProjectCard({ project, onClick }: { project: UIProject; onClick: () => void }) {
  const status = project.status?.toLowerCase().trim() ?? 'active';
  const meta = STATUS_META[status] ?? STATUS_META.active;

  return (
    <button type="button" onClick={onClick}
      className="t-surface rounded-2xl p-5 ring-1 ring-white/8 hover:ring-white/20 text-left group transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 animate-fade-in-scale w-full">
      <div className="flex items-start gap-3 mb-3">
        <ProjectIcon name={project.name} />
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="font-semibold text-white truncate group-hover:text-emerald-300 transition-colors">
            {project.name ?? 'Без названия'}
          </div>
          <span className={`inline-flex items-center mt-1 text-[10px] px-2 py-0.5 rounded-full ring-1 font-medium ${meta.color}`}>
            {meta.label}
          </span>
        </div>
      </div>
      {project.description ? (
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{project.description}</p>
      ) : (
        <p className="text-xs text-slate-600 italic">Без описания</p>
      )}
      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
        <span className="text-xs text-emerald-400/60 group-hover:text-emerald-300/80 transition-colors">
          Открыть →
        </span>
        {project.createdAt && (
          <span className="text-[10px] text-slate-600">
            {new Date(project.createdAt).toLocaleDateString('ru-RU', { day:'2-digit', month:'short', year:'numeric' })}
          </span>
        )}
      </div>
    </button>
  );
}

function ProjectCardSkeleton() {
  return (
    <div className="t-surface rounded-2xl p-5 ring-1 ring-white/8 space-y-3">
      <div className="flex items-start gap-3">
        <div className="skeleton w-12 h-12 rounded-xl"/>
        <div className="flex-1 space-y-2 pt-1">
          <div className="skeleton h-4 w-32 rounded"/>
          <div className="skeleton h-3 w-16 rounded-full"/>
        </div>
      </div>
      <div className="skeleton h-3 w-full rounded"/>
      <div className="skeleton h-3 w-3/4 rounded"/>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between">
        <div className="space-y-2"><div className="skeleton h-8 w-32 rounded-xl"/><div className="skeleton h-4 w-20 rounded"/></div>
        <div className="skeleton h-10 w-36 rounded-xl"/>
      </div>
      <div className="skeleton h-10 w-80 rounded-xl"/>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({length:6}).map((_,i) => <ProjectCardSkeleton key={i}/>)}
      </div>
    </div>
  );
}
