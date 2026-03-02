
import React from 'react';
import { MapPin, MessageSquare, Users, UserPlus, Zap, Compass, Globe, Calendar } from 'lucide-react';

export interface TutorialDef {
  id: string;
  title: string;
  message: string;
  icon: React.ElementType;
  actionLabel: string;
  color: 'signal' | 'mint' | 'orange' | 'purple' | 'rose';
  alignment?: 'center' | 'bottom-left' | 'top-right' | 'bottom-right' | 'map-center' | 'nav-communities' | 'nav-chats';
  arrow?: 'left' | 'top' | 'none' | 'bottom';
}

export const TUTORIALS: Record<string, TutorialDef> = {
  'welcome_map': {
    id: 'welcome_map',
    title: 'Your Live Map',
    message: "This is you on the map. Let's see what communities and friends you have around you.",
    icon: MapPin,
    actionLabel: 'Next',
    color: 'signal',
    alignment: 'map-center',
    arrow: 'bottom'
  },
  'nav_communities': {
    id: 'nav_communities',
    title: 'Communities',
    message: "Discover local communities and find the cultures you love.",
    icon: Users,
    actionLabel: 'Next',
    color: 'purple',
    alignment: 'nav-communities',
    arrow: 'bottom'
  },
  'nav_chats': {
    id: 'nav_chats',
    title: 'Chats',
    message: "All your private messages and group chats live here.",
    icon: MessageSquare,
    actionLabel: 'Next',
    color: 'mint',
    alignment: 'nav-chats',
    arrow: 'bottom'
  },
  'ghost_mode': {
    id: 'ghost_mode',
    title: 'Ghost Mode',
    message: "Want privacy? Toggle Ghost Mode to hide your live location from the map instantly.",
    icon: Zap,
    actionLabel: 'Got it',
    color: 'rose',
    alignment: 'center'
  },
  'community_discovery': {
    id: 'community_discovery',
    title: 'Find your local community',
    message: "Tap the compass icon in the sidebar to discover local communities and cultures.",
    icon: Compass,
    actionLabel: 'Show Me',
    color: 'signal',
    alignment: 'center',
    arrow: 'none'
  },
  'community_types': {
    id: 'community_types',
    title: 'Local vs. Culture',
    message: "Cultures are movements that can transcend borders. Find your cultures to connect with local communities.",
    icon: Globe,
    actionLabel: 'Got it',
    color: 'purple',
    alignment: 'center'
  },
  'events_intro': {
    id: 'events_intro',
    title: 'Your Events Hub',
    message: "Track RSVPs, find events across your local communities and cultures, and see what your friends are up to—all in one synchronized schedule.",
    icon: Calendar,
    actionLabel: 'Check it out',
    color: 'orange',
    alignment: 'center'
  },
  'add_friend': {
    id: 'add_friend',
    title: 'Build Your Circle',
    message: "Add friends and form groups. See when your people come together on the map.",
    icon: UserPlus,
    actionLabel: 'Find Friends',
    color: 'orange',
    alignment: 'center'
  }
};
