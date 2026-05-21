'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import type { UIProject } from '@/features/projects/api';
import { updateProject, deleteProject } from '@/features/projects/api';

type Props = {
  project: UIProject;
  onProjectUpdate?: (updated: UIProject) => void;
  onProjectDelete?: (projectId: string) => void;
};

const STATUS_OPTIONS = [
  { value: 'active',  label: 'Активный' },
  { value: 'frozen',  label: 'Заморожен' },
  { value: 'support', label: 'В поддержке' },
];

export default function ProjectsSettingsPanel({ project, onProjectUpdate, onProjectDelete }: Props) {
  const toast   = useToast();
  const confirm = useConfirm();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [name,              setName]              = useState('');
  const [description,       setDescription]       = useState('');
  const [status,            setStatus]            = useState('active');
  const [gitlabProjectId,   setGitlabProjectId]   = useState('');
  const [gitlabUrl,         setGitlabUrl]         = useState('');

  // Синхронизируем с проектом
  useEffect(() => {
    setName(project.name ?? '');
    setDescription(project.description ?? '');
    setStatus((project.status ?? 'active').toLowerCase());
    setGitlabProjectId(''); // gitlab_project_id не в UIProject — оставляем пустым
    setGitlabUrl('');
  }, [project.id]);

  const dirty = name !== (project.name ?? '') ||
                description !== (project.description ?? '') ||
                status !== (project.status ?? 'active').toLowerCase();

  async function handleSave() {
    if (!name.trim()) { toast.error('Название не может быть пустым'); return; }
    setSaving(true);
    try {
      const payload: any = { name: name.trim(), description: description.trim(), status };
      if (gitlabProjectId.trim()) payload.gitlab_project_id = parseInt(gitlabProjectId, 10);
      if (gitlabUrl.trim())       payload.gitlab_url = gitlabUrl.trim();
      const updated = await updateProject(project.id, payload);
      onProjectUpdate?.(updated);
      toast.success('Настройки сохранены');
    } catch { toast.error('Не удалось сохранить настройки'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!(await confirm({ title: 'Удалить проект?', message: `«${project.name}» будет удалён вместе со всеми досками и статусами. Это действие необратимо.`, danger: true, confirmLabel: 'Удалить проект' }))) return;
    setDeleting(true);
    try {
      await deleteProject(project.id);
      toast.success('Проект удалён');
      onProjectDelete?.(project.id);
    } catch { toast.error('Не удалось удалить проект'); setDeleting(false); }
  }

  return (
    <div className="space-y-5 animate-fade-in">

      {/* General */}
      <section className="t-surface rounded-2xl p-6 space-y-4 ring-1 ring-white/8">
        <h2 className="font-semibold text-white text-base flex items-center gap-2">
          <span>📋</span> Основные настройки
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="t-label mb-1.5 block">Название *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Название проекта" className="t-input" />
          </div>

          <div>
            <label className="t-label mb-1.5 block">Статус</label>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map(o => (
                <button key={o.value} type="button" onClick={() => setStatus(o.value)}
                  className={`text-xs px-3 py-2 rounded-xl font-medium ring-1 transition-all ${
                    status === o.value
                      ? 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/40'
                      : 'bg-white/5 text-slate-400 ring-white/10 hover:bg-white/10 hover:text-white'
                  }`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="t-label mb-1.5 block">Описание</label>
          <textarea rows={4} value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Цели, контекст, ключевые требования…"
            className="t-input resize-none w-full" />
        </div>
      </section>

      {/* GitLab */}
      <section className="t-surface rounded-2xl p-6 space-y-4 ring-1 ring-white/8">
        <h2 className="font-semibold text-white text-base flex items-center gap-2">
          <span>🦊</span> GitLab интеграция
          <span className="text-xs font-normal text-slate-500">(опционально)</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="t-label mb-1.5 block">GitLab URL</label>
            <input type="url" value={gitlabUrl} onChange={e => setGitlabUrl(e.target.value)}
              placeholder="https://gitlab.example.com/group/project" className="t-input" />
          </div>
          <div>
            <label className="t-label mb-1.5 block">GitLab Project ID</label>
            <input type="number" value={gitlabProjectId} onChange={e => setGitlabProjectId(e.target.value)}
              placeholder="123" className="t-input" />
          </div>
        </div>
      </section>

      {/* Save button */}
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs text-slate-600">
          {dirty ? '● Есть несохранённые изменения' : ''}
        </span>
        <button onClick={handleSave} disabled={saving || !name.trim()}
          className="btn-primary text-sm py-2.5 px-6 disabled:opacity-50">
          {saving ? 'Сохраняем…' : 'Сохранить изменения'}
        </button>
      </div>

      {/* Danger zone */}
      <section className="t-surface rounded-2xl p-6 ring-1 ring-red-500/15 space-y-3">
        <h2 className="font-semibold text-red-400 text-base flex items-center gap-2">
          <span>⚠️</span> Опасная зона
        </h2>
        <p className="text-xs text-slate-500">Удаление проекта удалит все связанные доски, статусы и настройки. Задачи останутся в системе.</p>
        <button onClick={handleDelete} disabled={deleting}
          className="rounded-xl bg-red-500/10 ring-1 ring-red-500/25 px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50 flex items-center gap-2">
          {deleting
            ? <><span className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin"/>Удаление…</>
            : <>🗑 Удалить проект</>}
        </button>
      </section>
    </div>
  );
}
