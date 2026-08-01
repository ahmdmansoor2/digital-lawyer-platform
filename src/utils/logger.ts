/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * logger.ts — نظام تسجيل آمن للإنتاج (production-safe).
 *
 * - في development: يطبع كل شيء في console (debug, info, warn, error).
 * - في production: يطبع فقط warn + error، يخفي debug + info.
 *
 * يمنع كشف البيانات الحساسة (أرقام قضايا، أسماء موكلين) في DevTools.
 *
 * Usage:
 *   import { logger } from '../utils/logger';
 *   logger.info('User clicked button');
 *   logger.error('Failed to load data', err);
 *   logger.warn('Quota exceeded');
 *   logger.debug('Detailed state', state);  // dev only
 */

const IS_DEV = (() => {
  // Electron dev mode OR vite dev server
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') return true;
  if (typeof window !== 'undefined' && (window as any).__DEV__) return true;
  // Detect Electron dev mode via location query
  if (typeof window !== 'undefined' && window.location?.search?.includes('dev')) return true;
  return false;
})();

interface LogPayload {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

const BUFFER_MAX = 50;
const recentLogs: LogPayload[] = [];

/**
 * Add to in-memory buffer (for potential crash reports or in-app log viewer).
 * Never exposed to window in production.
 */
function addToBuffer(entry: LogPayload) {
  recentLogs.push(entry);
  if (recentLogs.length > BUFFER_MAX) {
    recentLogs.shift();
  }
}

function formatMessage(level: string, msg: string, ...args: any[]): any[] {
  const ts = new Date().toISOString().substring(11, 19);
  return [`[${ts}] [${level.toUpperCase()}] ${msg}`, ...args];
}

export const logger = {
  /**
   * Detailed debug info. Hidden in production.
   */
  debug(msg: string, ...args: any[]) {
    if (!IS_DEV) return;
    addToBuffer({ timestamp: new Date().toISOString(), level: 'debug', message: msg, data: args.length > 0 ? args : undefined });
    // eslint-disable-next-line no-console
    console.log(...formatMessage('debug', msg, ...args));
  },

  /**
   * General info. Hidden in production.
   */
  info(msg: string, ...args: any[]) {
    if (!IS_DEV) return;
    addToBuffer({ timestamp: new Date().toISOString(), level: 'info', message: msg, data: args.length > 0 ? args : undefined });
    // eslint-disable-next-line no-console
    console.log(...formatMessage('info', msg, ...args));
  },

  /**
   * Warnings. Always shown.
   */
  warn(msg: string, ...args: any[]) {
    addToBuffer({ timestamp: new Date().toISOString(), level: 'warn', message: msg, data: args.length > 0 ? args : undefined });
    // eslint-disable-next-line no-console
    console.warn(...formatMessage('warn', msg, ...args));
  },

  /**
   * Errors. Always shown.
   */
  error(msg: string, ...args: any[]) {
    addToBuffer({ timestamp: new Date().toISOString(), level: 'error', message: msg, data: args.length > 0 ? args : undefined });
    // eslint-disable-next-line no-console
    console.error(...formatMessage('error', msg, ...args));
  },

  /**
   * Get recent logs (for debugging or crash reports).
   */
  getRecentLogs(): LogPayload[] {
    return [...recentLogs];
  },

  /**
   * Check if dev mode.
   */
  isDev(): boolean {
    return IS_DEV;
  },
};

// Backward compatibility: replace global console in production
// to avoid accidental data leaks via devtools. This is a strict mode.
if (!IS_DEV && typeof window !== 'undefined') {
  // Don't actually replace (could break libraries), but expose
  // a function for safe logging only.
  // Library can use logger.error() to be safe.
}

export default logger;
