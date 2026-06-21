'use client';

import { useEffect, useState } from 'react';
import Panel from '@/components/ui/Panel';
import { MarkdownView } from '@/components/ui/MarkdownEditor';
import { APP_VERSION, patchNotesMarkdown } from '@/lib/patchNotes';

type VersionInfo = {
  api?: string;
  build_time?: string;
  services?: Record<string, string>;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 border-b border-app/40 last:border-0">
      <span className="t-caption">{label}</span>
      <span className="font-mono text-sm text-app">{value || '—'}</span>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-app-3 mb-1">{title}</div>
      <div>{children}</div>
    </div>
  );
}

export default function AboutSystem() {
  const [info, setInfo] = useState<VersionInfo | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    // /version публичный — токен не нужен.
    fetch(`${API_BASE}/version`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => { if (alive) setInfo(d); })
      .catch(() => { if (alive) setErr(true); });
    return () => { alive = false; };
  }, []);

  const services = info?.services ?? {};

  return (
    <div className="grid gap-5 md:grid-cols-[320px,1fr] animate-fade-in">
      <Panel className="p-6 space-y-4">
        <h2 className="t-title text-app">Версии</h2>

        <Group title="Фронтенд">
          <Row label="Интерфейс" value={APP_VERSION} />
        </Group>

        <Group title="Бэкенд">
          <Row label="API" value={err ? 'недоступен' : info?.api} />
          {info?.build_time && <Row label="Сборка" value={info.build_time} />}
        </Group>

        {Object.keys(services).length > 0 && (
          <Group title="Сервисы">
            {Object.entries(services).map(([name, ver]) => (
              <Row key={name} label={name.toUpperCase()} value={ver} />
            ))}
          </Group>
        )}
      </Panel>

      <Panel className="p-6 space-y-3">
        <h2 className="t-title text-app">Что нового</h2>
        <div className="prose-app max-w-none">
          <MarkdownView content={patchNotesMarkdown()} />
        </div>
      </Panel>
    </div>
  );
}
