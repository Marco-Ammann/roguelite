/**
 * Simple wrapper around console logging that prefixes and can be expanded later.
 */
export default class Logger {
  private static banner(message: string): void {
    if (typeof document === 'undefined') return;
    let el = document.getElementById('error-banner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'error-banner';
      Object.assign(el.style, {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: '#8b0000',
        color: '#fff',
        padding: '4px 8px',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 9999,
      });
      document.body.appendChild(el);
    }
    el.textContent = message;
  }
  /** Logs info-level messages (only in dev mode). */
  private static prefix(level: string): string {
    const now = new Date().toISOString().slice(11, 19);
    return `[${level}] ${now}`;
  }

  static info(...args: unknown[]): void {
    if (import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.info(this.prefix('INFO'), ...args);
    }
  }

  /** Logs warnings. */
  static warn(...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.warn(this.prefix('WARN'), ...args);
  }

  /** Logs errors. */
  static error(...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.error(this.prefix('ERROR'), ...args);
    this.banner(String(args[0]));
  }
}

// Global error handlers – log uncaught errors / rejections and show banner
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    Logger.error('Unhandled error:', e.error?.stack || e.message);
  });
  window.addEventListener('unhandledrejection', (e) => {
    Logger.error('Unhandled promise rejection:', (e.reason as Error)?.stack || String(e.reason));
  });
}
