import * as Sentry from "@sentry/nextjs";

Sentry.init({
  spotlight: true,
  sampleRate: 1.0,
  tracesSampleRate: 1.0,
});
