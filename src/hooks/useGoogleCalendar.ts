/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useGoogleCalendar — React hook for Google Calendar integration.
 *
 * يوفّر للـ CalendarView:
 *  - state للـ access token و user info و sync status
 *  - OAuth flow: استعادة التوكن من URL hash أو sessionStorage
 *  - `syncItem` لمزامنة جلسة/موعد واحد
 *  - `bulkSync` لمزامنة كل الجلسات والمواعيد دفعة واحدة
 *
 * الـ hook يفصل منطق Google Calendar عن الـ rendering،
 * مما يجعل CalendarView أنظف وأسهل في الاختبار.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getAccessTokenFromHash,
  pushEventToGoogle,
  fetchGoogleUserInfo
} from '../utils/googleCalendarHelper';
import { Session, LegalDeadline } from '../types';
import { showAlert } from '../utils/dialogs';

export interface GoogleCalendarHookOptions {
  sessions: Session[];
  deadlines: LegalDeadline[];
  onUpdateSessionGoogleEventId: (id: string, googleEventId: string) => void;
  onUpdateDeadlineGoogleEventId: (id: string, googleEventId: string) => void;
}

export interface GoogleCalendarHook {
  isConnected: boolean;
  userInfo: { name?: string; email?: string } | null;
  isSyncing: string | null; // item id or 'all'
  syncStatusMsg: string | null;
  syncItem: (type: 'session' | 'deadline', item: any) => Promise<void>;
  bulkSync: () => Promise<void>;
}

export function useGoogleCalendar(opts: GoogleCalendarHookOptions): GoogleCalendarHook {
  const { sessions, deadlines, onUpdateSessionGoogleEventId, onUpdateDeadlineGoogleEventId } = opts;

  // ─── State ──────────────────────────────────────────────────────────────
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [googleUserInfo, setGoogleUserInfo] = useState<{ name?: string; email?: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // ─── OAuth flow: استعادة التوكن من الـ hash أو sessionStorage ────────────
  useEffect(() => {
    const hashData = getAccessTokenFromHash();
    if (hashData) {
      setGoogleAccessToken(hashData.token);
      sessionStorage.setItem('google_access_token', hashData.token);
      sessionStorage.setItem('google_token_expires_at', String(hashData.expiresAt));
    } else {
      const storedToken = sessionStorage.getItem('google_access_token');
      const storedExpiresAt = sessionStorage.getItem('google_token_expires_at');
      if (storedToken && storedExpiresAt && Date.now() < Number(storedExpiresAt)) {
        setGoogleAccessToken(storedToken);
      }
    }
  }, []);

  // ─── Fetch user info when token is set ──────────────────────────────────
  useEffect(() => {
    if (googleAccessToken) {
      fetchGoogleUserInfo(googleAccessToken).then(info => {
        if (info) setGoogleUserInfo(info);
      });
    }
  }, [googleAccessToken]);

  // ─── Sync single item ───────────────────────────────────────────────────
  const syncItem = useCallback(async (type: 'session' | 'deadline', item: any) => {
    if (!googleAccessToken) {
      await showAlert('يرجى الاتصال بحساب جوجل أولاً.');
      return;
    }
    setIsSyncing(item.id);
    try {
      const eventId = await pushEventToGoogle(googleAccessToken, type, item, item.googleEventId);
      if (type === 'session') onUpdateSessionGoogleEventId(item.id, eventId);
      else onUpdateDeadlineGoogleEventId(item.id, eventId);
      setSyncStatusMsg('تمت المزامنة ✓');
      setTimeout(() => setSyncStatusMsg(null), 3000);
    } catch (e: any) {
      await showAlert(`خطأ: ${e.message}`);
    } finally {
      setIsSyncing(null);
    }
  }, [googleAccessToken, onUpdateSessionGoogleEventId, onUpdateDeadlineGoogleEventId]);

  // ─── Bulk sync all un-synced sessions + deadlines ───────────────────────
  const bulkSync = useCallback(async () => {
    if (!googleAccessToken) return;
    setIsSyncing('all');
    let count = 0;
    for (const s of sessions.filter(s => !s.googleEventId)) {
      try {
        const id = await pushEventToGoogle(googleAccessToken, 'session', s);
        onUpdateSessionGoogleEventId(s.id, id);
        count++;
      } catch (e) {
        console.warn('Google sync failed for session', s.id, e);
      }
    }
    for (const dl of deadlines.filter(dl => !dl.googleEventId)) {
      try {
        const id = await pushEventToGoogle(googleAccessToken, 'deadline', dl);
        onUpdateDeadlineGoogleEventId(dl.id, id);
        count++;
      } catch (e) {
        console.warn('Google sync failed for deadline', dl.id, e);
      }
    }
    setSyncStatusMsg(`اكتملت المزامنة: ${count} عنصر`);
    setTimeout(() => setSyncStatusMsg(null), 3000);
    setIsSyncing(null);
  }, [googleAccessToken, sessions, deadlines, onUpdateSessionGoogleEventId, onUpdateDeadlineGoogleEventId]);

  return {
    isConnected: !!googleAccessToken,
    userInfo: googleUserInfo,
    isSyncing,
    syncStatusMsg,
    syncItem,
    bulkSync
  };
}
