/** @type {import('next').NextConfig} */

/*
 * Phase 10 folded thirteen pages into five tabbed destinations (28 → 18 pages, 6 → 4
 * groups — `docs/design/v2/06-admin-1`). No feature was removed: each page became a
 * tab, and each OLD URL keeps working through the redirects below.
 *
 * That matters more than tidiness. These paths are in operators' bookmarks, in links
 * pasted into support threads, and in the `HINTS`/deep links other pages already emit
 * (`/users?q=…`, `/reports`). A 404 on `/zones` would read as "the feature is gone",
 * which is exactly the wrong message for a migration whose whole promise is that
 * nothing was lost.
 *
 * `permanent: false` (307), not 308: the merge is a product decision that may be
 * revisited, and a permanent redirect is cached by browsers in a way that is painful
 * to walk back.
 */
const MERGED = [
  ['/zones', '/geography?tab=zones'],
  ['/zone-prices', '/geography?tab=prices'],
  ['/routes', '/geography?tab=routes'],
  ['/universities', '/geography?tab=universities'],
  ['/plans', '/pricing?tab=plans'],
  ['/subscriptions', '/pricing?tab=subscriptions'],
  ['/coupons', '/pricing?tab=coupons'],
  ['/complaints', '/support?tab=complaints'],
  ['/audit', '/security?tab=audit'],
  ['/admins', '/settings?tab=staff'],
  ['/cliq', '/settings?tab=cliq'],
  ['/notifications', '/settings?tab=broadcast'],
  ['/ads', '/settings?tab=ads'],
];

const nextConfig = {
  reactStrictMode: true,
  // Standalone output for lean production Docker images.
  output: 'standalone',
  // Compile the shared workspace packages (they ship TypeScript source).
  transpilePackages: ['@rafeeq/shared', '@rafeeq/api-client'],

  async redirects() {
    return MERGED.map(([source, destination]) => ({ source, destination, permanent: false }));
  },
};

module.exports = nextConfig;
