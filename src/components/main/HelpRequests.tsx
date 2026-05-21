'use client';

import Panel from '@/components/ui/Panel';
import { useToast } from '@/components/ui/Toast';
import { useEffect, useMemo, useState } from 'react';
import { fetchMyHelpRequests, UIHelpRequest, completeHelpRequest } from '@/features/reports/api';
import { isAuthed, getUserId } from '@/lib/auth';
import CompleteHelpRequestModal from './CompleteHelpRequestModal';

export type HelpReq = {
  id: string;
  from: string;
  text?: string;
};

export default function HelpRequests() {
  const [i, setI] = useState(0);
  const [fetched, setFetched] = useState<UIHelpRequest[]>([]);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const toast = useToast();
  
  useEffect(() => {
    if (!isAuthed() || !getUserId()) return;
    fetchMyHelpRequests().then(setFetched).catch(() => setFetched([]));
  }, []);
  const list: HelpReq[] = useMemo(() => {
    return fetched.map((r) => ({ id: r.id, from: r.authorName ?? 'Пользователь', text: r.description }));
  }, [fetched]);
  const has = list.length > 0;

  const handleCompleteClick = () => {
    setShowCompleteModal(true);
  };

  const handleCompleteConfirm = async () => {
    if (!has || isCompleting) return;
    
    setIsCompleting(true);
    try {
      await completeHelpRequest(list[i].id);
      // Обновляем список после успешного завершения
      const updatedFetched = fetched.filter(item => item.id !== list[i].id);
      setFetched(updatedFetched);
      
      // Если текущий индекс больше не валиден, сбрасываем на 0
      if (i >= updatedFetched.length) {
        setI(0);
      }
      
      setShowCompleteModal(false);
    } catch (error) {
      console.error('Ошибка при завершении просьбы о помощи:', error);
      toast.error('Ошибка при завершении просьбы о помощи. Попробуйте еще раз.');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleCompleteCancel = () => {
    setShowCompleteModal(false);
  };

  return (
    <Panel className="p-5 h-full flex flex-col t-surface">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Просьбы о помощи</h2>
          {has && (
            <div className="text-sm text-slate-400 mt-1">
              {i + 1} из {list.length}
            </div>
          )}
        </div>
        {has && (
          <div className="flex items-center gap-2">
            <button
              className="rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 px-3 py-1.5 font-bold text-black hover:brightness-110"
              onClick={() => setI((i - 1 + list.length) % list.length)}
              aria-label="Назад"
            >
              ←
            </button>
            <button
              className="rounded-xl bg-gradient-to-br font-bold from-emerald-500 to-lime-400 px-3 py-1.5 text-black hover:brightness-110"
              onClick={() => setI((i + 1) % list.length)}
              aria-label="Вперёд"
            >
              →
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0">
        {!has ? (
          <div className="grid h-full place-items-center rounded-xl backdrop-blur-sm bg-white/10 border border-white/20 hover:bg-white/20 ring-1 ring-white/10 text-slate-400">
            Нет активных просьб о помощи
          </div>
        ) : (
          <div className="h-full rounded-xl backdrop-blur-sm bg-white/10 border border-white/20 text-white hover:bg-white/20 ring-1 ring-white/10 p-3 text-sm overflow-auto custom-scroll relative">
            <div className="text-slate-300">Просит:</div>
            <div className="font-semibold">{list[i].from}</div>
            {list[i].text && (
              <>
                <div className="mt-2 text-slate-300">Описание:</div>
                <div className="font-medium">{list[i].text}</div>
              </>
            )}
            
            {/* Кнопка "Выполнить" в правом нижнем углу */}
            <div className="absolute bottom-3 right-3">
              <button
                onClick={handleCompleteClick}
                disabled={isCompleting}
                className="rounded-lg bg-gradient-to-br from-emerald-500 to-lime-400 px-3 py-1.5 text-black font-semibold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              >
                {isCompleting ? '...' : 'Выполнить'}
              </button>
            </div>
          </div>
        )}
      </div>
      
      <CompleteHelpRequestModal
        open={showCompleteModal}
        onClose={handleCompleteCancel}
        onConfirm={handleCompleteConfirm}
        isCompleting={isCompleting}
      />
    </Panel>
  );
}
