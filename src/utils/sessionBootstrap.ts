import type { UserData } from '../components/OnboardingFlow';
import { userData as userDataService } from '../services/supabase';
import {
  clearOnboardingProgress,
  isOnboardingComplete,
  shouldResumeOnboarding,
  type OnboardingProgress,
} from './onboardingProgress';

export type SessionView = 'landing' | 'onboarding' | 'dashboard';

export interface SessionBootstrapResult {
  view: SessionView;
  data: UserData | null;
  resume?: OnboardingProgress | null;
}

/** After auth or on cold start with a session — cloud wins when complete. */
export async function bootstrapUserSession(): Promise<SessionBootstrapResult> {
  await userDataService.syncLocalToCloud();
  const data = await userDataService.load();

  if (isOnboardingComplete(data)) {
    clearOnboardingProgress();
    return { view: 'dashboard', data };
  }

  const resume = shouldResumeOnboarding(data);
  if (resume) {
    return {
      view: 'onboarding',
      data: resume.userData,
      resume,
    };
  }

  return { view: 'onboarding', data };
}
