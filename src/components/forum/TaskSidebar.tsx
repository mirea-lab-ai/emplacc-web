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
              'ring-1 ring-white/10 bg-[#141c2f] hover:bg-[#16213a]',
              active ? 'ring-2 ring-indigo-500/40' : '',
            ].join(' ')}
          >
            {/* градиент при активной задаче */}
            <div
              className={[
                'pointer-events-none absolute inset-0 rounded-2xl transition-opacity',
                active
                  ? 'opacity-60 bg-gradient-to-r from-indigo-600 via-blue-600 to-fuchsia-600'
                  : 'opacity-0',
              ].join(' ')}
            />
            <div className="relative z-[1]">
              <div className="font-semibold">{t.title}</div>
              {typeof t.subtasksCount === 'number' && (
                <div className="text-slate-400 text-sm">
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
