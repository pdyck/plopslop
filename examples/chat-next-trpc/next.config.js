/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@plopslop/core", "@plopslop/redis"],
};

module.exports = nextConfig;
