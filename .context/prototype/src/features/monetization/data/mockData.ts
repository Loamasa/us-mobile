
import { SubscriptionPlan, SubscriptionTier } from '../../../types';

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  FREE: {
    id: 'FREE',
    name: 'Standard',
    price: 0,
    currency: 'USD',
    features: [
      '5MB file uploads',
      'Basic map presence'
    ],
    limits: {
      maxUploadSizeBytes: 5 * 1024 * 1024,
      maxServers: Infinity,
      customBadges: false,
      animatedAvatars: false
    }
  },
  BASIC: {
    id: 'BASIC',
    name: 'Supporter',
    price: 4.99,
    currency: 'USD',
    features: [
      '50MB file uploads',
      'Personal profile badge',
      'Priority local support'
    ],
    limits: {
      maxUploadSizeBytes: 50 * 1024 * 1024,
      maxServers: Infinity,
      customBadges: true,
      animatedAvatars: false
    }
  },
  PREMIUM: {
    id: 'PREMIUM',
    name: 'Visionary',
    price: 9.99,
    currency: 'USD',
    features: [
      '500MB file uploads',
      'Exclusive profile flair',
      'Animated avatars',
      'Early access to new experiments'
    ],
    limits: {
      maxUploadSizeBytes: 500 * 1024 * 1024,
      maxServers: Infinity,
      customBadges: true,
      animatedAvatars: true
    }
  }
};

export const MOCK_SERVER_SUPPORTERS: Record<string, string[]> = {
  'com_ravers': ['u1', 'f1', 'f4'],
  'com_community_house': ['f2', 'f7'],
  'com1': ['u1', 'f3']
};
