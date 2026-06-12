import * as Sentry from "@sentry/react";

console.log('🔍 Sentry: Starting initialization...');
const dsn = import.meta.env.VITE_SENTRY_DSN || "https://aaf76991285266494a88d844d0cc62fb@o4511487390515200.ingest.de.sentry.io/4511487402377296";

if (dsn && !dsn.includes("examplePublicKey")) {
  try {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
        // Send console.log, console.warn, and console.error calls as logs to Sentry
        Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
      ],
      // Enable logs to be sent to Sentry
      enableLogs: true,
      // Performance Monitoring
      tracesSampleRate: 1.0,
      tracePropagationTargets: ["localhost", /^https:\/\/your-api\.com/],
      // Session Replay
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });

    console.log('✅ Sentry: Initialized successfully with Logging enabled');

    // Verification metrics and logs
    if (Sentry.metrics) {
      Sentry.metrics.count('app_startup', 1);
    }
    
    // Send verification log
    Sentry.logger.info('Application initialized with Sentry Logging', { log_source: 'startup' });
  } catch (err) {
    console.error('❌ Sentry: Initialization failed:', err);
  }
} else {
  console.log("ℹ️ Sentry: Initialization skipped (Missing or invalid DSN)");
}
