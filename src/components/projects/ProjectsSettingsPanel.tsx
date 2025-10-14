'use client';

import { useEffect, useState } from 'react';
import Panel from '@/components/ui/Panel';
import type { UIProject } from '@/features/projects/api';
import { updateProject } from '@/features/projects/api';

type ProjectSettings = {
  name: string;
  description: string;
  gitlab_project_id: string; // В UI как строка для input
  gitlab_url: string;
  status: 'active' | 'frozen' | 'support';
};

type Props = {
  project: UIProject;
  onProjectUpdate?: (updatedProject: UIProject) => void;
};

export default function ProjectsSettingsPanel({ project, onProjectUpdate }: Props) {
  const [settings, setSettings] = useState<ProjectSettings>({
    name: project.name || '',
    description: project.description || '',
    gitlab_project_id: '',
    gitlab_url: '',
    status: 'active',
  });

  useEffect(() => {
    // Инициализируем настройки из проекта
    setSettings({
      name: project.name || '',
      description: project.description || '',
      gitlab_project_id: '',
      gitlab_url: '',
      status: (project.status as any) || 'active',
    });
  }, [project]);

  const saveSettings = async () => {
    try {
      // Фильтруем пустые значения
      const payload: any = {};
      if (settings.name.trim()) payload.name = settings.name;
      if (settings.description.trim()) payload.description = settings.description;
      if (settings.gitlab_project_id.trim()) payload.gitlab_project_id = parseInt(settings.gitlab_project_id, 10);
      if (settings.gitlab_url.trim()) payload.gitlab_url = settings.gitlab_url;
      if (settings.status) payload.status = settings.status;

      console.log('Отправляем PATCH запрос (обновление проекта):', {
        url: `/project/${project.id}`,
        payload: payload
      });
      
      const updatedProject = await updateProject(project.id, payload);
      
      // Уведомляем родительский компонент об обновлении
      if (onProjectUpdate) {
        onProjectUpdate(updatedProject);
      }
      
      alert('Настройки проекта сохранены успешно!');
    } catch (error) {
      console.error('Ошибка при сохранении настроек проекта:', error);
      alert(`Ошибка при сохранении настроек проекта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  return (
    <Panel className="p-6 t-surface">
      <h2 className="text-xl font-semibold mb-4">Настройки проекта</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <label className="grid gap-2">
            <span className="text-slate-200">Название проекта</span>
            <input
              type="text"
              value={settings.name}
              onChange={(e) => setSettings((p) => ({ ...p, name: e.target.value }))}
              className="h-12 rounded-xl backdrop-blur-sm bg-white/10 border border-white/20 hover:bg-white/20 px-4 ring-1 ring-white/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              placeholder="Введите название проекта"
            />
          </label>
          
          <label className="grid gap-2">
            <span className="text-slate-200">GitLab Project ID</span>
            <input
              type="text"
              value={settings.gitlab_project_id}
              onChange={(e) => setSettings((p) => ({ ...p, gitlab_project_id: e.target.value }))}
              className="h-12 rounded-xl backdrop-blur-sm bg-white/10 border border-white/20 hover:bg-white/20 px-4 ring-1 ring-white/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              placeholder="Введите GitLab Project ID"
            />
          </label>
          
          <label className="grid gap-2">
            <span className="text-slate-200">GitLab URL</span>
            <input
              type="url"
              value={settings.gitlab_url}
              onChange={(e) => setSettings((p) => ({ ...p, gitlab_url: e.target.value }))}
              className="h-12 rounded-xl backdrop-blur-sm bg-white/10 border border-white/20 hover:bg-white/20 px-4 ring-1 ring-white/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              placeholder="https://gitlab.example.com/project"
            />
          </label>
        </div>
        
        <div className="space-y-4">
          <label className="grid gap-2">
            <span className="text-slate-200">Описание проекта</span>
            <textarea
              rows={6}
              value={settings.description}
              onChange={(e) => setSettings((p) => ({ ...p, description: e.target.value }))}
              className="rounded-xl backdrop-blur-sm bg-white/10 border border-white/20 hover:bg-white/20 px-4 py-3 ring-1 ring-white/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              placeholder="Опишите цели, контекст, ключевые требования…"
            />
          </label>
          
          <label className="grid gap-2">
            <span className="text-slate-200">Статус</span>
            <select
              value={settings.status}
              onChange={(e) => setSettings((p) => ({ ...p, status: e.target.value as any }))}
              className="h-12 rounded-xl backdrop-blur-sm bg-white/10 border border-white/20 hover:bg-white/20 px-4 ring-1 ring-white/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 [color-scheme:dark]"
            >
              <option className="bg-slate-900 text-slate-100" value="active">Активный</option>
              <option className="bg-slate-900 text-slate-100" value="frozen">Замороженный</option>
              <option className="bg-slate-900 text-slate-100" value="support">В поддержке</option>
            </select>
          </label>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <button
          onClick={saveSettings}
          className="rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 px-5 py-2 font-semibold text-black hover:brightness-110"
        >
          Сохранить изменения
        </button>
      </div>
    </Panel>
  );
}
