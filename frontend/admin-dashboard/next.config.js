/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output for lean production Docker images.
  output: 'standalone',
  // Compile the shared workspace packages (they ship TypeScript source).
  transpilePackages: ['@rafeeq/shared', '@rafeeq/api-client'],
};

module.exports = nextConfig;
