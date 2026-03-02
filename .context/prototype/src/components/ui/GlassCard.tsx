import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  noPadding?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', onClick, noPadding = false }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-xl border border-glassBorder 
        bg-glass backdrop-blur-md shadow-lg
        transition-all duration-200
        ${onClick ? 'cursor-pointer hover:bg-white/5 active:scale-[0.98]' : ''}
        ${noPadding ? '' : 'p-4'}
        ${className}
      `}
    >
      {children}
    </div>
  );
};