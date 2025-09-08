'use client';

import { useEffect, useMemo, useState } from 'react';
import ReportTaskPicker, { Task } from '@/components/ReportTaskPicker';
import SlideTrack from '@/components/ReportWizard/SlideTrack';
import WizardNav from '@/components/ReportWizard/WizardNav';
import NotesForm from '@/components/ReportWizard/NotesForm';
import FinalQuestions from '@/components/ReportWizard/FinalQuestions';

type Notes = Record<string, string>; // key `${taskId}:${subId}` -> text

const demoTasks: Task[] = [
  {
    id: 't1',
    title: 'Дрон Гараж',
    subtitle: '',
    subtasks: [
      { id: 's11', title: 'Buttons & Inputs' },
      { id: 's12', title: 'Modals & Alerts' },
      { id: 's13', title: 'Cards & Lists' },
    ],
  },
  {
    id: 't2',
    title: 'Emplacc',
    subtitle: '',
    subtasks: [
      { id: 's21', title: 'Фронт' },
      { id: 's22', title: 'Бэк' },
    ],
  },
  {
    id: 't3',
    title: 'Team Meeting',
    subtitle: '',
    subtasks: [
      { id: 's31', title: 'Agenda Prep' },
      { id: 's32', title: 'Notes & Action Items' },
    ],
  },
];

export default function ReportsPage() {
  // выборы
  const [selectedDone, setSelectedDone] = useState<Set<string>>(new Set());
  const [selectedPlan, setSelectedPlan] = useState<Set<string>>(new Set());

  // заметки
  const [doneNotes, setDoneNotes] = useState<Notes>({});
  const [planNotes, setPlanNotes] = useState<Notes>({});

  // финальные поля
  const [problem, setProblem] = useState('');
  const [needHelp, setNeedHelp] = useState<'yes' | 'no' | null>(null);
  const [comment, setComment] = useState('');

  // текущий индекс слайда
  const [step, setStep] = useState(0);

  // сортировка выбранных ключей в порядке задач
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

  // всего слайдов: выбор1 + формыDone + выбор2 + формыPlan + финал
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

  // Слайды
  const slides: React.ReactNode[] = [];
  let idx = 0;

  // (0) выбор "сегодня сделал(а)"
  {
    const i0 = idx;
    slides.push(
      <div key={`slide-${i0}`} className="flex flex-col justify-between">
        <div className="rounded-2xl bg-[#111829]/70 p-6 ring-1 ring-white/5">
          <ReportTaskPicker
            tasks={demoTasks}
            selected={selectedDone}
            onToggle={toggleDone}
            title="Выберите задачи, по которым вы сегодня работали"
            description="Можно выбрать несколько подзадач в разных задачах."
          />
        </div>
        <WizardNav
          onNext={() => selectedDone.size > 0 && goTo(i0 + 1)}
          nextDisabled={selectedDone.size === 0}
        />
      </div>
    );
    idx++;
  }

  // (1..n) формы "что сделал(а)"
  doneKeys.forEach((k) => {
    const i1 = idx; // фикс индекса
    slides.push(
      <div key={`slide-${i1}`} className="flex flex-col justify-between">
        <NotesForm
          title="Напишите, что вы сделали по задаче:"
          taskLabel={renderTaskLabel(k)}
          value={doneNotes[k] ?? ''}
          placeholder="Опишите выполненную работу…"
          onChange={(v) => setDoneNotes((prev) => ({ ...prev, [k]: v }))}
        />
        <WizardNav  onPrev={() => goTo(i1 - 1)} onNext={() => goTo(i1 + 1)} />
      </div>
    );
    idx++;
  });

  // выбор "план на завтра"
  {
    const i2 = idx;
    slides.push(
      <div key={`slide-${i2}`} className="flex flex-col justify-between">
        <div className="rounded-2xl bg-[#111829]/70 p-6 ring-1 ring-white/5">
          <ReportTaskPicker
            tasks={demoTasks}
            selected={selectedPlan}
            onToggle={togglePlan}
            title="Выберите задачи для плана на завтра"
            description="Можно выбрать несколько подзадач."
          />
        </div>
        <WizardNav

          onPrev={() => goTo(i2 - 1)}
          onNext={() => selectedPlan.size > 0 && goTo(i2 + 1)}
          nextDisabled={selectedPlan.size === 0}
        />
      </div>
    );
    idx++;
  }

  // формы по планам
  planKeys.forEach((k) => {
    const i3 = idx;
    slides.push(
      <div key={`slide-${i3}`} className="flex flex-col justify-between">
        <NotesForm
          title="План на завтра по задаче:"
          taskLabel={renderTaskLabel(k)}
          value={planNotes[k] ?? ''}
          placeholder="Что планируете сделать завтра…"
          onChange={(v) => setPlanNotes((prev) => ({ ...prev, [k]: v }))}
        />
        <WizardNav  onPrev={() => goTo(i3 - 1)} onNext={() => goTo(i3 + 1)} />
      </div>
    );
    idx++;
  });

  // финал
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

    slides.push(
      <div key={`slide-${i4}`} className="flex flex-col justify-between">
        <FinalQuestions
          problem={problem}
          setProblem={setProblem}
          needHelp={needHelp}
          setNeedHelp={setNeedHelp}
          comment={comment}
          setComment={setComment}
        />
        <WizardNav onPrev={() => goTo(i4 - 1)} onFinish={handleSubmit} />
      </div>
    );
  }

  return (
    <main className="bg-[#0f1422] text-white">
      <div className="  mx-auto max-w-6xl p-6">
        <SlideTrack step={step}>{slides}</SlideTrack>
      </div>
    </main>
  );
}
