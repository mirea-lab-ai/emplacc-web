'use client';

import { useEffect, useState } from 'react';
import { fetchTokens, createToken, revokeToken, type TokenInfo, type CreatedToken } from '@/features/tokens/api';
import { useToast } from '@/components/ui/Toast';

const MCP_URL = 'https://emplacc.g-309.ru/mcp';

const MCP_AGENTS = [
  {
    id: 'claude',
    label: 'Claude Code',
    icon: '🤖',
    description: '~/.claude/settings.json',
    config: (token: string) => JSON.stringify({
      mcpServers: { emplacc: { type: 'sse', url: `${MCP_URL}?token=${token}` } }
    }, null, 2),
  },
  {
    id: 'opencode',
    label: 'OpenCode',
    icon: '⚡',
    description: '~/.config/opencode/config.json',
    config: (token: string) => JSON.stringify({
      mcp: { emplacc: { type: 'sse', url: `${MCP_URL}?token=${token}` } }
    }, null, 2),
  },
  {
    id: 'codex',
    label: 'OpenAI Codex',
    icon: '🟢',
    description: '~/.codex/config.json',
    config: (token: string) => JSON.stringify({
      mcpServers: { emplacc: { type: 'sse', url: `${MCP_URL}?token=${token}` } }
    }, null, 2),
  },
  {
    id: 'copilot',
    label: 'GitHub Copilot',
    icon: '🐙',
    description: '.vscode/mcp.json',
    config: (token: string) => JSON.stringify({
      servers: { emplacc: { type: 'sse', url: `${MCP_URL}?token=${token}` } }
    }, null, 2),
  },
];

