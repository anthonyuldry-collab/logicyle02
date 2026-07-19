/**
 * Observabilité client — Sentry optionnel + Error Boundary reporting.
 * Active avec VITE_SENTRY_DSN (build-time). Sans DSN : no-op structuré.
 */

type Severity = 'info' | 'warning' | 'error' | 'fatal';

interface CaptureContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

let sentryReady = false;

function consoleStructured(severity: Severity, message: string, context?: CaptureContext) {
  const payload = {
    severity: severity.toUpperCase(),
    message,
    service: 'logicyle-web',
    env: import.meta.env.MODE,
    ...context,
    timestamp: new Date().toISOString(),
  };
  if (severity === 'error' || severity === 'fatal') {
    console.error(JSON.stringify(payload));
  } else if (severity === 'warning') {
    console.warn(JSON.stringify(payload));
  } else {
    console.info(JSON.stringify(payload));
  }
}

/** À appeler une fois au démarrage (index.tsx). */
export async function initMonitoring(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn || !import.meta.env.PROD) {
    return;
  }

  try {
    const Sentry = await import('@sentry/react');
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      release: `logicyle-web@${import.meta.env.VITE_APP_VERSION || '0.0.0'}`,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0.5,
      ignoreErrors: [
        'ResizeObserver loop',
        'Non-Error promise rejection',
        'Load failed',
        'NetworkError',
      ],
    });
    sentryReady = true;
  } catch (err) {
    consoleStructured('warning', 'sentry_init_failed', {
      extra: { error: String(err) },
    });
  }
}

export function captureException(error: unknown, context?: CaptureContext): void {
  const err = error instanceof Error ? error : new Error(String(error));
  consoleStructured('error', err.message, {
    ...context,
    extra: { ...(context?.extra || {}), stack: err.stack },
  });

  if (!sentryReady) return;
  void import('@sentry/react').then((Sentry) => {
    Sentry.withScope((scope) => {
      if (context?.tags) {
        Object.entries(context.tags).forEach(([k, v]) => scope.setTag(k, v));
      }
      if (context?.extra) {
        Object.entries(context.extra).forEach(([k, v]) => scope.setExtra(k, v));
      }
      Sentry.captureException(err);
    });
  });
}

export function captureMessage(message: string, severity: Severity = 'info', context?: CaptureContext): void {
  consoleStructured(severity, message, context);
  if (!sentryReady) return;
  void import('@sentry/react').then((Sentry) => {
    Sentry.captureMessage(message, severity === 'fatal' ? 'fatal' : severity);
  });
}
