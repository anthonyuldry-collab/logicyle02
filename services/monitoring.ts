/**
 * Observabilité client — Sentry optionnel + Error Boundary reporting.
 * Active avec VITE_SENTRY_DSN (build-time). Sans DSN : no-op structuré.
 *
 * Règles : PROD only, pas de PII (email, tokens), Session Replay off tant que
 * l’intégration replay n’est pas explicitement activée.
 */

type Severity = 'info' | 'warning' | 'error' | 'fatal';

interface CaptureContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

let sentryReady = false;

const SENSITIVE_KEY =
  /pass(word)?|token|secret|authorization|cookie|email|phone|card|iban|stripe|firebase/i;

function scrubValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[Truncated]';
  if (value == null) return value;
  if (typeof value === 'string') {
    if (value.length > 500) return `${value.slice(0, 500)}…`;
    if (/^[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\./.test(value)) return '[RedactedJWT]';
    if (/sk_(live|test)_/.test(value) || /pk_(live|test)_/.test(value)) return '[RedactedKey]';
    return value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[RedactedEmail]');
  }
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => scrubValue(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY.test(k) ? '[Redacted]' : scrubValue(v, depth + 1);
    }
    return out;
  }
  return value;
}

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
      sendDefaultPii: false,
      tracesSampleRate: 0.1,
      // Pas de Session Replay tant que @sentry/replay n’est pas branché explicitement
      // (évite d’envoyer du DOM / PII par erreur).
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      ignoreErrors: [
        'ResizeObserver loop',
        'Non-Error promise rejection',
        'Load failed',
        'NetworkError',
        'ChunkLoadError',
        'Failed to fetch dynamically imported module',
      ],
      beforeSend(event) {
        if (event.user) {
          event.user = { id: event.user.id };
        }
        if (event.request?.headers) {
          const headers = { ...event.request.headers };
          delete headers.Authorization;
          delete headers.Cookie;
          event.request.headers = headers;
        }
        if (event.extra) {
          event.extra = scrubValue(event.extra) as typeof event.extra;
        }
        return event;
      },
      beforeBreadcrumb(breadcrumb) {
        if (breadcrumb.category === 'console' && breadcrumb.level === 'log') {
          return null;
        }
        if (breadcrumb.data) {
          breadcrumb.data = scrubValue(breadcrumb.data) as typeof breadcrumb.data;
        }
        return breadcrumb;
      },
    });
    sentryReady = true;
  } catch (err) {
    consoleStructured('warning', 'sentry_init_failed', {
      extra: { error: String(err) },
    });
  }
}

/** Identifiant technique uniquement — jamais d’e-mail. */
export function setMonitoringUser(userId: string | null): void {
  if (!sentryReady) return;
  void import('@sentry/react').then((Sentry) => {
    if (!userId) {
      Sentry.setUser(null);
      return;
    }
    Sentry.setUser({ id: userId });
  });
}

export function captureException(error: unknown, context?: CaptureContext): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const scrubbedExtra = context?.extra
    ? (scrubValue(context.extra) as Record<string, unknown>)
    : undefined;
  consoleStructured('error', err.message, {
    ...context,
    extra: { ...(scrubbedExtra || {}), stack: err.stack },
  });

  if (!sentryReady) return;
  void import('@sentry/react').then((Sentry) => {
    Sentry.withScope((scope) => {
      if (context?.tags) {
        Object.entries(context.tags).forEach(([k, v]) => scope.setTag(k, v));
      }
      if (scrubbedExtra) {
        Object.entries(scrubbedExtra).forEach(([k, v]) => scope.setExtra(k, v));
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
