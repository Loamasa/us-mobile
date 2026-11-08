import { fromHex, toHex } from './envelope';

/**
 * Which public keys this device accepts for each user. The server hands out
 * keys, so a dishonest server could hand out its own. We trust a key on first
 * sight and then pin it: any later change needs the user's explicit OK.
 */
export type Pins = Record<string, string[]>; // uid → accepted keys (hex), oldest first

export function isPinned(pins: Pins, uid: string, keyHex: string): boolean {
  return pins[uid]?.includes(keyHex) ?? false;
}

/** Pins a first-seen key. Returns true when `pins` changed. */
export function pinIfFirstSeen(pins: Pins, uid: string, keyHex: string): boolean {
  if (pins[uid]?.length) return false;
  pins[uid] = [keyHex];
  return true;
}

export function acceptKey(pins: Pins, uid: string, keyHex: string): void {
  // Moves it last: the newest accepted key is the one used when offline.
  pins[uid] = [...(pins[uid] ?? []).filter((k) => k !== keyHex), keyHex];
}

export interface ChatKeys {
  // Who a new message gets encrypted to (never includes the viewer).
  recipients: Record<string, Uint8Array>;
  // Confirmed to have no key yet: they have never opened this version.
  missing: string[];
  // Published key differs from the pinned one. Don't encrypt to it until accepted.
  changed: { uid: string; key: Uint8Array }[];
  // Not known yet: still loading, or offline with nothing pinned.
  unknown: string[];
}

/** `directory`: undefined = not loaded yet, null = the server says no key exists. */
export function resolveChatKeys(
  memberIds: string[],
  directory: Record<string, Uint8Array | null | undefined>,
  pins: Pins
): ChatKeys {
  const keys: ChatKeys = { recipients: {}, missing: [], changed: [], unknown: [] };
  for (const uid of memberIds) {
    const published = directory[uid];
    if (published === null) {
      keys.missing.push(uid);
    } else if (published) {
      if (pins[uid]?.length && !isPinned(pins, uid, toHex(published))) {
        keys.changed.push({ uid, key: published });
      } else {
        keys.recipients[uid] = published;
      }
    } else if (pins[uid]?.length) {
      keys.recipients[uid] = fromHex(pins[uid][pins[uid].length - 1]);
    } else {
      keys.unknown.push(uid);
    }
  }
  return keys;
}
