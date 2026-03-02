
import React from 'react';
import { User } from '../types';

interface UserAvatarProps {
  user: Partial<User>;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  showStatus?: boolean;
  className?: string;
  onClick?: () => void;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ user, size = 'md', showStatus = false, className = '', onClick }) => {
  const isPremium = user.subscriptionTier === 'PREMIUM';
  const isBasic = user.subscriptionTier === 'BASIC';
  
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-24 h-24',
    xxl: 'w-32 h-32'
  };

  const containerSize = sizeClasses[size];

  return (
    <div onClick={onClick} className={`relative inline-block ${className} ${onClick ? 'cursor-pointer' : ''}`}>
        <div className={`${containerSize} relative`}>
            {/* Premium Glow/Border */}
            {isPremium && (
                <div className="absolute -inset-[2px] bg-gradient-to-tr from-yellow-400 via-purple-500 to-blue-500 rounded-full opacity-80" />
            )}
            
            {/* Avatar Container */}
            <div className={`relative w-full h-full rounded-full overflow-hidden ${isPremium ? 'border-2 border-[#0F1115]' : (isBasic ? 'ring-2 ring-blue-500/50' : 'border border-white/10')}`}>
                <img 
                    src={user.avatarUrl} 
                    alt={user.displayName} 
                    className="w-full h-full rounded-full object-cover bg-gray-800"
                />
            </div>

            {/* Status Indicator */}
            {showStatus && user.status && (
                <div className={`absolute bottom-0 right-0 w-[25%] h-[25%] rounded-full border-2 border-[#0F1115] ${
                    user.status === 'ONLINE' ? 'bg-mint' : 
                    user.status === 'AWAY' ? 'bg-yellow-500' : 'bg-gray-500'
                }`} />
            )}
        </div>
    </div>
  );
};
