import { useMonetization } from '../../../context/MonetizationContext';
import { SubscriptionTier } from '../../../types';

export const useSubscription = () => {
  const { subscription, upgradeSubscription, cancelSubscription, getPlanDetails } = useMonetization();

  const currentPlan = getPlanDetails(subscription.tier);

  // Helper to check hierarchy (e.g. PREMIUM > BASIC > FREE)
  const checkTier = (requiredTier: SubscriptionTier): boolean => {
    const levels: Record<SubscriptionTier, number> = { 'FREE': 0, 'BASIC': 1, 'PREMIUM': 2 };
    return levels[subscription.tier] >= levels[requiredTier];
  };

  return {
    // State
    tier: subscription.tier,
    status: subscription.status,
    plan: currentPlan,
    limits: currentPlan.limits,
    since: subscription.since,
    nextBilling: subscription.nextBilling,

    // Actions
    upgrade: upgradeSubscription,
    cancel: cancelSubscription,

    // Helpers
    checkTier,
    isPremium: subscription.tier === 'PREMIUM',
    isBasicOrHigher: checkTier('BASIC'),
    
    // Feature Checks
    canUpload: (sizeInBytes: number) => sizeInBytes <= currentPlan.limits.maxUploadSizeBytes,
    maxServers: currentPlan.limits.maxServers,
    hasCustomBadges: currentPlan.limits.customBadges,
    hasAnimatedAvatars: currentPlan.limits.animatedAvatars
  };
};