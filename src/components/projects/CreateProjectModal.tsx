'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useCreateProject } from '@/features/projects/hooks';
import { getUserId } from '@/lib/auth';

type Props = {
  onClose: () => void;
  onSuccess?: () => void;
};

export default function CreateProjectModal({ onClose, onSuccess }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [gitlabUrl, setGitlabUrl] = useState('');
  const [gitlabProjectId, setGitlabProjectId] = useState('');
  const { mutate: createProject, isPending, error } = useCreateProject();
  const toast = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const userId = getUserId();
    if (!userId) {
      toast.error('Ошибка: пользователь не авторизован');
      return;
    }

    const projectId = gitlabProjectId.trim() ? parseInt(gitlabProjectId) : undefined;
    if (gitlabProjectId.trim() && isNaN(projectId!)) {
      toast.error('Ошибка: ID проекта GitLab должен быть числом');
      return;
    }

    createProject(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        created_by: userId,
        gitlab_project_id: projectId,
        gitlab_url: gitlabUrl.trim() || undefined,
        status: 'active',
      },
      { onSuccess: () => { onSuccess?.(); } },
    );
  };

  return (
    <Modal open onClose={onClose}>
      <div className="w-full max-w-md rounded-xl border border-white/20 bg-white/5 p-6 shadow-lg backdrop-blur-sm">
        <h2 className="mb-4 text-xl font-semibold text-white">Новый проект</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="project-name" className="mb-1 block text-sm font-medium text-slate-300">
              Название проекта <span className="text-red-400">*</span>
            </label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-emerald-500"
              placeholder="Название проекта"
              required
            />
          </div>

          <div>
            <label htmlFor="project-description" className="mb-1 block text-sm font-medium text-slate-300">
              Описание <span className="text-slate-500">(необязательно)</span>
            </label>
            <textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-emerald-500"
              placeholder="Описание проекта"
            />
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">GitLab <span className="normal-case font-normal text-slate-600">(необязательно)</span></p>
            <div>
              <label htmlFor="gitlab-url" className="mb-1 block text-sm font-medium text-slate-300">
                GitLab URL
              </label>
              <input
                id="gitlab-url"
                type="url"
                value={gitlabUrl}
                onChange={(e) => setGitlabUrl(e.target.value)}
                className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-emerald-500"
                placeholder="https://gitlab.example.com/group/project"
              />
            </div>
            <div>
              <label htmlFor="gitlab-project-id" className="mb-1 block text-sm font-medium text-slate-300">
                GitLab Project ID
              </label>
              <input
                id="gitlab-project-id"
                type="number"
                value={gitlabProjectId}
                onChange={(e) => setGitlabProjectId(e.target.value)}
                className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-emerald-500"
                placeholder="123"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-400">Ошибка: {error.message}</p>}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-slate-300 hover:bg-white/10 transition-colors"
              disabled={isPending}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isPending || !name.trim()}
            >
              {isPending ? 'Создаём...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
