import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * What this device has read, per chat. Kept on the phone: the server has no
 * need to know when you read what.
 */
type ReadMarks = Record<string, number>; // chatId → lastMessageAt seen (millis)

let owner: string | null = null;
let marks: ReadMarks = {};
const listeners = new Set<(marks: ReadMarks) => void>();

const storageKey = (userId: string) => `us.readMarks.${userId}`;

function publish(next: ReadMarks) {
  marks = next;
  listeners.forEach((listener) => listener(marks));
}

async function load(userId: string) {
  if (owner === userId) return;
  owner = userId;
  publish({});
  const stored = await AsyncStorage.getItem(storageKey(userId)).catch(() => null);
  // Signed in as someone else while reading: this result is for nobody.
  if (!stored || owner !== userId) return;
  try {
    publish({ ...JSON.parse(stored), ...marks });
  } catch {
    // Unreadable marks only mean some chats look unread.
  }
}

export function markChatRead(userId: string, chatId: string, millis: number): void {
  load(userId);
  if ((marks[chatId] ?? 0) >= millis) return;
  publish({ ...marks, [chatId]: millis });
  AsyncStorage.setItem(storageKey(userId), JSON.stringify(marks)).catch(() => {});
}

export function useReadMarks(userId: string | undefined): ReadMarks {
  const [current, setCurrent] = useState(marks);
  useEffect(() => {
    if (!userId) return;
    listeners.add(setCurrent);
    load(userId).then(() => setCurrent(marks));
    return () => {
      listeners.delete(setCurrent);
    };
  }, [userId]);
  return current;
}
