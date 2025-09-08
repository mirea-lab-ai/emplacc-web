'use client';

import React from 'react';

type SlideTrackProps = {
  step: number;                 // текущий индекс слайда
  children: React.ReactNode;    // список слайдов
};

export default function SlideTrack({ step, children }: SlideTrackProps) {
  const items = React.Children.toArray(children);
  return (
    <div className="relative overflow-hidden">
      <div
        className="flex transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${step * 100}%)` }}
      >
        {items.map((child, i) => (
          <div key={i} className="w-full shrink-0">
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
