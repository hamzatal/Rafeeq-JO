import { createTokenStorage } from '@rafeeq/ui';

/**
 * This app's bearer-token slot.
 *
 * `rafeeq_driver_token`, not `rafeeq_token`, and that is deliberate: one phone
 * often holds both apps and one person is often both. Sharing the key would make
 * signing in here end the student session on the same device.
 */
export const tokenStorage = createTokenStorage('rafeeq_driver_token');
