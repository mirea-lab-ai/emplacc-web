'use client';

import { useEffect, useMemo, useState } from 'react';
import ReportTaskPicker, { Task } from '@/components/ReportTaskPicker';

type Notes = Record<string, string>; // key `${taskId}:${subId}` -> text

const demoTasks: Task[] = [
  {
    id: 't1',
    title: 'Design System',
    subtitle: 'Create Components',
    subtasks: [
      { id: 's11', title: 'Buttons & Inputs' },
      { id: 's12', title: 'Modals & Alerts' },
      { id: 's13', title: 'Cards & Lists' },
    ],
  },
  {
    id: 't2',
    title: 'Write Documentation',
    subtitle: 'API Reference',
    subtasks: [
      { id: 's21', title: 'Auth & Sessions' },
      { id: 's22', title: 'Rate Limits' },
      { id: 's23', title: 'Webhooks' },
    ],
  },
  {
    id: 't3',
    title: 'Team Meeting',
    subtitle: 'Discuss Q3 Goals',
    subtasks: [
      { id: 's31', title: 'Agenda Prep' },
      { id: 's32', title: 'Notes & Action Items' },
    ],
  },
];

export default function ReportsPage() {
  // выбор "сегодня сделал(а)"
  const [selectedDone, setSelectedDone] = useState<Set<string>>(new Set());
  const [doneNotes, setDoneNotes] = useState<Notes>({});

  // выбор "план на завтра"
  const [selectedPlan, setSelectedPlan] = useState<Set<string>>(new Set());
  const [planNotes, setPlanNotes] = useState<Notes>({});

  // финальные поля
  const [problem, setProblem] = useState('');
  const [needHelp, setNeedHelp] = useState<'yes' | 'no' | null>(null);
  const [comment, setComment] = useState('');

  // индекс текущего «слайда»
  const [step, setStep] = useState(0);

  // сортировка выбранных ключей по порядку задач/подзадач
  const orderedKeys = (set: Set<string>) => {
    const keys = Array.from(set);
    const order: string[] = [];
    for (const t of demoTasks) {
      for (const s of t.subtasks) {
        const k = `${t.id}:${s.id}`;
        if (keys.includes(k)) order.push(k);
      }
    }
    return order;
  };

  const doneKeys = useMemo(() => orderedKeys(selectedDone), [selectedDone]);
  const planKeys = useMemo(() => orderedKeys(selectedPlan), [selectedPlan]);

  // всего «слайдов»: выбор1 + формыDone + выбор2 + формыPlan + финал
  const stepsCount = 1 + doneKeys.length + 1 + planKeys.length + 1;

  const goTo = (i: number) => {
    const safe = Math.max(0, Math.min(i, stepsCount - 1));
    setStep(safe);
  };

  useEffect(() => {
    if (step > stepsCount - 1) setStep(stepsCount - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepsCount]);

  const toggleDone = (taskId: string, subId: string) => {
    setSelectedDone((prev) => {
      const n = new Set(prev);
      const key = `${taskId}:${subId}`;
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const togglePlan = (taskId: string, subId: string) => {
    setSelectedPlan((prev) => {
      const n = new Set(prev);
      const key = `${taskId}:${subId}`;
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const renderTaskLabel = (key: string) => {
    const [tid, sid] = key.split(':');
    const t = demoTasks.find((x) => x.id === tid);
    const s = t?.subtasks.find((y) => y.id === sid);
    return t && s ? `${t.title} — ${s.title}` : key;
  };

  // собираем содержимое «слайдов» (контент без контейнеров)
  const slidesContent: React.ReactNode[] = [];
  let idx = 0;

  // --- (0) выбор "сегодня сделал(а)"
  {
    const i0 = idx;
    slidesContent.push(
      <div key={`c-${i0}`} className="flex flex-col justify-between min-h-screen">
        <div className="rounded-2xl bg-[#111829]/70 p-6 ring-1 ring-white/5">
          <ReportTaskPicker
            tasks={demoTasks}
            selected={selectedDone}
            onToggle={toggleDone}
            title="Выберите задачи, по которым вы сегодня работали"
            description="Можно выбрать несколько подзадач в разных задачах."
          />
        </div>
        <div className="flex justify-end mt-6">
          <button
            onClick={() => selectedDone.size > 0 && goTo(i0 + 1)}
            disabled={selectedDone.size === 0}
            className={[
              'rounded-xl px-8 py-3 font-semibold',
              selectedDone.size === 0
                ? 'bg-[#3452ff]/50 text-white/60 cursor-not-allowed'
                : 'bg-[#3452ff] text-white hover:brightness-110 active:translate-y-px',
            ].join(' ')}
          >
            Далее
          </button>
        </div>
      </div>
    );
    idx++;
  }

  // --- (1..n) формы "что сделал(а)"
  doneKeys.forEach((k) => {
    const i1 = idx; // фикс индекса
    const value = doneNotes[k] ?? '';
    slidesContent.push(
      <div key={`c-${i1}`} className="flex flex-col justify-between min-h-screen">
        <div className="rounded-2xl bg-[#111829]/80 p-6 ring-1 ring-white/5">
          <h2 className="text-3xl font-semibold mb-2">Напишите, что вы сделали по задаче:</h2>
          <p className="text-slate-300 mb-4">{renderTaskLabel(k)}</p>
          <textarea
            value={value}
            onChange={(e) => setDoneNotes((prev) => ({ ...prev, [k]: e.target.value }))}
            placeholder="Опишите выполненную работу…"
            className="w-full min-h-[220px] rounded-xl bg-[#141c2f] text-slate-100 p-4 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>
        <div className="flex justify-between mt-6">
          <button
            onClick={() => goTo(i1 - 1)}
            className="rounded-xl bg-[#2b3681] px-6 py-3 font-semibold text-slate-200 hover:brightness-110 active:translate-y-px"
          >
            Назад
          </button>
          <button
            onClick={() => goTo(i1 + 1)}
            className="rounded-xl bg-[#3452ff] px-8 py-3 font-semibold text-white hover:brightness-110 active:translate-y-px"
          >
            Далее
          </button>
        </div>
      </div>
    );
    idx++;
  });

  // --- выбор "план на завтра"
  {
    const i2 = idx;
    slidesContent.push(
      <div key={`c-${i2}`} className="flex flex-col justify-between min-h-screen">
        <div className="rounded-2xl bg-[#111829]/70 p-6 ring-1 ring-white/5">
          <ReportTaskPicker
            tasks={demoTasks}
            selected={selectedPlan}
            onToggle={togglePlan}
            title="Выберите задачи для плана на завтра"
            description="Можно выбрать несколько подзадач."
          />
        </div>
        <div className="flex justify-between mt-6">
          <button
            onClick={() => goTo(i2 - 1)}
            className="rounded-xl bg-[#2b3681] px-6 py-3 font-semibold text-slate-200 hover:brightness-110 active:translate-y-px"
          >
            Назад
          </button>
          <button
            onClick={() => selectedPlan.size > 0 && goTo(i2 + 1)}
            disabled={selectedPlan.size === 0}
            className={[
              'rounded-xl px-8 py-3 font-semibold',
              selectedPlan.size === 0
                ? 'bg-[#3452ff]/50 text-white/60 cursor-not-allowed'
                : 'bg-[#3452ff] text-white hover:brightness-110 active:translate-y-px',
            ].join(' ')}
          >
            Далее
          </button>
        </div>
      </div>
    );
    idx++;
  }

  // --- формы по планам
  planKeys.forEach((k) => {
    const i3 = idx;
    const value = planNotes[k] ?? '';
    slidesContent.push(
      <div key={`c-${i3}`} className="flex flex-col justify-between min-h-screen">
        <div className="rounded-2xl bg-[#111829]/80 p-6 ring-1 ring-white/5">
          <h2 className="text-3xl font-semibold mb-2">План на завтра по задаче:</h2>
          <p className="text-slate-300 mb-4">{renderTaskLabel(k)}</p>
          <textarea
            value={value}
            onChange={(e) => setPlanNotes((prev) => ({ ...prev, [k]: e.target.value }))}
            placeholder="Что планируете сделать завтра…"
            className="w-full min-h-[220px] rounded-xl bg-[#141c2f] text-slate-100 p-4 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>
        <div className="flex justify-between mt-6">
          <button
            onClick={() => goTo(i3 - 1)}
            className="rounded-xl bg-[#2b3681] px-6 py-3 font-semibold text-slate-200 hover:brightness-110 active:translate-y-px"
          >
            Назад
          </button>
          <button
            onClick={() => goTo(i3 + 1)}
            className="rounded-xl bg-[#3452ff] px-8 py-3 font-semibold text-white hover:brightness-110 active:translate-y-px"
          >
            Далее
          </button>
        </div>
      </div>
    );
    idx++;
  });

  // --- финальный слайд
  {
    const i4 = idx;
    const handleSubmit = () => {
      const payload = {
        done: doneKeys.map((k) => ({ key: k, text: doneNotes[k] || '' })),
        plan: planKeys.map((k) => ({ key: k, text: planNotes[k] || '' })),
        problem,
        needHelp,
        comment,
      };
      console.log('REPORT SUBMIT =>', payload);
      alert('Отчёт собран в консоли. Подключи отправку на сервер.');
    };

    slidesContent.push(
      <div key={`c-${i4}`} className="flex flex-col justify-between min-h-screen">
        <div className="rounded-2xl bg-[#111829]/80 p-6 ring-1 ring-white/5">
          <h2 className="text-3xl font-semibold mb-6">Завершающие вопросы</h2>

          <div className="grid gap-6">
            <div>
              <label className="block text-slate-200 mb-2">Проблема</label>
              <textarea
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder="Опишите возникшие сложности…"
                className="w-full min-h-[140px] rounded-xl bg-[#141c2f] text-slate-100 p-4 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div>
              <span className="block text-slate-200 mb-2">Нужна ли чья-то помощь?</span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setNeedHelp('yes')}
                  className={[
                    'rounded-xl px-5 py-2 ring-1 transition',
                    needHelp === 'yes'
                      ? 'bg-emerald-500/20 text-emerald-200 ring-emerald-500/50'
                      : 'bg-black/20 text-slate-200 ring-white/10 hover:bg-black/30',
                  ].join(' ')}
                >
                  Да
                </button>
                <button
                  type="button"
                  onClick={() => setNeedHelp('no')}
                  className={[
                    'rounded-xl px-5 py-2 ring-1 transition',
                    needHelp === 'no'
                      ? 'bg-emerald-500/20 text-emerald-200 ring-emerald-500/50'
                      : 'bg-black/20 text-slate-200 ring-white/10 hover:bg-black/30',
                  ].join(' ')}
                >
                  Нет
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-200 mb-2">Комментарий</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Любые дополнительные заметки…"
                className="w-full min-h-[120px] rounded-xl bg-[#141c2f] text-slate-100 p-4 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={() => goTo(i4 - 1)}
            className="rounded-xl bg-[#2b3681] px-6 py-3 font-semibold text-slate-200 hover:brightness-110 active:translate-y-px"
          >
            Назад
          </button>
          <button
            onClick={handleSubmit}
            className="rounded-xl bg-[#3452ff] px-8 py-3 font-semibold text-white hover:brightness-110 active:translate-y-px"
          >
            Завершить
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f1422] text-white">
      <div className="mx-auto max-w-6xl p-6">
        {/* трек слайдов: без scroll-snap, листаем translateX */}
        <div className="relative overflow-hidden">
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${step * 100}%)` }}
          >
            {slidesContent.map((node, i) => (
              <div key={i} className="w-full shrink-0 px-0">
                {node}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
