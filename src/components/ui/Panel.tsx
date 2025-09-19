'use client';

import * as React from 'react';

type PanelProps = React.HTMLAttributes<HTMLDivElement> & {
  className?: string;
  children?: React.ReactNode;
};

/**
 * Универсальная карточка. Принимает любые HTML-атрибуты <div>,
 * в т.ч. onDragOver, onDrop, onClick и т.д.
 */
const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ className = '', children, ...rest }, ref) => {
    const base =
      'rounded-2xl ring-1 ring-white/10 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] backdrop-blur';
    return (
      <div ref={ref} {...rest} className={`${base} ${className}`}>
        {children}
      </div>
    );
  }
);

Panel.displayName = 'Panel';

export default Panel;
