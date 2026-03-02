import React from 'react';
import { Heart } from 'lucide-react';
import { useServerSupport } from '../hooks/useServerSupport';
import { isFeatureEnabled } from '../../../utils/featureFlags';
import { BoostStatusBadge } from './BoostStatusBadge';

interface ServerSupportHeaderProps {
  communityId: string;
  onOpenSupport?: () => void;
}

export const ServerSupportHeader: React.FC<ServerSupportHeaderProps> = ({ communityId, onOpenSupport }) => {
  if (!isFeatureEnabled('SERVER_SUPPORT')) return null;

  const { isSupporting, supporterCount } = useServerSupport(communityId);

  return (
    <div className="flex items-center gap-2">
        <BoostStatusBadge communityId={communityId} />
        
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            if (onOpenSupport) onOpenSupport(); 
          }}
          className={`
            flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold transition-all border
            ${isSupporting 
              ? 'bg-pink-500/10 border-pink-500/30 text-pink-400 hover:bg-pink-500/20' 
              : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20'}
          `}
        >
          <Heart size={10} className={isSupporting ? 'fill-current' : ''} />
          <span className="hidden sm:inline">{isSupporting ? 'Supporter' : 'Support'}</span>
          <span className={`px-1 rounded-md ${isSupporting ? 'bg-pink-500/20' : 'bg-white/10'}`}>
            {supporterCount}
          </span>
        </button>
    </div>
  );
};
