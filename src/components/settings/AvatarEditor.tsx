'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { getGravatarUrl } from '@/lib/gravatar';
import { uploadAvatar, isPresignedUrl, refreshPresignedUrl } from '@/lib/upload';
import { getUserId } from '@/lib/auth';

export default function AvatarEditor({
                                       name,
                                       src,
                                       email,
                                       onChange,
                                       readOnly = false,
                                     }: {
  name: string;
  src?: string;
  email?: string;
  onChange: (next?: string) => void; // undefined = убрать
  readOnly?: boolean;
}) {
  const initials = useMemo(() => {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
  }, [name]);

  const [open, setOpen]       = useState(false);
  const [draft, setDraft]     = useState<string | undefined>(src);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [gravatarFailed, setGravatarFailed] = useState(false);
  const [retried,   setRetried]   = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { setDraft(src); setImgFailed(false); setGravatarFailed(false); setRetried(false); }, [src]);

  const gravatarUrl = useMemo(() => {
    if (!email) return undefined;
    return getGravatarUrl(email, 256);
  }, [email]);

  // Каскад: загруженный аватар (draft/src) → (refresh presigned) → gravatar → инициалы.
  const primarySrc = draft ?? src;
  const usingPrimary = !imgFailed && !!primarySrc;
  const usingGravatar = !usingPrimary && !gravatarFailed && !!gravatarUrl;
  const displaySrc = usingPrimary ? primarySrc : usingGravatar ? gravatarUrl : undefined;

  const handleImgError = async () => {
    if (usingPrimary) {
      if (!retried && primarySrc && isPresignedUrl(primarySrc)) {
        setRetried(true);
        try {
          const fresh = await refreshPresignedUrl(primarySrc);
          setDraft(fresh);
          return;
        } catch { /* не вышло — падаем на gravatar ниже */ }
      }
      setImgFailed(true); // свой аватар не открылся → пробуем gravatar
      return;
    }
    if (usingGravatar) {
      setGravatarFailed(true); // gravatar не открылся → инициалы
    }
  };

  // Esc закрывает
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const avatarCore = (
    <div className="rounded-full bg-[#0f1422] p-[3px]">
      <div className="relative h-32 w-32 overflow-hidden rounded-full bg-[#141c2f]">
        {displaySrc ? (
          <Image
            src={displaySrc}
            alt="avatar"
            fill
            sizes="128px"
            className="object-cover"
            unoptimized
            onError={handleImgError}
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-3xl font-semibold text-white">
            {initials || '🙂'}
          </div>
        )}
      </div>
    </div>
  );

  if (readOnly) {
    return (
      <div className="inline-grid place-items-center">
        <div className="relative inline-grid place-items-center rounded-full p-[3px] bg-gradient-to-br from-emerald-500 via-lime-400 to-cyan-400">
          {avatarCore}
        </div>
        <span className="mt-3 text-xs text-app-2">Изменение аватара недоступно</span>
      </div>
    );
  }

  return (
    <>
      {/* аватар + градиентная окантовка */}
      <button
        onClick={() => setOpen(true)}
        className="group relative inline-grid place-items-center rounded-full p-[3px] bg-gradient-to-br from-emerald-500 via-lime-400 to-cyan-400"
        aria-label="Сменить аватар"
      >
        {avatarCore}
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
          <div className="w-full max-w-md rounded-2xl t-surface-elevated p-6 ring-1 ring-app">
            <h2 className="text-xl font-semibold mb-4">Смена аватара</h2>

            <div className="flex items-center gap-5">
              <div className="rounded-full p-[3px] bg-gradient-to-br from-indigo-500/80 via-blue-500/80 to-fuchsia-500/80">
                <div className="relative h-28 w-28 overflow-hidden rounded-full bg-[#0f1422]">
                  {(draft ?? gravatarUrl) ? (
                    <Image
                      src={draft ?? gravatarUrl}
                      alt="preview"
                      fill
                      sizes="112px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-slate-400">
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
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    // Показываем preview через DataURL
                    const reader = new FileReader();
                    reader.onload = () => setDraft(reader.result as string);
                    reader.readAsDataURL(f);
                    // Загружаем в S3
                    const userId = getUserId();
                    if (userId) {
                      setUploading(true);
                      setUploadErr(null);
                      try {
                        const { url } = await uploadAvatar(userId, f);
                        setDraft(url);
                        onChange(url);
                      } catch {
                        setUploadErr('Не удалось загрузить — S3 не настроен');
                      } finally {
                        setUploading(false);
                      }
                    }
                  }}
                />
                <button
                  className="rounded-lg bg-emerald-700/40 ring-1 ring-emerald-500/30 px-4 py-2 text-slate-200 hover:brightness-110 disabled:opacity-50"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? 'Загрузка…' : 'Выбрать файл…'}
                </button>
                {uploadErr && <p className="text-xs text-amber-400">{uploadErr}</p>}
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
                className="rounded-lg px-4 py-2 text-app-2 hover:text-app"
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
