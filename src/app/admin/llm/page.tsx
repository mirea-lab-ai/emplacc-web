'use client';

import { useEffect, useState } from 'react';
import Panel from '@/components/ui/Panel';
import { useToast } from '@/components/ui/Toast';
import { http } from '@/lib/http';

type LLMSettings = {
  webui_url: string;
  webui_model: string;
  system_prompt: string;
  has_token: boolean;
  updated_at?: string;
  updated_by?: string;
};

const DEFAULT_PROMPT = `Ты — работник разработчик web/ml/LLM.
Отвечай на русском языке.
я тебе говорю контекст - описание задачи и что я написал в отчете проделанной работы за день.
ты должен на основе контекста переписать отчет более обширно.
пиши без специальных знаков. без пункта дальнейшие действия. текст, который ты расширил из того, что я сделал`;

export default function LLMSettingsPage() {
  const toast = useToast();
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [testing,  setTesting]  = useState(false);

  const [url,    setUrl]    = useState('');
  const [token,  setToken]  = useState('');
  const [model,  setModel]  = useState('');
  const [prompt, setPrompt] = useState('');
  const [hasToken, setHasToken] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await http('/admin/llm-settings');
      if (!res.ok) throw new Error();
      const data: LLMSettings = await res.json();
      setUrl(data.webui_url ?? '');
      setModel(data.webui_model ?? '');
      setPrompt(data.system_prompt || DEFAULT_PROMPT);
      setHasToken(data.has_token);
      if (data.updated_at) {
        setLastUpdate(new Date(data.updated_at).toLocaleString('ru-RU'));
      }
    } catch {
      toast.error('Не удалось загрузить настройки LLM');
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const body: Record<string, string> = {
        webui_url:     url,
        webui_model:   model,
        system_prompt: prompt,
      };
      if (token.trim()) body.webui_token = token;

      const res = await http('/admin/llm-settings', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success('Настройки сохранены');
      setToken('');
      load();
    } catch {
      toast.error('Не удалось сохранить настройки');
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    try {
      const res = await fetch(url || 'http://localhost:3000', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || 'test'}`,
        },
        body: JSON.stringify({
          model: model || 'test',
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok || res.status === 422) {
        toast.success('Соединение установлено');
      } else {
        toast.warning(`Сервер ответил ${res.status}`);
      }
    } catch (e: any) {
      if (e?.name === 'TimeoutError') toast.error('Таймаут — сервер недоступен');
      else toast.error(`Ошибка: ${e?.message ?? 'unknown'}`);
    } finally {
      setTesting(false);
    }
  }

  function resetPrompt() { setPrompt(DEFAULT_PROMPT); }

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-3xl">
      <Panel className="px-6 py-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="t-heading text-white">Настройки LLM</h1>
            <p className="t-body mt-0.5">Модель, API-адрес и системный промпт для улучшения отчётов</p>
          </div>
          {lastUpdate && (
            <span className="t-caption">Обновлено: {lastUpdate}</span>
          )}
        </div>
      </Panel>

      {loading ? (
        <Panel className="p-6 t-body">Загрузка…</Panel>
      ) : (
        <>
          {/* Connection */}
          <Panel className="p-6 space-y-5">
            <h2 className="t-title text-white flex items-center gap-2">
              🔌 Подключение
            </h2>

            <label className="grid gap-1.5">
              <span className="t-label">URL API <span className="text-red-400">*</span></span>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="http://10.14.49.32:3000/api/chat/completions"
                className="t-input font-mono text-sm"
              />
              <span className="t-caption">Open WebUI или любой OpenAI-совместимый эндпоинт</span>
            </label>

            <label className="grid gap-1.5">
              <span className="t-label">
                API Token {hasToken && <span className="badge badge-emerald ml-1">установлен</span>}
              </span>
              <input
                type="password"
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder={hasToken ? '••••••••  (оставь пустым чтобы не менять)' : 'sk-...'}
                className="t-input font-mono text-sm"
              />
            </label>

            <div className="flex justify-end">
              <button
                onClick={testConnection}
                disabled={testing || !url}
                className="btn-secondary text-sm py-2 px-4 disabled:opacity-50"
              >
                {testing ? 'Проверяем…' : '⚡ Проверить соединение'}
              </button>
            </div>
          </Panel>

          {/* Model */}
          <Panel className="p-6 space-y-5">
            <h2 className="t-title text-white">🤖 Модель</h2>

            <label className="grid gap-1.5">
              <span className="t-label">Название модели <span className="text-red-400">*</span></span>
              <input
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="gemma3:12b"
                className="t-input font-mono text-sm"
              />
              <span className="t-caption">Должна быть доступна на выбранном сервере</span>
            </label>

            {/* Быстрый выбор популярных моделей */}
            <div>
              <span className="t-label block mb-2">Быстрый выбор</span>
              <div className="flex flex-wrap gap-2">
                {['gemma3:12b','gemma3:4b','llama3.2:3b','llama3.1:8b','qwen2.5:7b','mistral:7b'].map(m => (
                  <button key={m} onClick={() => setModel(m)}
                    className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                      model === m
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:text-white hover:border-white/20'
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          {/* System Prompt */}
          <Panel className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="t-title text-white">📝 Системный промпт</h2>
              <button onClick={resetPrompt} className="btn-ghost text-xs text-slate-500 hover:text-white">
                Сбросить к дефолту
              </button>
            </div>

            <div className="t-caption rounded-xl bg-emerald-500/5 ring-1 ring-emerald-500/15 px-4 py-3">
              Промпт определяет как модель будет улучшать отчёты. Переменные не поддерживаются — описание задачи и текст отчёта подставляются автоматически.
            </div>

            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={10}
              className="t-input resize-y font-mono text-sm leading-relaxed"
              placeholder="Системный промпт…"
            />
          </Panel>

          {/* Save */}
          <div className="flex justify-end gap-3 pb-6">
            <button onClick={load} disabled={loading} className="btn-secondary text-sm py-2 px-5">
              Отменить
            </button>
            <button
              onClick={save}
              disabled={saving || !url || !model}
              className="btn-primary text-sm py-2.5 px-6 disabled:opacity-50 press btn-shimmer"
            >
              {saving ? 'Сохранение…' : 'Сохранить настройки'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
