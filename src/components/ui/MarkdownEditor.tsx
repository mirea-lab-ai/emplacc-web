'use client';

import { useRef, useState, useCallback, type DragEvent, type ChangeEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { uploadImage } from '@/lib/upload';

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  /** Показывать кнопку загрузки изображений (требует S3) */
  withImages?: boolean;
};

export default function MarkdownEditor({
  value, onChange, placeholder = 'Описание в формате Markdown…',
  rows = 8, disabled = false, withImages = true,
}: Props) {
  const [tab, setTab]       = useState<'write' | 'preview'>('write');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver]   = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Вставка текста в позицию курсора
  const insertAtCursor = useCallback((before: string, after = '') => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const selected = value.slice(start, end);
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = start + before.length;
      el.selectionEnd   = start + before.length + selected.length;
    });
  }, [value, onChange]);

  // Используем ref чтобы иметь актуальное значение в async-коллбэках
  const valueRef = useRef(value);
  valueRef.current = value;

  const handleUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setUploading(true);
    const placeholder_ = `![загрузка…](uploading)`;
    const pos = textareaRef.current?.selectionStart ?? valueRef.current.length;
    const withPlaceholder = valueRef.current.slice(0, pos) + placeholder_ + valueRef.current.slice(pos);
    onChange(withPlaceholder);
    try {
      const { url } = await uploadImage(file);
      onChange(valueRef.current.replace(placeholder_, `![${file.name}](${url})`));
    } catch {
      onChange(valueRef.current.replace(placeholder_, ''));
    } finally {
      setUploading(false);
    }
  }, [onChange]);

  const onFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = '';
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const TOOLBAR = [
    { icon: 'B',  title: 'Жирный',     wrap: ['**', '**'] },
    { icon: 'I',  title: 'Курсив',      wrap: ['*', '*'] },
    { icon: '~~', title: 'Зачёркнутый', wrap: ['~~', '~~'] },
    { icon: '<>',  title: 'Код',         wrap: ['`', '`'] },
    { icon: '```',title: 'Блок кода',   wrap: ['```\n', '\n```'] },
    { icon: '—',  title: 'Заголовок H2',wrap: ['## ', ''] },
    { icon: '•',  title: 'Список',      wrap: ['\n- ', ''] },
    { icon: '1.',  title: 'Нум. список', wrap: ['\n1. ', ''] },
  ] as const;

  return (
    <div className={`rounded-xl ring-1 overflow-hidden transition-all ${dragOver ? 'ring-emerald-500/60 bg-emerald-500/5' : 'ring-white/10'}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      {/* Tab bar + toolbar */}
      <div className="flex items-center gap-1 bg-white/[0.03] border-b border-white/10 px-2 py-1.5">
        <button onClick={() => setTab('write')}
          className={`px-3 py-1 text-sm rounded-lg transition-colors ${tab === 'write' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}>
          Редактор
        </button>
        <button onClick={() => setTab('preview')}
          className={`px-3 py-1 text-sm rounded-lg transition-colors ${tab === 'preview' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}>
          Предпросмотр
        </button>

        {tab === 'write' && (
          <div className="flex items-center gap-0.5 ml-2 border-l border-white/10 pl-2">
            {TOOLBAR.map(t => (
              <button key={t.icon} title={t.title} disabled={disabled}
                onClick={() => insertAtCursor(t.wrap[0], t.wrap[1])}
                className="px-1.5 py-1 text-xs text-slate-400 hover:text-white hover:bg-white/5 rounded transition-colors disabled:opacity-40 font-mono">
                {t.icon}
              </button>
            ))}
            {withImages && (
              <>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileInput} />
                <button title="Загрузить изображение" disabled={disabled || uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-1.5 py-1 text-xs text-slate-400 hover:text-emerald-300 hover:bg-white/5 rounded transition-colors disabled:opacity-40">
                  {uploading ? <span className="animate-pulse-soft">⏳</span> : '🖼'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {tab === 'write' ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={dragOver ? 'Отпустите изображение для загрузки…' : placeholder}
          rows={rows}
          disabled={disabled}
          className="w-full bg-transparent px-4 py-3 text-slate-200 resize-y focus:outline-none text-sm leading-relaxed font-mono placeholder-slate-600"
          onPaste={(e) => {
            const file = e.clipboardData.files[0];
            if (file?.type.startsWith('image/')) { e.preventDefault(); handleUpload(file); }
          }}
        />
      ) : (
        <div className="min-h-[120px] px-4 py-3 prose prose-invert prose-sm max-w-none">
          {value.trim() ? (
            <MarkdownView content={value} />
          ) : (
            <p className="text-slate-600 italic">Нет содержимого</p>
          )}
        </div>
      )}

      {/* Drag hint */}
      {withImages && tab === 'write' && (
        <div className="px-4 py-1.5 text-xs text-slate-600 border-t border-white/5 flex items-center gap-2">
          <span>Поддерживается Markdown</span>
          <span>·</span>
          <span>Drag&Drop или вставка изображений</span>
          {uploading && <span className="ml-auto text-emerald-400 animate-pulse-soft">Загрузка…</span>}
        </div>
      )}
    </div>
  );
}

// Переиспользуемый рендерер markdown
export function MarkdownView({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        img: ({ src, alt }) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt ?? ''} className="max-w-full rounded-lg my-2" />
        ),
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
            {children}
          </a>
        ),
        code: ({ children, className }) => {
          const isBlock = className?.includes('language-');
          return isBlock
            ? <code className={`${className} block bg-white/5 rounded-lg px-3 py-2 text-xs overflow-x-auto`}>{children}</code>
            : <code className="bg-white/10 rounded px-1 py-0.5 text-xs font-mono text-emerald-300">{children}</code>;
        },
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-emerald-500/50 pl-3 text-slate-400 italic">{children}</blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
