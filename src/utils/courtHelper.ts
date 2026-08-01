/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Utility to manage dynamic litigation levels and court types stored in localStorage.
 */

const DEFAULT_LITIGATION_LEVELS = [
  'ابتدائي (جزئي/كلي)',
  'استئناف عالي',
  'نقض'
];

export function getLitigationLevels(): string[] {
  const saved = localStorage.getItem('lawfirm_custom_litigation_levels');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      // fallback to defaults if error
    }
  }
  return DEFAULT_LITIGATION_LEVELS;
}

export function saveLitigationLevels(levels: string[]) {
  localStorage.setItem('lawfirm_custom_litigation_levels', JSON.stringify(levels));
  
  // Dispatch custom event to notify components of the change
  window.dispatchEvent(new Event('litigation-levels-changed'));
}
