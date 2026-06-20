'use client';

import Modal from '@/components/ui/Modal';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function SuccessModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <Modal open onClose={onClose}>
      <div className="w-full max-w-md rounded-xl border border-app bg-app-subtle p-8 shadow-lg backdrop-blur-sm">
        <div className="text-center">
          {/* Иконка успеха */}
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-lime-400 flex items-center justify-center mb-6">
            <svg 
              className="w-8 h-8 text-black" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={3} 
                d="M5 13l4 4L19 7" 
              />
            </svg>
          </div>

          {/* Заголовок */}
          <h2 className="text-2xl font-bold text-app mb-3">
            Отчёт отправлен!
          </h2>

          {/* Описание */}
          <p className="text-app-2 mb-8 leading-relaxed">
            Ваш отчёт успешно создан и отправлен. 
            Спасибо за подробную информацию о проделанной работе.
          </p>

          {/* Кнопка закрытия */}
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 px-6 py-3 font-semibold text-black hover:brightness-110 active:translate-y-px transition-all"
          >
            Отлично
          </button>
        </div>
      </div>
    </Modal>
  );
}
