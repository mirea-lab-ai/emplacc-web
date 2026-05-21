'use client';

import { useState, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useAllProjects, useAddProjectToTeam } from '@/features/teams/hooks';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed } from '@/lib/auth';

type Props = {
  open: boolean;
  onClose: () => void;
  teamId: string;
};

export default function AddProjectModal({ open, onClose, teamId }: Props) {
  const [query, setQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<any>(null);
  
  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const { data: allProjects, isLoading } = useAllProjects(hasCreds);
  const addProjectMutation = useAddProjectToTeam();
  const toast = useToast();

  // Фильтруем проекты по поисковому запросу
  const filteredProjects = useMemo(() => {
    if (!allProjects || !query.trim()) return allProjects || [];
    
    const searchTerm = query.toLowerCase();
    return allProjects.filter((project: any) => 
      project.name?.toLowerCase().includes(searchTerm) ||
      project.description?.toLowerCase().includes(searchTerm)
    );
  }, [allProjects, query]);

  const handleSubmit = async () => {
    if (!selectedProject || addProjectMutation.isPending) return;
    
    try {
      await addProjectMutation.mutateAsync({ teamId, projectId: selectedProject.id });
      onClose();
      setSelectedProject(null);
      setQuery('');
    } catch (error) {
      console.error('Ошибка при добавлении проекта:', error);
      toast.error('Ошибка при добавлении проекта. Попробуйте еще раз.');
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-black border border-white/20 p-6">
        <h3 className="text-2xl font-semibold text-slate-100 mb-4">Добавить проект к команде</h3>

        <div className="relative mb-4">
          <input
            autoFocus 
            value={query} 
            onChange={e => setQuery(e.target.value)}
            placeholder="Поиск по названию проекта..."
            className="w-full rounded-xl t-surface text-slate-100 placeholder:text-slate-400 px-4 py-3 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200" 
              aria-label="Очистить"
            >
              ×
            </button>
          )}
        </div>

        <div className="mb-6">
          <div className="text-sm text-slate-300 mb-2">Доступные проекты</div>
          <div className="max-h-64 overflow-auto rounded-xl bg-white/5 ring-1 ring-white/10">
            {isLoading ? (
              <div className="p-4 text-slate-400 text-center">Загрузка проектов...</div>
            ) : filteredProjects.length === 0 ? (
              <div className="p-4 text-slate-400 text-center">
                {query ? 'Проекты не найдены' : 'Нет доступных проектов'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredProjects.map((project: any) => (
                  <button
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
                    className={`w-full text-left p-3 hover:bg-white/10 transition-colors ${
                      selectedProject?.id === project.id ? 'bg-emerald-500/20 border-l-4 border-emerald-500' : ''
                    }`}
                  >
                    <div className="font-semibold text-white">{project.name}</div>
                    {project.description && (
                      <div className="text-slate-400 text-sm mt-1">{project.description}</div>
                    )}
                    <div className="text-xs text-slate-500 mt-1">
                      Создан: {new Date(project.created_at).toLocaleDateString('ru-RU')}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedProject && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="text-sm text-emerald-400 mb-1">Выбранный проект:</div>
            <div className="font-semibold text-white">{selectedProject.name}</div>
            {selectedProject.description && (
              <div className="text-slate-300 text-sm mt-1">{selectedProject.description}</div>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-slate-300 hover:bg-white/10 transition-colors"
            disabled={addProjectMutation.isPending}
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedProject || addProjectMutation.isPending}
            className="rounded-lg bg-gradient-to-br from-emerald-500 to-lime-400 px-5 py-2 font-semibold text-black hover:brightness-110 disabled:opacity-60 flex items-center gap-2"
          >
            {addProjectMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Добавляем...
              </>
            ) : (
              'Добавить проект'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
