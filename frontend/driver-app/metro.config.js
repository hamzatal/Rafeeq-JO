// Monorepo-aware Metro config so the app can import @rafeeq/* workspace packages.
// Workspace root is the `frontend/` folder (one level up from this app).
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

// Pin expo-router's app root to THIS app's own `app/` directory so the shared
// (hoisted) expo-router entry resolves the correct routes per app.
process.env.EXPO_ROUTER_APP_ROOT = path.resolve(projectRoot, 'app');

// CRITICAL (monorepo): expo-router is hoisted to the workspace root, so its
// `entry.js` is the SAME file for both the student and driver apps. Metro's
// transform cache is keyed partly by file path, which means the two apps can
// otherwise serve each other's bundle from a shared cache (this caused the
// student app to open the driver app). A unique cacheVersion per app forces a
// separate cache namespace and prevents any cross-app bleed.
const config = getDefaultConfig(projectRoot);

config.cacheVersion = 'rafeeq-driver-app';

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
