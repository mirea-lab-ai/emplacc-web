import { http } from '@/lib/http';

// v2 API: все ответы под /v2 нормализованы в { data, error, meta }.
// Этот клиент дёргает /v2-ручку через общий http() (база-URL, токен, 401→ротация)
// и разворачивает конверт: возвращает data или бросает Error с message из error.

export type V2Meta = { version?: string } & Record<string, unknown>;

export type V2Envelope<T> = {
  data: T | null;
  error: { message: string; code: number } | null;
  meta: V2Meta;
};

export class V2Error extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.name = 'V2Error';
    this.code = code;
  }
}

/** Вызов v2-ручки с разворачиванием конверта. `path` — без префикса /v2. */
export async function v2<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await http(`/v2${path.startsWith('/') ? path : `/${path}`}`, init);

  let body: V2Envelope<T> | null = null;
  try {
    body = (await res.json()) as V2Envelope<T>;
  } catch {
    if (!res.ok) throw new V2Error(`HTTP ${res.status}`, res.status);
    throw new V2Error('Некорректный ответ сервера', res.status);
  }

  if (!res.ok || body?.error) {
    const message = body?.error?.message ?? `HTTP ${res.status}`;
    throw new V2Error(message, body?.error?.code ?? res.status);
  }
  return body!.data as T;
}

/** То же, но возвращает весь конверт (нужно для meta/пагинации). */
export async function v2Envelope<T = unknown>(path: string, init: RequestInit = {}): Promise<V2Envelope<T>> {
  const res = await http(`/v2${path.startsWith('/') ? path : `/${path}`}`, init);
  const body = (await res.json()) as V2Envelope<T>;
  if (!res.ok || body?.error) {
    throw new V2Error(body?.error?.message ?? `HTTP ${res.status}`, body?.error?.code ?? res.status);
  }
  return body;
}
