import type { UserData } from '../components/OnboardingFlow';

export const ONBOARDING_STORAGE_KEY = 'awake_onboarding_progress';

export type OnboardingStage =
  | 'awakening'
  | 'identity'
  | 'archetype'
  | 'domains'
  | 'intention'
  | 'unlock';

export interface OnboardingProgress {
  stage: OnboardingStage;
  userData: UserData;
}

export function isOnboardingComplete(data: UserData | null | undefined): boolean {
  return !!data?.identity?.name;
}

export function readOnboardingProgress(): OnboardingProgress | null {
  const raw = localStorage.getItem(ONBOARDING_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingProgress>;
    if (parsed?.stage) {
      return {
        stage: parsed.stage as OnboardingStage,
        userData: parsed.userData ?? {},
      };
    }
  } catch {
    // ignore corrupt saves
  }

  return null;
}

export function writeOnboardingProgress(progress: OnboardingProgress): void {
  localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(progress));
}

export function clearOnboardingProgress(): void {
  localStorage.removeItem(ONBOARDING_STORAGE_KEY);
}

/** True when user should resume the setup flow after refresh. */
export function shouldResumeOnboarding(
  completedData: UserData | null | undefined
): OnboardingProgress | null {
  const progress = readOnboardingProgress();
  if (!progress) return null;

  // Finished setup is stored in awake_user_data with identity — don't re-onboard
  if (isOnboardingComplete(completedData)) return null;

  return progress;
}
