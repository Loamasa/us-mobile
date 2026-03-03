import { signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/config/firebase';
import fixtures from './fixtures.json';

export interface DevAccount {
  id: string;
  displayName: string;
  handle: string;
  email: string;
  password: string;
}

const DEV_USER_ACCOUNT: DevAccount = {
  id: 'dev-user',
  displayName: 'Dev User',
  handle: 'dev',
  email: 'dev@test.dev',
  password: 'test123456',
};

/** All 6 dev accounts (dev-user + 5 dummies). */
export const DEV_ACCOUNTS: DevAccount[] = [
  DEV_USER_ACCOUNT,
  ...Object.entries(fixtures.personas).map(([id, persona]) => ({
    id,
    displayName: persona.profile.displayName,
    handle: persona.profile.handle,
    email: persona.auth.email,
    password: persona.auth.password,
  })),
];

/** Get the persona ID of the currently signed-in account, or null. */
export function getCurrentAccountId(): string | null {
  const email = auth.currentUser?.email;
  if (!email) return null;
  return DEV_ACCOUNTS.find((a) => a.email === email)?.id ?? null;
}

/** Sign out current user and sign in as the specified account. */
export async function switchAccount(account: DevAccount): Promise<void> {
  await signOut(auth);
  await signInWithEmailAndPassword(auth, account.email, account.password);
}
