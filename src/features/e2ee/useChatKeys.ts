import { useCallback, useEffect, useMemo, useState } from 'react';
import { onPublicKey } from '@/lib/firestore';
import { safetyCode } from './envelope';
import {
  acceptChangedKey,
  isTrustedKey,
  loadIdentity,
  onTrustChange,
  resolveKeys,
} from './keystore';

/**
 * Live encryption state for one chat: who new messages can be encrypted to,
 * and who needs attention first.
 */
export function useChatKeys(memberIds: string[] | undefined, viewerId: string | null) {
  const [directory, setDirectory] = useState<Record<string, Uint8Array | null>>({});
  const [myKey, setMyKey] = useState<Uint8Array | null>(null);
  const [trustVersion, setTrustVersion] = useState(0);

  // Stable string key: memberIds gets a fresh identity on every chat snapshot.
  const otherIdsKey = useMemo(
    () => (memberIds ?? []).filter((id) => id !== viewerId).sort().join('|'),
    [memberIds, viewerId]
  );

  useEffect(() => {
    setDirectory({});
    if (!viewerId || !otherIdsKey) return;
    const unsubs = otherIdsKey.split('|').map((id) =>
      onPublicKey(viewerId, id, (key) => {
        // First sight pins it; a different key after that shows up in `changed`.
        if (key) isTrustedKey(id, key);
        setDirectory((prev) => ({ ...prev, [id]: key }));
      })
    );
    return () => unsubs.forEach((unsubscribe) => unsubscribe());
  }, [otherIdsKey, viewerId]);

  useEffect(() => {
    setMyKey(null);
    if (!viewerId) return;
    let active = true;
    loadIdentity(viewerId).then((me) => {
      if (active) setMyKey(me.publicKey);
    });
    return () => {
      active = false;
    };
  }, [viewerId]);

  useEffect(() => onTrustChange(() => setTrustVersion((v) => v + 1)), []);

  const keys = useMemo(
    () => resolveKeys(otherIdsKey ? otherIdsKey.split('|') : [], directory),
    // trustVersion: resolveKeys reads the pinned keys, which change on accept.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [otherIdsKey, directory, trustVersion]
  );

  const safetyCodeFor = useCallback(
    (id: string): string | null => {
      const theirs = directory[id];
      return myKey && theirs ? safetyCode(myKey, theirs) : null;
    },
    [directory, myKey]
  );

  return { ...keys, acceptKey: acceptChangedKey, safetyCodeFor };
}
