'use client';

type WizardNavProps = {
  onPrev?: () => void;
  onNext?: () => void;
  onFinish?: () => void;
  nextDisabled?: boolean;
  isLoading?: boolean;
};

export default function WizardNav({
                                    onPrev,
                                    onNext,
                                    onFinish,
                                    nextDisabled,
                                    isLoading = false,
                                  }: WizardNavProps) {
  return (
    <div className="flex justify-between mt-6">
      {onPrev ? (
        <button
          onClick={onPrev}
          className="rounded-xl bg-gradient-to-br from-emerald-400 to-lime-400 px-6 py-3 font-semibold text-black hover:brightness-110 active:translate-y-px"
        >
          Назад
        </button>
      ) : (
        <span />
      )}

      {onFinish ? (
        <button
          onClick={onFinish}
          disabled={isLoading}
          className={[
            'rounded-xl px-8 py-3 font-semibold',
            isLoading
              ? 'bg-gradient-to-br from-emerald-700 to-lime-600 text-black/60 cursor-not-allowed'
              : 'bg-gradient-to-br from-emerald-500 to-lime-400 text-black hover:brightness-110 active:translate-y-px',
          ].join(' ')}
        >
          {isLoading ? 'Создание отчета...' : 'Завершить'}
        </button>
      ) : (
        <button
          onClick={onNext}
          disabled={!!nextDisabled}
          className={[
            'rounded-xl px-8 py-3 font-semibold',
            nextDisabled
              ? 'bg-gradient-to-br from-emerald-700 to-lime-600 text-black/60 cursor-not-allowed'
              : 'bg-gradient-to-br from-emerald-500 to-lime-400 text-black hover:brightness-110 active:translate-y-px',
          ].join(' ')}
        >
          Далее
        </button>
      )}
    </div>
  );
}
