import type { ReactNode } from 'react';
import { I18nProvider as Provider } from '@rafeeq/ui';
import { usePrefs } from './store/prefs';

export { useI18n } from '@rafeeq/ui';

/**
 * Binds this app's prefs store to the shared provider.
 *
 * The provider itself takes `locale` as a prop and lives in `@rafeeq/ui`. That
 * inversion is the whole reason it can be shared: the previous version imported
 * `usePrefs` directly, and `usePrefs` imports the API client, whose token key is
 * per-app — so a package-level import would have had to guess which app it was in.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = usePrefs((s) => s.locale);
  const setLocale = usePrefs((s) => s.setLocale);

  return (
    <Provider locale={locale} setLocale={setLocale}>
      {children}
    </Provider>
  );
}
