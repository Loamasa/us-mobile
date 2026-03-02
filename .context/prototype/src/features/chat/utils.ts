
import { User, UserStatus } from '../../types';
import { MOCK_FRIENDS, MOCK_STRANGERS } from '../../data/users';
import { USER_POOL } from '../../data/userPool';

export const getChatMembers = (memberIds: string[] | undefined): User[] => {
    if (!memberIds) return [];
    
    // Look up in global pool first (Single Source of Truth)
    return memberIds.map(id => {
        // 1. Try finding in Global User Pool
        const found = USER_POOL.find(u => u.id === id);
        if (found) return found;

        // 2. Fallback to existing mock lists (Legacy/Safety)
        const friend = MOCK_FRIENDS.find(f => f.id === id);
        if (friend) return friend;

        const stranger = MOCK_STRANGERS.find(s => s.id === id);
        if (stranger) return stranger;

        // 3. Admin/System check
        if (id === 'admin') {
            return {
                id: 'admin',
                displayName: 'System',
                handle: '@system',
                avatarUrl: 'https://ui-avatars.com/api/?name=System&background=0F1115&color=fff',
                bio: 'System Administrator',
                status: UserStatus.ONLINE
            } as User;
        }

        // 4. Generate consistent fallback for truly unknown IDs
        // This handles cases where IDs exist in chat metadata but not in the pool yet
        return {
            id,
            displayName: `Member ${id.slice(-3)}`,
            handle: `@user${id.slice(-3)}`,
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
            bio: 'Community Member',
            status: UserStatus.OFFLINE
        } as User;
    });
};

export const getSenderDetails = (id: string, members: User[]) => {
    // 1. Try finding in the pre-resolved members list (Fastest)
    const existingMember = members.find(m => m.id === id);
    if (existingMember) return existingMember;
    
    // 2. Try global pool
    const found = USER_POOL.find(u => u.id === id);
    if (found) return found;

    if (id === 'admin') return { displayName: 'System', avatarUrl: '', isSystem: true };
    
    // 3. Fallback Generation
    return {
        id,
        displayName: `Member ${id.slice(-3)}`,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
        isSystem: false
    };
};
