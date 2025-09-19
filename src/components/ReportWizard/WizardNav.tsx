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
          className="rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-white hover:brightness-110 active:translate-y-px"
        >
          Назад
        </button>
      ) : (
        <span />
      )}

      {onFinish ? (
        <button
          onClick={onFinish}
          className="rounded-xl bg-cyan-400 px-8 py-3 font-semibold text-white hover:brightness-110 active:translate-y-px"
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
              ? 'bg-cyan-600 text-white/60 cursor-not-allowed'
              : 'bg-cyan-400 text-white hover:brightness-110 active:translate-y-px',
          ].join(' ')}
        >
          Далее
        </button>
      )}
    </div>
  );
}
