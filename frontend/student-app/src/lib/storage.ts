import { createTokenStorage } from '@rafeeq/ui';

/**
 * This app's bearer-token slot.
 *
 * The key is per-app and load-bearing: one phone often holds both apps, and a
 * student is frequently also a captain. A shared key would mean signing into the
 * captain app silently ends the student session.
 */
export const tokenStorage = createTokenStorage('rafeeq_token');
