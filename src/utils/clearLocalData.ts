import { LOA_CHATS_STORAGE_KEY } from './loaChatStorage';

/** Clears on-device journey data. Cloud profile is kept for next sign-in. */
export function clearLocalAwakeData(options?: { keepAiConfig?: boolean }) {
  const keepAiConfig = options?.keepAiConfig ?? true;

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key.startsWith('awake_')) {
      if (keepAiConfig && key === 'awake_ai_config') continue;
      // Keep in-progress setup when signing out (only cleared on completion)
      if (key === 'awake_onboarding_progress') continue;
      keysToRemove.push(key);
    }
  }

  keysToRemove.push(LOA_CHATS_STORAGE_KEY);

  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}
