'use client';

import OutlineButton from '@/components/ui/OutlineButton';

export default function TimerControls({
                                          onStart, onPause, onFinish,
                                      }: { onStart: () => void; onPause: () => void; onFinish: () => void }) {
    return (
        <div className="flex gap-3">
            <OutlineButton onClick={onStart}>Начать</OutlineButton>
            <OutlineButton onClick={onPause}>Перерыв</OutlineButton>
            <OutlineButton onClick={onFinish}>Завершить</OutlineButton>
        </div>
    );
}
