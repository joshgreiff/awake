import type { UserData } from '../components/OnboardingFlow';

export type SaveResult =
  | { ok: true }
  | { ok: false; error: string; localOnly?: boolean };

/** Strip undefined values — jsonb rejects undefined in some paths */
export function normalizeUserData(data: UserData): UserData {
  const copy = JSON.parse(JSON.stringify(data)) as UserData;

  const identity = copy.identity as Record<string, unknown> | undefined;
  if (identity) {
    if (identity.generatedAlias && !identity.alias) {
      identity.alias = identity.generatedAlias;
      delete identity.generatedAlias;
    }
    copy.identity = identity as UserData['identity'];
  }

  return copy;
}
