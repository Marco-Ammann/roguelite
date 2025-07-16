/**
 * Simple wrapper around console logging that prefixes and can be expanded later.
 */
export default class Logger {
  /** Logs info-level messages (only in dev mode). */
  static info(...args: unknown[]): void {
    if (import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.info('[INFO]', ...args);
    }
  }

  /** Logs warnings. */
  static warn(...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.warn('[WARN]', ...args);
  }

  /** Logs errors. */
  static error(...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.error('[ERROR]', ...args);
  }
}

// Global error handler – logs uncaught errors via Logger.error
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    Logger.error('Unhandled error:', e.error || e.message);
  });
}