function MCPGuide({ token }: { token: string }) {
  const [activeAgent, setActiveAgent] = useState('claude');
  const [copied, setCopied] = useState(false);
  const agent = MCP_AGENTS.find(a => a.id === activeAgent)!;
  const snippet = agent.config(token);

  function copy() {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="t-surface rounded-2xl p-5 space-y-4">
      <div>
        <h4 className="font-semibold text-white">Подключение MCP к агентам</h4>
        <p className="t-caption mt-0.5">Добавьте конфиг в нужный файл и перезапустите агента</p>
      </div>

      {/* Agent tabs */}
      <div className="flex flex-wrap gap-2">
        {MCP_AGENTS.map(a => (
          <button key={a.id} onClick={() => setActiveAgent(a.id)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors
              ${activeAgent === a.id
                ? 'bg-white/10 text-white ring-1 ring-white/20'
                : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}>
            <span>{a.icon}</span>{a.label}
          </button>
        ))}
      </div>

      {/* Config block */}
      <div className="space-y-2">
        <div className="t-label">{agent.description}</div>
        <div className="relative rounded-xl bg-black/40 ring-1 ring-white/10">
          <pre className="text-xs text-emerald-300/90 font-mono p-4 overflow-x-auto whitespace-pre">{snippet}</pre>
          <button onClick={copy}
            className="absolute top-2 right-2 btn-ghost text-xs py-1 px-2.5">
            {copied ? '✓' : 'Копировать'}
          </button>
        </div>
      </div>

      {token === '<ВАШ_ТОКЕН>' && (
        <p className="t-caption text-amber-400/70">
          Создайте токен выше — инструкция подставит его автоматически
        </p>
      )}
    </div>
  );
}

const EXPIRY_OPTIONS = [
  { label: 'Бессрочный', value: undefined },
  { label: '30 дней', value: '30d' },
  { label: '90 дней', value: '90d' },
  { label: '1 год', value: '365d' },
];

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function APITokens() {
  const toast = useToast();
  const [tokens, setTokens]     = useState<TokenInfo[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName]         = useState('');
  const [expiry, setExpiry]     = useState<string | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<CreatedToken | null>(null);
  const [copied, setCopied]     = useState(false);

  async function load() {
    try { setTokens(await fetchTokens()); }
    catch { toast.error('Не удалось загрузить токены'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const t = await createToken(name.trim(), expiry);
      setNewToken(t);
      setTokens(prev => [{ id: t.id, name: t.name, created_at: t.created_at }, ...prev]);
      setName(''); setExpiry(undefined); setShowCreate(false);
    } catch {
      toast.error('Не удалось создать токен');
    } finally { setCreating(false); }
  }

  async function handleRevoke(id: string, tName: string) {
    if (!confirm(`Отозвать токен «${tName}»? Все MCP-сессии, использующие его, перестанут работать.`)) return;
    try {
      await revokeToken(id);
      setTokens(prev => prev.filter(t => t.id !== id));
      toast.success(`Токен «${tName}» отозван`);
    } catch {
      toast.error('Не удалось отозвать токен');
    }
  }

  function copyToken(value: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="t-title text-white">API-токены</h3>
          <p className="t-body mt-0.5">Используйте для MCP-сервера и других интеграций</p>
        </div>
        <button onClick={() => setShowCreate(v => !v)} className="btn-primary text-sm py-2 px-4">
          + Создать токен
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="t-surface-elevated rounded-2xl p-5 space-y-4 animate-fade-in">
          <h4 className="font-semibold text-white">Новый токен</h4>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="t-label mb-1.5 block">Название</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Например: MCP Claude"
                className="t-input" onKeyDown={e => e.key === 'Enter' && handleCreate()} />
            </div>
            <div>
              <label className="t-label mb-1.5 block">Срок действия</label>
              <select value={expiry ?? ''} onChange={e => setExpiry(e.target.value || undefined)}
                className="t-input">
                {EXPIRY_OPTIONS.map(o => (
                  <option key={o.label} value={o.value ?? ''}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowCreate(false)} className="btn-ghost text-sm">Отмена</button>
            <button onClick={handleCreate} disabled={!name.trim() || creating} className="btn-primary text-sm py-2 px-4 disabled:opacity-50">
              {creating ? 'Создаём…' : 'Создать'}
            </button>
          </div>
        </div>
      )}

      {/* New token reveal */}
      {newToken && (
        <div className="t-surface-accent rounded-2xl p-5 space-y-3 animate-fade-in">
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 text-xl">✓</span>
            <div>
              <div className="font-semibold text-white">Токен создан — сохраните его сейчас</div>
              <div className="t-body mt-0.5">После закрытия токен больше не будет показан.</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-black/30 ring-1 ring-white/10 px-4 py-3">
            <code className="flex-1 text-emerald-300 text-sm font-mono break-all">{newToken.token}</code>
            <button onClick={() => copyToken(newToken.token)}
              className="shrink-0 btn-secondary text-xs py-1.5 px-3">
              {copied ? '✓ Скопировано' : 'Копировать'}
            </button>
          </div>
          <div className="t-caption">
            Используй в MCP: <code className="text-emerald-400/80">EMPLACC_TOKEN={newToken.token}</code>
          </div>
          <button onClick={() => setNewToken(null)} className="btn-ghost text-sm">Закрыть</button>
        </div>
      )}

      {/* Token list */}
      {loading ? (
        <div className="t-body py-4">Загрузка…</div>
      ) : tokens.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-6 py-8 text-center">
          <div className="text-3xl mb-2">🔑</div>
          <div className="t-body">Нет активных токенов</div>
        </div>
      ) : (
        <div className="space-y-2">
          {tokens.map(t => (
            <div key={t.id} className="stat-card flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white truncate">{t.name}</div>
                <div className="t-caption mt-0.5">
                  Создан {fmtDate(t.created_at)}
                  {t.last_used_at && ` · Последнее использование ${fmtDate(t.last_used_at)}`}
                  {t.expires_at && ` · Истекает ${fmtDate(t.expires_at)}`}
                </div>
              </div>
              <button onClick={() => handleRevoke(t.id, t.name)}
                className="shrink-0 rounded-xl px-3 py-1.5 text-xs text-red-400/70 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                Отозвать
              </button>
            </div>
          ))}
        </div>
      )}

      <MCPGuide token={newToken?.token ?? '<ВАШ_ТОКЕН>'} />
    </div>
  );
}
