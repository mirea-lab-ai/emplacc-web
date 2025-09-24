'use client';

import { useEffect, useState } from 'react';
import Panel from '@/components/ui/Panel';
import KanbanBoard, { KBColumn } from '@/components/projects/kanban';

const demoColumns: KBColumn[] = [
  { id: 'c-open', title: 'Open', tasks: [] },
  { id: 'c-done', title: 'Done', tasks: [] },
];

export default function ProjectsBoardPanel() {
  const [columns, setColumns] = useState<KBColumn[]>([]);

  useEffect(() => {
    const load = (): KBColumn[] => {
      const rawNew = localStorage.getItem('proj_kanban_v2');
      const rawOld = localStorage.getItem('proj_kanban');
      const parsed = rawNew
        ? safeParse<KBColumn[]>(rawNew, [])
        : rawOld
          ? safeParse<KBColumn[]>(rawOld, [])
          : [];
      if (!Array.isArray(parsed) || parsed.length < 2) return demoColumns;
      return parsed;
    };
    setColumns(load());
  }, []);

  useEffect(() => {
    localStorage.setItem('proj_kanban_v2', JSON.stringify(columns));
  }, [columns]);

    return (
        <Panel className="p-6 t-surface">
            {/* было viewportOffset={160} */}
            <KanbanBoard columns={columns} onChange={setColumns} viewportOffset={260} />
        </Panel>
    );

}

function safeParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
