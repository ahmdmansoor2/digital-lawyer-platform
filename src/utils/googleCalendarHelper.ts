/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Session, LegalDeadline } from '../types';
import { showAlert } from './dialogs';

// Default Client ID for the Google OAuth 2.0 integration
// Can be customized by environment variable or inputted by user
export const getGoogleClientId = (): string => {
  return (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
};

/**
 * Initiates the Google OAuth 2.0 Client-side Implicit Flow redirect.
 * It will redirect the user to Google's sign-in page, requesting permissions
 * to manage Google Calendar events.
 */
export const initiateGoogleAuth = async (clientId: string) => {
  if (!clientId) {
    await showAlert('يرجى تهيئة معرف عميل جوجل (Google Client ID) في الإعدادات أو ملف البيئة.');
    return;
  }

  const redirectUri = window.location.origin + window.location.pathname;
  const scope = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events';
  const responseType = 'token';
  const prompt = 'consent';

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=${responseType}&scope=${encodeURIComponent(
    scope
  )}&prompt=${prompt}`;

  // Redirect current window instead of accessing window.top to avoid cross-origin SecurityErrors
  window.location.href = authUrl;
};

/**
 * Parses the access token from the URL hash fragment.
 * Cleans the hash from the URL history.
 */
export const getAccessTokenFromHash = (): { token: string; expiresAt: number } | null => {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  if (!hash) return null;

  const params = new URLSearchParams(hash.substring(1));
  const token = params.get('access_token');
  const expiresIn = params.get('expires_in');

  if (token) {
    // Clear the hash fragment from the URL for a clean browser state
    const cleanUrl = window.location.pathname + window.location.search;
    window.history.replaceState(null, '', cleanUrl);

    const expiresAt = Date.now() + (Number(expiresIn) || 3600) * 1000;
    return { token, expiresAt };
  }
  return null;
};

const getNextDay = (dateStr: string): string => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + 1);
  return date.toISOString().split('T')[0];
};

/**
 * Maps a court Session (جلسة) to Google Calendar event structure.
 */
const mapSessionToGoogleEvent = (session: Session) => {
  return {
    summary: `جلسة قضائية: قضية رقم ${session.caseNumber} (الموكل: ${session.clientName})`,
    description: `المحكمة: ${session.court}\nالدائرة: ${session.circuit}\nالمطلوب/موضوع الجلسة: ${session.objective}\nالقرار بالجلسة: ${session.decision || 'بانتظار القرار'}\n\nتمت المزامنة من برنامج إدارة مكاتب المحاماة التفاعلي.`,
    start: {
      date: session.date, // All-day event
    },
    end: {
      date: getNextDay(session.date),
    },
    colorId: '5', // Yellow/Gold for Sessions
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 1440 }, // 1 day before
        { method: 'popup', minutes: 180 },  // 3 hours before
      ],
    },
  };
};

/**
 * Maps a LegalDeadline (ميعاد إجرائي) to Google Calendar event structure.
 */
const mapDeadlineToGoogleEvent = (deadline: LegalDeadline) => {
  return {
    summary: `ميعاد قانوني حاسم: ${deadline.title} (قضية رقم: ${deadline.caseNumber})`,
    description: `الموكل: ${deadline.clientName}\nتاريخ البدء (الحكم/الإعلان): ${deadline.startDate}\nالسند القانوني المصري: ${deadline.lawReference}\nملاحظات الموعد: ${deadline.notes || 'لا يوجد ملاحظات'}\n\nتنبيه حاسم: هذا موعد سقوط قانوني إجرائي! يرجى تقديمه قبل فوات المأجل.\nتمت المزامنة من برنامج إدارة مكاتب المحاماة التفاعلي.`,
    start: {
      date: deadline.deadlineDate, // All-day event on the final date
    },
    end: {
      date: getNextDay(deadline.deadlineDate),
    },
    colorId: '11', // Red for deadlines
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 2880 }, // 2 days before
        { method: 'popup', minutes: 1440 }, // 1 day before
        { method: 'popup', minutes: 360 },  // 6 hours before
      ],
    },
  };
};

/**
 * Performs a network call to the Google Calendar API to push an event.
 */
export const pushEventToGoogle = async (
  token: string,
  type: 'session' | 'deadline',
  item: any,
  existingGoogleEventId?: string
): Promise<string> => {
  const isUpdate = !!existingGoogleEventId;
  const baseUrl = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  const url = isUpdate ? `${baseUrl}/${existingGoogleEventId}` : baseUrl;
  const method = isUpdate ? 'PUT' : 'POST';

  const body = type === 'session' ? mapSessionToGoogleEvent(item) : mapDeadlineToGoogleEvent(item);

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`فشل الاتصال بتقويم جوجل: ${errText}`);
  }

  const result = await response.json();
  return result.id; // Returns the Google Calendar event ID
};

/**
 * Fetches the user profile info from Google using the OAuth token to show details
 */
export const fetchGoogleUserInfo = async (token: string): Promise<{ name?: string; email?: string } | null> => {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.error('Failed to fetch Google user info', e);
  }
  return null;
};
