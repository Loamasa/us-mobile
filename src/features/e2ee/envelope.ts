import nacl from 'tweetnacl';

/**
 * End-to-end encryption core. Pure functions: no storage, no network, so the
 * Node tests and the emulator seed run the same code as the app.
 *
 * Each message gets a random content key. The text is sealed with that key
 * (XSalsa20-Poly1305), then the key is boxed (X25519 + XSalsa20-Poly1305)
 * separately to every reader. Membership changes need no key rotation: whoever
 * left simply isn't granted later messages.
 *
 * Each grant also carries a hash of the body. Without it any reader, who knows
 * the content key, could write a different body under the sender's grants.
 *
 * The payload names its scope and sender, so a ciphertext can't be moved to
 * another chat or passed off as someone else's. Payloads are padded so stored
 * sizes reveal length only roughly.
 *
 * No forward secrecy: a stolen secret key opens past messages it was granted.
 */

export interface KeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

export interface Envelope {
  v: 1;
  from: Uint8Array; // the sender's public key
  n: Uint8Array;
  body: Uint8Array;
  grants: Record<string, Uint8Array>; // uid → content key + body hash, boxed to them
}

export interface Opened {
  text: string;
  senderId: string;
  from: Uint8Array;
}

const PADDING_BLOCK = 256;
const BODY_HASH_LENGTH = 32;

export function toHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
  return hex;
}

export function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

// Plain code rather than TextEncoder/TextDecoder: not every React Native runtime
// has both. A lone surrogate (an emoji cut in half by the length limit) becomes
// U+FFFD instead of failing the send.
function utf8Encode(text: string): Uint8Array {
  const bytes: number[] = [];
  for (const char of text) {
    let code = char.codePointAt(0)!;
    if (code >= 0xd800 && code <= 0xdfff) code = 0xfffd;
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 63),
        0x80 | ((code >> 6) & 63),
        0x80 | (code & 63)
      );
    }
  }
  return Uint8Array.from(bytes);
}

// Only ever sees bytes that passed authentication, so it needn't reject overlong
// forms. Anything malformed just fails JSON.parse in open().
function utf8Decode(bytes: Uint8Array): string {
  let text = '';
  for (let i = 0; i < bytes.length; ) {
    const first = bytes[i++];
    const length = first < 0x80 ? 0 : first < 0xe0 ? 1 : first < 0xf0 ? 2 : 3;
    let code = length === 0 ? first : first & (0x3f >> length);
    for (let j = 0; j < length; j++) code = (code << 6) | (bytes[i++] & 63);
    text += String.fromCodePoint(code);
  }
  return text;
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

function bodyHash(n: Uint8Array, body: Uint8Array): Uint8Array {
  return nacl.hash(concat(n, body)).slice(0, BODY_HASH_LENGTH);
}

// The X25519 step is by far the slowest part and each pair of keys always
// gives the same result, so compute it once per peer.
const sharedKeys = new Map<string, Uint8Array>();

function sharedKey(theirPublicKey: Uint8Array, mine: KeyPair): Uint8Array {
  const id = toHex(theirPublicKey) + toHex(mine.publicKey);
  let key = sharedKeys.get(id);
  if (!key) {
    key = nacl.box.before(theirPublicKey, mine.secretKey);
    sharedKeys.set(id, key);
  }
  return key;
}

export function generateKeyPair(): KeyPair {
  return nacl.box.keyPair();
}

export function keyPairFromSecret(secretKey: Uint8Array): KeyPair {
  return nacl.box.keyPair.fromSecretKey(secretKey);
}

/**
 * Fixed keys for the seeded dev personas, so the emulator seed can encrypt
 * fixture chats the app can then read. Only ever used for those personas in
 * dev builds; see keystore.ts.
 */
export function devKeyPair(uid: string): KeyPair {
  return keyPairFromSecret(
    nacl.hash(utf8Encode(`us-dev-key:${uid}`)).slice(0, nacl.box.secretKeyLength)
  );
}

export function seal(
  text: string,
  scope: string,
  senderId: string,
  sender: KeyPair,
  recipients: Record<string, Uint8Array>
): Envelope {
  const json = JSON.stringify({ t: text, c: scope, s: senderId });
  const size = utf8Encode(json).length;
  // JSON.parse ignores trailing spaces, so padding needs no length field.
  const padded = json + ' '.repeat(PADDING_BLOCK - (size % PADDING_BLOCK));

  const n = nacl.randomBytes(nacl.secretbox.nonceLength);
  const contentKey = nacl.randomBytes(nacl.secretbox.keyLength);
  const body = nacl.secretbox(utf8Encode(padded), n, contentKey);
  const grant = concat(contentKey, bodyHash(n, body));

  // One nonce is safe across grants: every reader has a different shared key.
  const grants: Record<string, Uint8Array> = {};
  for (const [uid, publicKey] of Object.entries(recipients)) {
    grants[uid] = nacl.box.after(grant, n, sharedKey(publicKey, sender));
  }
  return { v: 1, from: sender.publicKey, n, body, grants };
}

/**
 * Returns null when this viewer can't read it, or when anything fails to
 * authenticate. Doesn't decide whether `from` really is the claimed sender:
 * that's the caller's job, against its pinned keys (trust.ts).
 */
export function open(
  envelope: Envelope,
  viewerId: string,
  viewer: KeyPair,
  scope: string
): Opened | null {
  const sealedGrant = envelope.grants[viewerId];
  if (!sealedGrant) return null;
  try {
    const grant = nacl.box.open.after(
      sealedGrant,
      envelope.n,
      sharedKey(envelope.from, viewer)
    );
    if (!grant || grant.length !== nacl.secretbox.keyLength + BODY_HASH_LENGTH) return null;
    const contentKey = grant.slice(0, nacl.secretbox.keyLength);
    const expectedHash = grant.slice(nacl.secretbox.keyLength);
    if (!nacl.verify(expectedHash, bodyHash(envelope.n, envelope.body))) return null;

    const plain = nacl.secretbox.open(envelope.body, envelope.n, contentKey);
    if (!plain) return null;
    const payload = JSON.parse(utf8Decode(plain));
    if (payload.c !== scope || typeof payload.t !== 'string' || typeof payload.s !== 'string') {
      return null;
    }
    return { text: payload.t, senderId: payload.s, from: envelope.from };
  } catch {
    // tweetnacl throws on wrong-sized input, and anyone can write a bad envelope.
    return null;
  }
}

/**
 * The code two people compare, in person or on a call, to confirm no one
 * swapped their keys. Same result on both phones.
 */
export function safetyCode(a: Uint8Array, b: Uint8Array): string {
  const [first, second] = [toHex(a), toHex(b)].sort();
  const hash = nacl.hash(fromHex(first + second));
  const groups: string[] = [];
  for (let i = 0; i < 6; i++) {
    const value = ((hash[i * 2] << 8) | hash[i * 2 + 1]) % 10000;
    groups.push(String(value).padStart(4, '0'));
  }
  return groups.join(' ');
}
