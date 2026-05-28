'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  value?: string;        // ISO date string or empty
  onChange: (iso: string | undefined) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
};

const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const DAYS_RU   = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

function formatDisplay(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function isoToDate(iso?: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function DatePicker({ value, onChange, disabled, className, placeholder = 'Не задан' }: Props) {
  const [open, setOpen]       = useState(false);
  const [viewYear, setViewYear]   = useState(() => isoToDate(value)?.getFullYear() ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => isoToDate(value)?.getMonth()    ?? new Date().getMonth());
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = isoToDate(value);
  const today    = new Date();

  // Sync viewYear/viewMonth when value changes externally
  useEffect(() => {
    const d = isoToDate(value);
    if (d) { setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); }
  }, [value]);

  // Recalculate dropdown position on open / scroll / resize
  useEffect(() => {
    if (!open || !containerRef.current) return;

    const reposition = () => {
      const rect = containerRef.current!.getBoundingClientRect();
      const DROPDOWN_HEIGHT = 340; // approximate
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow >= DROPDOWN_HEIGHT || spaceBelow >= rect.top
        ? rect.bottom + 4
        : rect.top - DROPDOWN_HEIGHT - 4;
      setDropdownStyle({
        position: 'fixed',
        top,
        right: window.innerWidth - rect.right,
        width: 280,
        zIndex: 9999,
      });
    };

    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function selectDay(d: Date) {
    onChange(d.toISOString());
    setOpen(false);
  }

  // Build calendar grid (Mon-first)
  const firstDay = new Date(viewYear, viewMonth, 1);
  const startDow = (firstDay.getDay() + 6) % 7; // 0=Mon
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev  = new Date(viewYear, viewMonth, 0).getDate();

  const cells: { date: Date; current: boolean }[] = [];
  for (let i = startDow - 1; i >= 0; i--)
    cells.push({ date: new Date(viewYear, viewMonth - 1, daysInPrev - i), current: false });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ date: new Date(viewYear, viewMonth, d), current: true });
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++)
    cells.push({ date: new Date(viewYear, viewMonth + 1, d), current: false });

  const display = formatDisplay(value);

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 text-xs transition-colors disabled:opacity-50 ${className ?? ''} ${!display ? 'text-slate-500 italic' : ''}`}
      >
        {display || placeholder}
        <svg className="w-3 h-3 opacity-50 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
        </svg>
      </button>

      {/* Dropdown — rendered via portal to escape overflow-hidden ancestors */}
      {open && typeof document !== 'undefined' && createPortal(
        <div
          className="rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
          style={{ ...dropdownStyle, background: 'rgba(10,18,12,0.97)', backdropFilter: 'blur(16px)' }}
        >
          {/* Header: month navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span className="text-sm font-semibold text-white">
              {MONTHS_RU[viewMonth]} {viewYear}
            </span>
            <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 px-3 pt-2">
            {DAYS_RU.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-slate-500 py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 px-3 pb-2">
            {cells.map((cell, i) => {
              const isSel     = selected ? sameDay(cell.date, selected) : false;
              const isToday   = sameDay(cell.date, today);
              const isCurrent = cell.current;
              return (
                <button key={i} type="button" onClick={() => selectDay(cell.date)}
                  className={[
                    'text-xs h-8 w-8 mx-auto flex items-center justify-center rounded-lg transition-all font-medium',
                    isSel     ? 'bg-emerald-500 text-black font-bold scale-105 shadow-lg shadow-emerald-500/30' :
                    isToday   ? 'ring-1 ring-emerald-500/60 text-emerald-300 hover:bg-emerald-500/20' :
                    isCurrent ? 'text-slate-200 hover:bg-white/10' :
                                'text-slate-600 hover:bg-white/5',
                  ].join(' ')}>
                  {cell.date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/8">
            <button type="button" onClick={() => { onChange(undefined); setOpen(false); }}
              className="text-xs text-slate-500 hover:text-red-400 transition-colors">
              Очистить
            </button>
            <button type="button" onClick={() => selectDay(today)}
              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium">
              Сегодня
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
