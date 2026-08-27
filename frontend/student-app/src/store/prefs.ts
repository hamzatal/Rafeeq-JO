import { createPrefsStore } from '@rafeeq/ui';

/** Language + onboarding flag. Keyed per app — see `createTokenStorage`. */
export const usePrefs = createPrefsStore('rafeeq_prefs');
