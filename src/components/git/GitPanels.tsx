'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { formatDateShort } from '@/lib/date';
import type { Commit, CodeRepository } from '@/features/git/api';
import {
  useGitProviders, useProjectRepos, useProjectCommits, useTaskCommits,
  useLinkRepo, useUnlinkRepo, useSyncProject, useSyncRepo,
} from '@/features/git/hooks';

const PROVIDER_ICON: Record<string, string> = { github: '🐙', gitflic: '🟣', gitverse: '🔶' };

function CommitList({ commits }: { commits: Commit[] }) {
  if (commits.length === 0) {
    return <div className="t-caption py-2">Коммитов пока нет</div>;
  }
  return (
    <ul className="space-y-1">
      {commits.map((c) => {
        const firstLine = (c.message || '').split('\n')[0];
        const inner = (
          <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 bg-app-subtle">
            <code className="shrink-0 text-xs text-emerald-400 font-mono">{c.sha.slice(0, 7)}</code>
            <span className="flex-1 min-w-0 truncate text-sm text-app">{firstLine || '(без сообщения)'}</span>
            <span className="shrink-0 t-caption">{c.author_name || c.author_login || '—'}</span>
            <span className="shrink-0 t-caption">{formatDateShort(c.committed_at)}</span>
          </div>
        );
        return (
          <li key={c.id}>
            {c.url
              ? <a href={c.url} target="_blank" rel="noopener noreferrer" className="block hover:brightness-110">{inner}</a>
              : inner}
          </li>
        );
      })}
    </ul>
  );
}

export function TaskCommitsPanel({ taskId, enabled = true }: { taskId: string; enabled?: boolean }) {
  const { data, isLoading } = useTaskCommits(taskId, enabled);
  const commits = data?.commits ?? [];
  return (
    <div className="t-surface rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="t-title text-app">Коммиты</h3>
        <span className="rounded-full bg-app-hover text-app-2 text-xs px-2 py-0.5">{data?.total_count ?? 0}</span>
      </div>
      {isLoading ? <div className="t-body py-2">Загрузка…</div> : <CommitList commits={commits} />}
    </div>
  );
}

function RepoRow({ repo, projectId, readOnly }: { repo: CodeRepository; projectId: string; readOnly: boolean }) {
  const toast = useToast();
  const confirm = useConfirm();
  const syncRepo = useSyncRepo(projectId);
  const unlinkRepo = useUnlinkRepo(projectId);

  return (
    <div className="flex items-center gap-2 rounded-xl bg-app-subtle px-3 py-2">
      <span className="shrink-0">{PROVIDER_ICON[repo.provider] ?? '📦'}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-app truncate">{repo.owner}/{repo.name}</div>
        <div className="t-caption">
          {repo.provider}{repo.branch ? ` · ${repo.branch}` : ''}
          {repo.last_sync_at ? ` · синк ${formatDateShort(repo.last_sync_at)}` : ' · не синкан'}
        </div>
      </div>
      {!readOnly && (
        <div className="flex shrink-0 gap-1">
          <button
            onClick={async () => {
              try { const s = await syncRepo.mutateAsync(repo.id); toast.success(`Новых коммитов: ${s.created}`); }
              catch (e: any) { toast.error(e?.message || 'Ошибка синка'); }
            }}
            disabled={syncRepo.isPending}
            className="rounded-lg px-2.5 py-1 text-xs text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors">
            ↻ Синк
          </button>
          <button
            onClick={async () => {
              if (!(await confirm({ title: 'Отвязать репозиторий', message: `Отвязать ${repo.owner}/${repo.name}?`, danger: true, confirmLabel: 'Отвязать' }))) return;
              try { await unlinkRepo.mutateAsync(repo.id); toast.success('Отвязан'); }
              catch (e: any) { toast.error(e?.message || 'Ошибка'); }
            }}
            className="rounded-lg px-2 py-1 text-xs text-app-3 hover:text-red-300 hover:bg-red-500/10 transition-colors">✕</button>
        </div>
      )}
    </div>
  );
}

