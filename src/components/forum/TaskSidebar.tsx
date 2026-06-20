'use client';

type SidebarTask = {
  id: string;
  title: string;
  subtasksCount?: number;
};

export default function TaskSidebar({
                                      tasks,
                                      activeId,
                                      onSelect,
                                    }: {
  tasks: SidebarTask[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {tasks.map((t) => {
        const active = t.id === activeId;
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={[
              'relative w-full text-left rounded-2xl px-4 py-3 transition-colors',
              'ring-1 ring-app t-surface',
              active ? 'ring-2 ring-indigo-500/40' : '',
            ].join(' ')}
          >
            {/* градиент при активной задаче */}
            <div
              className={[
                'pointer-events-none absolute inset-0 rounded-2xl transition-opacity',
                active
                  ? 'bg-gradient-to-br from-emerald-500 to-lime-400'
                  : 'opacity-0',
              ].join(' ')}
            />
            <div className="relative z-[1]">
              <div className={['font-semibold', active ? 'text-black' : 'text-app'].join(' ')}>{t.title}</div>
              {typeof t.subtasksCount === 'number' && (
                <div className={['text-sm', active ? 'text-slate-800' : 'text-app-2'].join(' ')}>
                  Подзадач: {t.subtasksCount}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
