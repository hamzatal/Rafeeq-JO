import type { ReactElement } from 'react';
import { create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

/**
 * Render a component and hand back a few queries.
 *
 * Deliberately tiny rather than `@testing-library/react-native`: that library
 * expects a Jest environment and its own `react-native` preset, and adding a second
 * test runner to this repo to test nine components is a worse trade than twenty
 * lines of helper.
 */
export interface Rendered {
  root: ReactTestInstance;
  tree: ReactTestRenderer;
  /** Every node with this `accessibilityLabel`. */
  byLabel(label: string): ReactTestInstance[];
  /** Every node whose `accessibilityRole` matches. */
  byRole(role: string): ReactTestInstance[];
  /** All rendered text, flattened — for "does this string appear" assertions. */
  text(): string;
  /** Instances of a component by its function/display name. */
  byName(name: string): ReactTestInstance[];
}

export function render(element: ReactElement): Rendered {
  const tree = create(element);
  const root = tree.root;

  const collect = (predicate: (n: ReactTestInstance) => boolean) =>
    root.findAll(predicate, { deep: true });

  return {
    tree,
    root,
    byLabel: (label) => collect((n) => n.props?.accessibilityLabel === label),
    byRole: (role) => collect((n) => n.props?.accessibilityRole === role),
    byName: (name) =>
      collect((n) => typeof n.type === 'function' && (n.type as { name?: string }).name === name),
    text: () => {
      const out: string[] = [];
      const visit = (node: unknown) => {
        if (typeof node === 'string') out.push(node);
        else if (typeof node === 'number') out.push(String(node));
        else if (Array.isArray(node)) node.forEach(visit);
        else if (node && typeof node === 'object' && 'children' in node) {
          visit((node as { children: unknown }).children);
        }
      };
      visit(tree.toJSON());

      return out.join(' ');
    },
  };
}

/**
 * The first match, asserting there is one.
 *
 * ── Why a helper and not `[0]!` ────────────────────────────────────────────────
 *
 * `noUncheckedIndexedAccess` types `findAllByType(X)[0]` as `T | undefined`, which is
 * the truth: a query that matches nothing returns an empty array. Every test in this
 * package read `[0]` and dereferenced it, so a query that stopped matching — because a
 * component was renamed, or a role was dropped — failed with
 * `Cannot read properties of undefined`, pointing at the assertion rather than at the
 * query that found nothing.
 *
 * `!` would silence the compiler and keep that message. This says what went wrong.
 */
export function first<T>(matches: T[], what: string): T {
  const [match] = matches;
  if (match === undefined) {
    throw new Error(`expected at least one ${what}, found none — the query matched nothing.`);
  }

  return match;
}

/**
 * Flatten an RN style prop into one object.
 *
 * Handles the function form: `Pressable` takes `style={({ pressed }) => […]}`, so
 * reading `props.style` directly hands back a closure and every assertion on it
 * silently compares against `undefined`. Resolved with `pressed: false`, which is
 * the resting state a test means when it says "the button is 46 tall".
 */
export function flatStyle(style: unknown, pressed = false): Record<string, unknown> {
  if (!style) return {};
  if (typeof style === 'function') {
    return flatStyle((style as (s: { pressed: boolean }) => unknown)({ pressed }), pressed);
  }
  if (Array.isArray(style)) return Object.assign({}, ...style.map((s) => flatStyle(s, pressed)));

  return style as Record<string, unknown>;
}