export function ProjectGitPanel({ projectId, readOnly = false }: { projectId: string; readOnly?: boolean }) {
  const toast = useToast();
  const { data: providers = [] } = useGitProviders();
  const { data: repos = [], isLoading: reposLoading } = useProjectRepos(projectId);
  const { data: commitsData, isLoading: commitsLoading } = useProjectCommits(projectId);
  const linkRepo = useLinkRepo(projectId);
  const syncProject = useSyncProject(projectId);

  const [showForm, setShowForm] = useState(false);
  const [provider, setProvider] = useState('github');
  const [owner, setOwner] = useState('');
  const [name, setName] = useState('');
  const [branch, setBranch] = useState('');

  async function submitLink() {
    if (!owner.trim() || !name.trim()) { toast.error('Укажите owner и name'); return; }
    try {
      await linkRepo.mutateAsync({ provider, owner: owner.trim(), name: name.trim(), branch: branch.trim() || undefined });
      toast.success('Репозиторий привязан');
      setOwner(''); setName(''); setBranch(''); setShowForm(false);
    } catch (e: any) { toast.error(e?.message || 'Не удалось привязать'); }
  }

  return (
    <div className="space-y-4">
      <div className="t-surface rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="t-title text-app">Репозитории</h3>
          <span className="rounded-full bg-app-hover text-app-2 text-xs px-2 py-0.5">{repos.length}</span>
          {!readOnly && (
            <div className="ml-auto flex gap-2">
              <button onClick={async () => {
                try { const s = await syncProject.mutateAsync(); toast.success(`Синк: новых коммитов ${s.created} из ${s.repositories} репо`); }
                catch (e: any) { toast.error(e?.message || 'Ошибка синка'); }
              }} disabled={syncProject.isPending || repos.length === 0}
                className="rounded-xl px-3 py-1.5 text-xs text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors">
                ↻ Синхронизировать всё
              </button>
              <button onClick={() => setShowForm(v => !v)} className="btn-primary text-xs py-1.5 px-3">+ Репозиторий</button>
            </div>
          )}
        </div>

        {showForm && !readOnly && (
          <div className="grid sm:grid-cols-2 gap-2 rounded-xl bg-app-subtle p-3">
            <select value={provider} onChange={e => setProvider(e.target.value)} className="t-input">
              {(providers.length ? providers : ['github', 'gitflic']).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input value={owner} onChange={e => setOwner(e.target.value)} placeholder="owner / namespace" className="t-input" />
            <input value={name} onChange={e => setName(e.target.value)} placeholder="repo name" className="t-input" />
            <input value={branch} onChange={e => setBranch(e.target.value)} placeholder="branch (опц.)" className="t-input" />
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="btn-ghost text-sm">Отмена</button>
              <button onClick={submitLink} disabled={linkRepo.isPending} className="btn-primary text-sm py-2 px-4 disabled:opacity-50">Привязать</button>
            </div>
          </div>
        )}

        {reposLoading ? <div className="t-body py-2">Загрузка…</div>
          : repos.length === 0 ? <div className="t-caption py-2">Нет привязанных репозиториев</div>
          : <div className="space-y-1.5">{repos.map(r => <RepoRow key={r.id} repo={r} projectId={projectId} readOnly={readOnly} />)}</div>}
      </div>

      <div className="t-surface rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="t-title text-app">Последние коммиты</h3>
          <span className="rounded-full bg-app-hover text-app-2 text-xs px-2 py-0.5">{commitsData?.total_count ?? 0}</span>
        </div>
        {commitsLoading ? <div className="t-body py-2">Загрузка…</div> : <CommitList commits={commitsData?.commits ?? []} />}
        <p className="t-caption mt-3">Подсказка: укажите в сообщении коммита <code className="text-emerald-400/80">task:&lt;id&gt;</code> или <code className="text-emerald-400/80">#&lt;id&gt;</code> — он привяжется к задаче.</p>
      </div>
    </div>
  );
}
