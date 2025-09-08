'use client';

type WizardNavProps = {
  onPrev?: () => void;
  onNext?: () => void;
  onFinish?: () => void;
  nextDisabled?: boolean;
};

export default function WizardNav({
                                    onPrev,
                                    onNext,
                                    onFinish,
                                    nextDisabled,
                                  }: WizardNavProps) {
  return (
    <div className="flex justify-between mt-6">
      {onPrev ? (
        <button
          onClick={onPrev}
          className="rounded-xl bg-[#2b3681] px-6 py-3 font-semibold text-slate-200 hover:brightness-110 active:translate-y-px"
        >
          Назад
        </button>
      ) : (
        <span />
      )}

      {onFinish ? (
        <button
          onClick={onFinish}
          className="rounded-xl bg-[#3452ff] px-8 py-3 font-semibold text-white hover:brightness-110 active:translate-y-px"
        >
          Завершить
        </button>
      ) : (
        <button
          onClick={onNext}
          disabled={!!nextDisabled}
          className={[
            'rounded-xl px-8 py-3 font-semibold',
            nextDisabled
              ? 'bg-[#3452ff]/50 text-white/60 cursor-not-allowed'
              : 'bg-[#3452ff] text-white hover:brightness-110 active:translate-y-px',
          ].join(' ')}
        >
          Далее
        </button>
      )}
    </div>
  );
}
