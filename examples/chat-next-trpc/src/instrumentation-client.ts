import * as Sentry from "@sentry/nextjs";
import * as Spotlight from "@spotlightjs/spotlight";

Sentry.init({
  spotlight: true,
  sampleRate: 1.0,
  tracesSampleRate: 1.0,
});

Spotlight.init();

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
