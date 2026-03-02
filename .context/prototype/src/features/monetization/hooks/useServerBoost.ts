import { useMonetization } from '../../../context/MonetizationContext';

export const useServerBoost = (serverId: string) => {
  const { serverSupporters } = useMonetization();

  const supporters = serverSupporters[serverId] || [];
  const supporterCount = supporters.length;
  const BOOST_THRESHOLD = 3;
  
  const isBoosted = supporterCount >= BOOST_THRESHOLD;

  return {
    isBoosted,
    supporterCount,
    boostThreshold: BOOST_THRESHOLD
  };
};