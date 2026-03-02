
import { useMonetization } from '../../../context/MonetizationContext';

export const useServerSupport = (serverId: string) => {
  const { 
    serverSupporters, 
    supportServer, 
    unsupportServer, 
    isSupportingServer 
  } = useMonetization();

  const isSupporting = isSupportingServer(serverId);
  const supporters = serverSupporters[serverId] || [];
  const supporterCount = supporters.length;

  const toggleSupport = () => {
    if (isSupporting) {
      unsupportServer(serverId);
    } else {
      supportServer(serverId);
    }
  };

  return {
    // State
    isSupporting,
    supporterCount,
    supporters,

    // Actions
    support: () => supportServer(serverId),
    unsupport: () => unsupportServer(serverId),
    toggleSupport
  };
};
