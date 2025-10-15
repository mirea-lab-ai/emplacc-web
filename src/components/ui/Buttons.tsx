'use client';
import React from 'react';

export function ButtonPrimary({
  children, 
  onClick, 
  disabled,
  className = '',
}: { 
  children: React.ReactNode; 
  onClick: () => void; 
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 px-5 py-2 font-semibold text-black hover:brightness-110 disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

export function ButtonGhost({
  children, 
  onClick,
  className = '',
}: { 
  children: React.ReactNode; 
  onClick: () => void;
  className?: string;
}) {
  return (
    <button 
      onClick={onClick} 
      className={`rounded-lg px-4 py-2 text-slate-300 hover:text-white ${className}`}
    >
      {children}
    </button>
  );
}
