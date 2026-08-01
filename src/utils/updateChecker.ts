/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * updateChecker.ts — نظام التحقق من التحديثات.
 *
 * يقارن الـ version الحالي في package.json مع version.json
 * (اللي يكون على server أو GitHub Pages).
 *
 * في الـ production، الـ URL بيشير لـ endpoint ثابت.
 * في dev، بيرجع null (ما في update).
 */

import { logger } from './logger';

export interface VersionInfo {
  version: string;
  releaseDate: string;
  releaseNotes?: string;
  downloadUrl?: string;
  critical?: boolean;
}

export interface UpdateStatus {
  current: string;
  latest: string | null;
  hasUpdate: boolean;
  isCritical: boolean;
  releaseNotes?: string;
  downloadUrl?: string;
  error?: string;
}

// v2.8.1: Update endpoint — في production، ممكن يكون GitHub Pages
// للـ dev/testing، الـ function بترجع null وما تحاولش تتصل
const UPDATE_ENDPOINT = 'https://lawfirm-updates.example.com/version.json';

/**
 * قارن بين نسختين semver (1.2.3).
 * Returns:
 *   -1 if a < b
 *    0 if equal
 *    1 if a > b
 */
export function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }
  return 0;
}

/**
 * ابحث عن آخر نسخة متاحة.
 */
export async function fetchLatestVersion(): Promise<VersionInfo | null> {
  try {
    // في بيئة dev/Electron بدون network، ده هيرجع throw
    if (typeof window === 'undefined' || !navigator.onLine) {
      return null;
    }
    const response = await fetch(UPDATE_ENDPOINT, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      // timeout after 5 seconds
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (e: any) {
    logger.warn('Update check failed', e?.message);
    return null;
  }
}

/**
 * قارن الـ current version مع latest من السيرفر.
 */
export async function checkForUpdate(currentVersion: string): Promise<UpdateStatus> {
  const latest = await fetchLatestVersion();

  if (!latest) {
    return {
      current: currentVersion,
      latest: null,
      hasUpdate: false,
      isCritical: false,
      error: 'تعذر الوصول إلى خادم التحديثات',
    };
  }

  const cmp = compareVersions(currentVersion, latest.version);
  const hasUpdate = cmp < 0;

  return {
    current: currentVersion,
    latest: latest.version,
    hasUpdate,
    isCritical: latest.critical ?? false,
    releaseNotes: latest.releaseNotes,
    downloadUrl: latest.downloadUrl,
  };
}
