'use client';

import Panel from '@/components/ui/Panel';
import AddMemberModal from '@/components/teams/AddMemberModal';
import { useState } from 'react';

export type SimpleMember = { id: string; name: string; role: string };
export type SimpleGroup  = { id: string; name: string; members: SimpleMember[] };

export default function ProjectTeamsSimple({ groups: initial }: { groups: SimpleGroup[] }) {
  const [groups, setGroups] = useState<SimpleGroup[]>(initial);
  const [addFor, setAddFor] = useState<string | null>(null);

  const addMember = (gId: string, m: SimpleMember) => {
    setGroups(prev =>
      prev.map(g => (g.id === gId ? { ...g, members: [...g.members, m] } : g))
    );
  };
  const removeMember = (gId: string, mId: string) => {
    setGroups(prev =>
      prev.map(g =>
        g.id === gId ? { ...g, members: g.members.filter(m => m.id !== mId) } : g
      )
    );
  };

  if (!groups.length) {
    return (
      <Panel className="p-6">
        <div className="text-app-2">В проекте пока нет команд</div>
      </Panel>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {groups.map(g => (
        <Panel key={g.id} className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold">{g.name}</h3>
            <button
              onClick={() => setAddFor(g.id)}
              className="rounded-xl bg-[#2b3681] px-4 py-2 text-slate-200 hover:brightness-110"
            >
              + Добавить сотрудника
            </button>
          </div>

          {g.members.length ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {g.members.map(m => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-xl t-surface ring-1 ring-app px-4 py-3"
                >
                  <div>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-app-2 text-sm">{m.role}</div>
                  </div>
                  <button
                    onClick={() => removeMember(g.id, m.id)}
                    className="rounded-lg p-2 ring-1 ring-app text-app-2 hover:text-white hover:bg-[#ef4657]/25 hover:ring-[#ef4657]/40 transition"
                    title="Удалить"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M3 6h18" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl bg-app-subtle px-4 py-6 text-app-2 ring-1 ring-app">
              В группе пока нет сотрудников
            </div>
          )}
        </Panel>
      ))}

      <AddMemberModal
        open={!!addFor}
        onClose={() => setAddFor(null)}
        teamId={addFor || ''}
      />
    </div>
  );
}
