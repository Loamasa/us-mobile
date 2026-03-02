import React from 'react';

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

export const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`
      flex flex-col items-center gap-1.5 transition-all duration-300
      ${active ? 'text-signal scale-110 drop-shadow-[0_0_10px_rgba(46,92,255,0.5)]' : 'text-gray-500 hover:text-gray-300'}
    `}
  >
    {icon}
    <span className="text-[10px] font-medium tracking-wide">{label}</span>
  </button>
);