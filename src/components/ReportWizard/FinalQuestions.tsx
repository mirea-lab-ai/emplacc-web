'use client';

type Need = 'yes' | 'no' | null;

type FinalQuestionsProps = {
  problem: string;
  setProblem: (v: string) => void;
  needHelp: Need;
  setNeedHelp: (v: Need) => void;
  comment: string;
  setComment: (v: string) => void;
};

export default function FinalQuestions({
                                         problem,
                                         setProblem,
                                         needHelp,
                                         setNeedHelp,
                                         comment,
                                         setComment,
                                       }: FinalQuestionsProps) {
  return (
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
  );
}
