'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export default function AvatarEditor({
                                       name,
                                       src,
                                       onChange,
                                     }: {
  name: string;
  src?: string;
  onChange: (next?: string) => void; // undefined = убрать
}) {
  const initials = useMemo(() => {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
  }, [name]);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | undefined>(src);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => setDraft(src), [src]);

  // Esc закрывает
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {/* аватар + градиентная окантовка */}
      <button
        onClick={() => setOpen(true)}
        className="group relative inline-grid place-items-center rounded-full p-[3px] bg-gradient-to-br from-indigo-500/80 via-blue-500/80 to-fuchsia-500/80"
        aria-label="Сменить аватар"
      >
        <div className="rounded-full bg-[#0f1422] p-[3px]">
          {src ? (
            <img
              src={src}
              alt="avatar"
              className="h-32 w-32 rounded-full object-cover"
            />
          ) : (
            <div className="h-32 w-32 rounded-full grid place-items-center bg-[#141c2f] text-3xl font-semibold text-white">
              {initials || '🙂'}
            </div>
          )}
        </div>
        <span className="pointer-events-none absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition grid place-items-center text-sm">
          Изменить
        </span>
      </button>

      {/* модалка */}
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="w-full max-w-md rounded-2xl bg-[#111829] p-6 ring-1 ring-white/10">
            <h2 className="text-xl font-semibold mb-4">Смена аватара</h2>

            <div className="flex items-center gap-5">
              <div className="rounded-full p-[3px] bg-gradient-to-br from-indigo-500/80 via-blue-500/80 to-fuchsia-500/80">
                <div className="h-28 w-28 overflow-hidden rounded-full bg-[#0f1422]">
                  {draft ? (
                    <img
                      src={draft}
                      alt="preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-slate-400">
                      нет фото
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const reader = new FileReader();
                    reader.onload = () => setDraft(reader.result as string);
                    reader.readAsDataURL(f);
                  }}
                />
                <button
                  className="rounded-lg bg-[#2b3681] px-4 py-2 text-slate-200 hover:brightness-110"
                  onClick={() => fileRef.current?.click()}
                >
                  Выбрать файл…
                </button>
                {draft && (
                  <button
                    className="rounded-lg bg-[#ef4657] px-4 py-2 text-white hover:brightness-110"
                    onClick={() => setDraft(undefined)}
                  >
                    Удалить фото
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-lg px-4 py-2 text-slate-300 hover:text-white"
                onClick={() => setOpen(false)}
              >
                Отмена
              </button>
              <button
                className="rounded-lg bg-[#3452ff] px-5 py-2 font-semibold text-white hover:brightness-110"
                onClick={() => {
                  onChange(draft);
                  setOpen(false);
                }}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
