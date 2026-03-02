import { useMonetization } from '../../../context/MonetizationContext';
import { useSubscription } from './useSubscription';

export const useCommunityAllocation = () => {
    const { allocatedCommunityIds, allocateToCommunity, deallocateFromCommunity } = useMonetization();
    const { tier } = useSubscription();

    // Determine total slots available based on tier
    const getSlotLimit = () => {
        if (tier === 'PREMIUM') return 4;
        if (tier === 'BASIC') return 2;
        return 0;
    };

    const totalSlots = getSlotLimit();
    const usedSlots = allocatedCommunityIds.length;
    const remainingSlots = Math.max(0, totalSlots - usedSlots);

    // Determines if a new slot can be assigned
    // Note: If user downgraded and usedSlots > totalSlots, this returns false (preventing new adds)
    const canAllocate = remainingSlots > 0;

    const assignSlot = (communityId: string) => {
        // Prevent assigning if over limit or already assigned
        if (!canAllocate) return false;
        if (allocatedCommunityIds.includes(communityId)) return false;
        
        allocateToCommunity(communityId);
        return true;
    };

    const removeSlot = (communityId: string) => {
        deallocateFromCommunity(communityId);
    };

    return {
        totalSlots,
        usedSlots,
        remainingSlots,
        allocatedCommunityIds,
        assignSlot,
        removeSlot,
        canAllocate,
        slotValue: 2.00 // $2.00 per slot contribution value
    };
};