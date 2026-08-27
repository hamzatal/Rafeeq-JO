/*
 * The design system used to live here — `theme/colors.ts`, `scheme.ts`,
 * `spacing.ts`, `typography.ts` — as a hand copy of `docs/design/src/kit.css`.
 *
 * It is now `@rafeeq/tokens`, which GENERATES kit.css and the Tailwind preset
 * instead of duplicating them. Four hand-written copies of the same values had
 * already drifted: the card radius differed by 4px between the design source and
 * the dashboard, every React Native shadow was tinted with a navy from an
 * identity deleted two phases earlier, and `colors.ts` still held that whole dead
 * palette — which both apps' SPLASH SCREEN was still rendering.
 *
 * `@rafeeq/shared` keeps what it is actually for: types, i18n, endpoints,
 * validators and money formatting. Design values are not shared business logic.
 */
export * from './i18n';
export * from './types';
export * from './utils';
export * from './constants';
