import { describe, expect, it, vi } from 'vitest';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { TabBar } from './TabBar';
import { render, type Rendered } from '../test/render';

/*
 * One tab is several nodes — the `Pressable` plus the host elements that inherit its
 * props — so counting `byRole('tab')` counts each tab three times. The accessibility
 * label is what identifies a tab, and it is also what a screen reader announces.
 */
const tabs = (r: Rendered): string[] => [
  ...new Set(r.byRole('tab').map((n) => String(n.props.accessibilityLabel))),
];

/* ═══════════════════════════════════════════════════════════════════════════
   The bar drew every screen, including the ones marked hidden.

   `expo-router` compiles `<Tabs.Screen options={{ href: null }} />` into
   `tabBarButton: () => null` (see `expo-router/build/layouts/Tabs.js`). React
   Navigation's DEFAULT bar renders each item THROUGH `tabBarButton`, so returning
   null is what hides the screen.

   This bar renders its own `Pressable` and never read that option, so `href: null`
   did nothing: the student layout declares four tabs and hides nine screens, and all
   THIRTEEN were drawn — roughly 30pt each on a 390pt phone, with «الإعدادات»
   truncated to «الإعد…». The driver layout hid five and drew nine.

   Not a web-only artefact: nothing in the path branches on `Platform`.
   ═══════════════════════════════════════════════════════════════════════════ */

/** The four visible tabs and the nine hidden ones, as the student app declares them. */
const VISIBLE = ['home', 'trips', 'wallet', 'settings'];
const HIDDEN = [
  'assistant',
  'notifications',
  'subscriptions',
  'checkout',
  'chat',
  'addresses',
  'ride-request',
  'support',
  'emergency',
];

function bar({ hidden = HIDDEN }: { hidden?: string[] } = {}) {
  const names = [...VISIBLE, ...hidden];
  const routes = names.map((name) => ({ key: `${name}-key`, name, params: undefined }));

  const descriptors = Object.fromEntries(
    routes.map((route) => [
      route.key,
      {
        options: {
          title: route.name,
          // What expo-router injects for a screen given `href: null`.
          ...(hidden.includes(route.name) ? { tabBarButton: () => null } : {}),
        },
      },
    ]),
  );

  const props = {
    state: { index: 0, routes },
    descriptors,
    navigation: { emit: vi.fn(() => ({ defaultPrevented: false })), navigate: vi.fn() },
  } as unknown as BottomTabBarProps;

  return render(<TabBar {...props} />);
}

describe('TabBar — href: null', () => {
  it('draws only the tabs that are not hidden', () => {
    expect(tabs(bar())).toEqual(VISIBLE);
  });

  it('omits every hidden screen by name', () => {
    const text = bar().text();

    for (const name of HIDDEN) expect(text).not.toContain(name);
  });

  it('still draws the visible ones', () => {
    const text = bar().text();

    for (const name of VISIBLE) expect(text).toContain(name);
  });

  /*
   * Guards the fix from being "solved" by skipping anything with a `tabBarButton`.
   * A real `href` also compiles to one, and that screen IS meant to appear.
   */
  it('keeps a screen whose tabBarButton renders something', () => {
    const names = [...VISIBLE, 'extra'];
    const routes = names.map((name) => ({ key: `${name}-key`, name, params: undefined }));
    const descriptors = Object.fromEntries(
      routes.map((route) => [
        route.key,
        {
          options: {
            title: route.name,
            ...(route.name === 'extra' ? { tabBarButton: () => <></> } : {}),
          },
        },
      ]),
    );
    const props = {
      state: { index: 0, routes },
      descriptors,
      navigation: { emit: vi.fn(() => ({ defaultPrevented: false })), navigate: vi.fn() },
    } as unknown as BottomTabBarProps;

    expect(tabs(render(<TabBar {...props} />))).toEqual(names);
  });
});
