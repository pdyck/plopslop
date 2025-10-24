import { withSentryConfig } from "@sentry/nextjs";

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@plopslop/core", "@plopslop/redis"],
};

export default withSentryConfig(nextConfig, {
  org: "example-org",
  project: "example-project",
  silent: !process.env.CI,
  disableLogger: true,
});
