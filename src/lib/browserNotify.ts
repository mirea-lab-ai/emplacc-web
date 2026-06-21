'use client';

// Браузерные foreground-уведомления. Урок из myacc: НЕЛЬЗЯ доверять сохранённому
// флагу — всегда сверяемся с реальным Notification.permission (его могут отозвать
// в настройках браузера). localStorage хранит лишь ЖЕЛАНИЕ пользователя; фактическая
// доступность = желание И permission==='granted'.

const PREF_KEY = 'emplacc-browser-notify';

export type NotifyState = 'unsupported' | 'default' | 'granted' | 'denied';

export function isSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/** Текущее РЕАЛЬНОЕ состояние разрешения (live, не из стораджа). */
export function permissionState(): NotifyState {
  if (!isSupported()) return 'unsupported';
  return Notification.permission as NotifyState;
}

// По умолчанию ВКЛЮЧЕНО, когда браузер разрешил: выдача разрешения сама по себе —
// явное согласие пользователя, поэтому отдельный «хочу»-клик не требуется. В
// localStorage храним ТОЛЬКО явное выключение ('0').
export function wantsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(PREF_KEY) !== '0';
}

/** Фактически включено = пользователь не выключал явно И браузер разрешил сейчас. */
export function effectivelyEnabled(): boolean {
  return wantsEnabled() && permissionState() === 'granted';
}

function setWants(on: boolean) {
  if (typeof window === 'undefined') return;
  if (on) localStorage.removeItem(PREF_KEY);   // вернуться к дефолту «включено»
  else localStorage.setItem(PREF_KEY, '0');    // явное выключение
}

/** Включить: запросить разрешение если нужно. Возвращает фактическое состояние. */
export async function enable(): Promise<NotifyState> {
  if (!isSupported()) return 'unsupported';
  let perm = Notification.permission as NotifyState;
  if (perm === 'default') {
    perm = (await Notification.requestPermission()) as NotifyState;
  }
  setWants(perm === 'granted');
  return perm;
}

export function disable() {
  setWants(false);
}

/** Показать уведомление, только если фактически разрешено. */
export function show(title: string, body?: string) {
  if (!effectivelyEnabled()) return;
  try {
    new Notification(title, { body: body || undefined, icon: '/favicon.ico', tag: 'emplacc' });
  } catch {
    // некоторые браузеры требуют ServiceWorker — тихо игнорируем
  }
}
