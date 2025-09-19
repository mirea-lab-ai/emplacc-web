'use client';

import Panel from '@/components/ui/Panel';
import Link from 'next/link';

export type ForumNote = {
  id: string;
  topic: string;
  text: string;
  href?: string;
};

export default function ForumUpdates({ notes }: { notes: ForumNote[] }) {
  return (
    <Panel className="p-5 h-full flex flex-col backdrop-blur-md bg-white/5 border border-white/10">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Форум</h2>
        <Link href="/forum" className="text-sm text-slate-300 hover:text-white">
          Открыть →
        </Link>
      </div>

      <div className="flex-1 min-h-0">
        {notes.length ? (
          <ul className="space-y-2 h-full overflow-auto pr-1 custom-scroll">
            {notes.map((n) => (
              <li
                key={n.id}
                className="rounded-xl backdrop-blur-sm bg-white/10 border border-white/20 text-white hover:bg-white/20 ring-1 ring-white/10 px-4 py-2"
              >
                <Link href={n.href ?? '/forum'}>
                  <div className="font-semibold">{n.topic}</div>
                  <div className="text-slate-400 text-sm line-clamp-2">
                    {n.text}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid h-full place-items-center rounded-xl bg-[#141c2f] ring-1 ring-white/10 text-slate-400">
            Новых сообщений нет
          </div>
        )}
      </div>
    </Panel>
  );
}
