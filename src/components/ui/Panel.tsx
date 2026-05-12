'use client';

import * as React from 'react';

type Variant = 'default' | 'elevated' | 'accent';

type PanelProps = React.HTMLAttributes<HTMLDivElement> & {
  className?: string;
  children?: React.ReactNode;
  variant?: Variant;
};

const VARIANT_CLASS: Record<Variant, string> = {
  default:  't-surface',
  elevated: 't-surface-elevated',
  accent:   't-surface-accent',
};

const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ className = '', children, variant = 'default', ...rest }, ref) => {
    return (
      <div
        ref={ref}
        {...rest}
        className={`rounded-2xl ${VARIANT_CLASS[variant]} ${className}`}
      >
        {children}
      </div>
    );
  }
);

Panel.displayName = 'Panel';
export default Panel;
