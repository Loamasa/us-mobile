import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { UserSubscription, SubscriptionTier, CommunitySupporter } from '../types';
import { SUBSCRIPTION_PLANS, MOCK_SERVER_SUPPORTERS } from '../features/monetization/data/mockData';
import { useData } from './DataContext';

interface MonetizationContextType {
  subscription: UserSubscription;
  serverSupporters: Record<string, string[]>; // serverId -> array of userIds
  allocatedCommunityIds: string[]; // List of community IDs receiving monthly support slots
  upgradeSubscription: (tier: SubscriptionTier) => void;
  cancelSubscription: () => void;
  supportServer: (serverId: string) => void;
  unsupportServer: (serverId: string) => void;
  isSupportingServer: (serverId: string) => boolean;
  allocateToCommunity: (communityId: string) => void;
  deallocateFromCommunity: (communityId: string) => void;
  getPlanDetails: (tier: SubscriptionTier) => typeof SUBSCRIPTION_PLANS.FREE;
}

const MonetizationContext = createContext<MonetizationContextType | undefined>(undefined);

export const useMonetization = () => {
  const context = useContext(MonetizationContext);
  if (!context) throw new Error('useMonetization must be used within a MonetizationProvider');
  return context;
};

export const MonetizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useData();

  const loadState = <T,>(key: string, fallback: T): T => {
    try {
      const saved = localStorage.getItem(`us_billing_${key}`);
      return saved ? JSON.parse(saved) : fallback;
    } catch (e) { return fallback; }
  };

  const [subscription, setSubscription] = useState<UserSubscription>(() => 
    loadState('user_sub', { tier: 'FREE', since: new Date().toISOString(), status: 'ACTIVE' })
  );

  const [serverSupporters, setServerSupporters] = useState<Record<string, string[]>>(() => 
    loadState('server_subs', MOCK_SERVER_SUPPORTERS)
  );

  const [allocatedCommunityIds, setAllocatedCommunityIds] = useState<string[]>(() => 
    loadState('allocations', [])
  );

  useEffect(() => {
    localStorage.setItem('us_billing_user_sub', JSON.stringify(subscription));
    localStorage.setItem('us_billing_server_subs', JSON.stringify(serverSupporters));
    localStorage.setItem('us_billing_allocations', JSON.stringify(allocatedCommunityIds));
  }, [subscription, serverSupporters, allocatedCommunityIds]);

  const upgradeSubscription = useCallback((tier: SubscriptionTier) => {
    setSubscription({
      tier,
      since: new Date().toISOString(),
      status: 'ACTIVE',
      nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
  }, []);

  const cancelSubscription = useCallback(() => {
    setSubscription(prev => ({ ...prev, status: 'CANCELED' }));
  }, []);

  const supportServer = useCallback((serverId: string) => {
    setServerSupporters(prev => ({
      ...prev,
      [serverId]: Array.from(new Set([...(prev[serverId] || []), currentUser.id]))
    }));
  }, [currentUser.id]);

  const unsupportServer = useCallback((serverId: string) => {
    setServerSupporters(prev => ({
      ...prev,
      [serverId]: (prev[serverId] || []).filter(id => id !== currentUser.id)
    }));
  }, [currentUser.id]);

  const isSupportingServer = useCallback((serverId: string) => {
    return (serverSupporters[serverId] || []).includes(currentUser.id);
  }, [serverSupporters, currentUser.id]);

  const allocateToCommunity = useCallback((communityId: string) => {
    setAllocatedCommunityIds(prev => {
        if (prev.includes(communityId)) return prev;
        return [...prev, communityId];
    });
  }, []);

  const deallocateFromCommunity = useCallback((communityId: string) => {
    setAllocatedCommunityIds(prev => prev.filter(id => id !== communityId));
  }, []);

  const getPlanDetails = useCallback((tier: SubscriptionTier) => {
    return SUBSCRIPTION_PLANS[tier];
  }, []);

  return (
    <MonetizationContext.Provider value={{
      subscription,
      serverSupporters,
      allocatedCommunityIds,
      upgradeSubscription,
      cancelSubscription,
      supportServer,
      unsupportServer,
      isSupportingServer,
      allocateToCommunity,
      deallocateFromCommunity,
      getPlanDetails
    }}>
      {children}
    </MonetizationContext.Provider>
  );
};