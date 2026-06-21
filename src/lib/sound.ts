'use client';

// Короткие UI-звуки через Web Audio API — без ассетов и зависимостей. Уважают
// mute-настройку (localStorage). AudioContext может быть suspended до первого
// взаимодействия пользователя — тогда best-effort resume().

const MUTE_KEY = 'emplacc-sound-muted';

export function soundMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(MUTE_KEY) === '1';
}

export function setSoundMuted(muted: boolean) {
  if (typeof window === 'undefined') return;
  if (muted) localStorage.setItem(MUTE_KEY, '1');
  else localStorage.removeItem(MUTE_KEY);
}

let ctx: AudioContext | null = null;
function audioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!ctx) ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, durMs: number, delaySec = 0, gain = 0.045, type: OscillatorType = 'sine') {
  const ac = audioCtx();
  if (!ac || soundMuted()) return;
  if (ac.state === 'suspended') ac.resume().catch(() => {});
  const t0 = ac.currentTime + delaySec;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + durMs / 1000 + 0.02);
}

// Отправка своего сообщения — короткий мягкий «клик».
export function playSend() { tone(620, 80); }

// Входящее сообщение в форуме — двухнотный «динь».
export function playReceive() { tone(440, 85); tone(580, 95, 0.07); }

// Новое уведомление — выше и заметнее.
export function playNotify() { tone(784, 110); tone(1046, 130, 0.1); }
