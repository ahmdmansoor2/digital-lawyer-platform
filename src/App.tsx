/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * App.tsx — Top-level orchestrator (state + handlers).
 *
 * بعد الـ refactor في v2.6.0:
 *  - كل الـ render (sidebar, tabs, modals) انتقل إلى `components/AppLayout.tsx`.
 *  - `components/PrintPageFallback.tsx` يحتوي على standalone print window.
 *  - هذا الملف مسؤول فقط عن: providers, license gate, auth, وحالة التطبيق + handlers.
 *  - الـ data state والـ domain handlers تبقى هنا لأنها مرتبطة بـ IndexedDB/localStorage
 *    وتحتاج to be passed down to the layout.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import LicenseActivation from './components/LicenseActivation';
import PrintPageFallback from './components/PrintPageFallback';
import AppLayout from './components/AppLayout';
import InfoCenter from './components/InfoCenter';
import { useAuth } from './contexts/AuthContext';
import { OfficeProfileProvider, useOfficeProfile } from './contexts/OfficeProfileContext';
import LoginScreen from './components/LoginScreen';
import { registerGlobalPrintHandler, unregisterGlobalPrintHandler } from './utils/printHelper';
import { logger } from './utils/logger';
import { useAppData } from './hooks/useAppData';
import { putIntoStore, removeFromStore } from './utils/indexedDBHelper';
import { handleEntityAction } from './utils/entityHandler';
import { showAlert, showConfirm } from './utils/dialogs';
import { useEntityPersistence } from './hooks/useEntityPersistence';

// mockData imports removed — the useAppData hook now handles mockData seeding
// for all primary entities (cases, clients, bailiffPapers, opponents, sessions,
// transactions, deadlines, tasks, documents).
import { Case, Client, Session, Transaction, LegalDeadline, LawTask, LawDocument, HourLog, Invoice, OfficeProfile, TypographySettings, BailiffPaper, PowerOfAttorney, Opponent, Execution, LegalReference, CaseStatus } from './types';

export default function App({ userUid, onRequestLogin }: { userUid?: string; onRequestLogin?: () => void }) {
  const getLSKey = useCallback((baseKey: string) => {
    return userUid ? `lawfirm_${userUid}_${baseKey}` : `lawfirm_${baseKey}`;
  }, [userUid]);

  // Catch the standalone same-origin print window early to bypass iframe sandbox limits
  if (window.location.search.includes('print=true')) {
    return <PrintPageFallback />;
  }

  // ─── License gate (Electron only) — نظام ترخيص مُحصَّن ────────────────────────
  // التحقق يتم في Main process (electron/main.cjs) وليس هنا فقط
  // الترخيص مربوط بمعرّف الجهاز ويُعاد التحقق منه كل 30 دقيقة
  const isElectron = !!(window as any).electronAPI?.isElectron;
  const [licenseChecked, setLicenseChecked] = useState(!isElectron); // skip in web/dev
  const [licenseData, setLicenseData] = useState<any>(null);
  // ────────────────────────────────────────────────────────────────────────────

  const handleLicenseActivated = useCallback((license: any) => {
    setLicenseData(license);
    setLicenseChecked(true);
  }, []);

  const handleLicenseDeactivated = useCallback(() => {
    setLicenseChecked(false);
    setLicenseData(null);
  }, []);

  // ─── الاستماع لإشعار انتهاء الترخيص أثناء التشغيل ───────────────────────────
  useEffect(() => {
    if (!isElectron) return;
    const api = (window as any).electronAPI;
    if (!api?.license?.onExpired) return;
    // عند انتهاء الترخيص أو إلغائه أثناء التشغيل → إعادة شاشة التفعيل
    api.license.onExpired((_data: any) => {
      setLicenseChecked(false);
      setLicenseData(null);
    });
    return () => {
      if (api?.license?.offExpired) api.license.offExpired();
    };
  }, [isElectron]);

  const [currentPrintJob, setCurrentPrintJob] = useState<{ title: string; htmlContent: string } | null>(null);

  useEffect(() => {
    registerGlobalPrintHandler((title, htmlContent) => {
      setCurrentPrintJob({ title, htmlContent });
    });
    return () => {
      unregisterGlobalPrintHandler();
    };
  }, []);

  const auth = useAuth();
  // v2.9.11: عند المرور عبر FirebaseAuthGate (تسجيل الدخول بحساب Google)
  // نعتبر المستخدم مُصادَقاً حتى بدون جلسة AuthContext المحلية.
  const isAuthenticated = auth.isAuthenticated || !!userUid;

  const getSessionUserName = () => {
    const fbUser = (window as any).__firebaseUser;
    return auth.currentUser?.fullName
      || fbUser?.displayName
      || localStorage.getItem(getLSKey('user_name'))
      || 'المحامي';
  };

  const getSessionUserRole = () => {
    if (auth.currentUser) {
      const role = auth.roles.find(r => auth.currentUser?.roleIds.includes(r.id));
      if (role?.name) return role.name;
    }
    return localStorage.getItem(getLSKey('user_role')) || 'مدير المكتب';
  };

  const [sessionUser, setSessionUser] = useState(() => ({
    role: localStorage.getItem(getLSKey('user_role')) || 'مدير المكتب',
    name: getSessionUserName(),
  }));

  useEffect(() => {
    setSessionUser({
      role: getSessionUserRole(),
      name: getSessionUserName(),
    });
  }, [auth.currentUser, auth.roles]);

  const officeProfileCtx = useOfficeProfile();
  const officeProfile = officeProfileCtx.officeProfile;

  // ─── v2.8.1: Centralized data state from useAppData hook ─────────────────
  // v2.8.3: All 12 entities + isDBLoading are now managed by the hook.
  const {
    data: { cases, clients, bailiffPapers, opponents, sessions, transactions, deadlines, tasks, documents, executions, hourLogs, invoices },
    isDBLoading,
    setCases, setClients, setBailiffPapers, setOpponents,
    setSessions, setTransactions, setDeadlines, setTasks, setDocuments,
    setExecutions, setHourLogs, setInvoices,
  } = useAppData(userUid);

  // v2.9.5: Ref to always hold latest transactions (avoids stale closure in handleSyncCasePaidFees)
  const transactionsRef = useRef(transactions);
  useEffect(() => { transactionsRef.current = transactions; }, [transactions]);

  /**
   * عند تحديث اسم الشريك المُديѡ نُزامن اسم الجلسة وأسماء التقارير أيضاً.
   * هذا يضمن بقاء كل قسم مرتبطاً بآخر قيمة لـ managingPartner.
   */
  const handleUpdateOfficeProfile = useCallback((profile: OfficeProfile) => {
    officeProfileCtx.setOfficeProfile(profile);
    if (profile.managingPartner) {
      const newName = profile.managingPartner;
      setSessionUser(prev => ({ ...prev, name: newName }));
      try { localStorage.setItem(getLSKey('user_name'), newName); } catch (e) { logger.warn('Failed to save user name to localStorage', e); }
    }
  }, [officeProfileCtx, getLSKey]);

  const handleAppLogout = useCallback(() => {
    auth.logout();
    // v2.9.11: عند الدخول بحساب Google — نخرج من Firebase أيضاً ليعود FirebaseAuthGate لشاشة الدخول
    if (userUid) {
      import('firebase/auth').then(({ signOut }) => {
        import('./firebaseClient').then(({ getFirebase }) =>
          getFirebase().then(f => { if (!f.disabled) return signOut(f.auth); })
        ).catch(() => {});
      }).catch(() => {});
    }
    localStorage.removeItem(getLSKey('logged_in'));
    localStorage.removeItem(getLSKey('user_name'));
    localStorage.removeItem(getLSKey('user_role'));
    setPostLoginView('info-center');
  }, [auth, getLSKey, userUid]);

  const [typographySettings, setTypographySettings] = useState<TypographySettings>(() => {
    const saved = localStorage.getItem(getLSKey('typography_settings'));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.fontFamily) {
          return {
            fontFamily: parsed.fontFamily,
            fontSizeMultiplier: parsed.fontSizeMultiplier || 1.0,
            textColor: parsed.textColor || '#0f172a'
          };
        }
      } catch (e) {}
    }
    return {
      fontFamily: 'Cairo',
      fontSizeMultiplier: 1.0,
      textColor: '#0f172a'
    };
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'cases' | 'clients' | 'opponents' | 'notes' | 'calendar' | 'templates' | 'contract-generator' | 'inheritance-calculator' | 'court-fees-calculator' | 'legal-library' | 'financials' | 'tasks' | 'documents' | 'database' | 'settings' | 'archive' | 'reports' | 'bailiff-papers' | 'executions' | 'users' | 'roles' | 'security'>('dashboard');
  const [postLoginView, setPostLoginView] = useState<'info-center' | 'app'>('info-center');
  const [tabHistory, setTabHistory] = useState<string[]>(['dashboard']);
  const [tabHistoryIndex, setTabHistoryIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [appTheme, setAppTheme] = useState<'slate' | 'golden' | 'dark' | 'palace' | 'modern' | 'natural' | 'night' | 'cobalt' | 'wine' | 'carbon' | 'ivory' | 'sapphire' | 'rose'>(() => {
    const saved = localStorage.getItem(getLSKey('app_theme'));
    return (saved as any) || 'slate';
  });
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    setIsInIframe(window.self !== window.top);
  }, []);

  const [enabledMenus, setEnabledMenus] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem(getLSKey('enabled_menus'));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        parsed.dashboard = true;
        parsed.settings = true;
        parsed['bailiff-papers'] = true;
        parsed.executions = true;
        return parsed;
      } catch (e) {}
    }
    return {
      dashboard: true,
      cases: true,
clients: true,
        opponents: true,
        notes: true,
        calendar: true,
      tasks: true,
      documents: true,
      'bailiff-papers': true,
      templates: true,
      'contract-generator': true,
      'inheritance-calculator': true,
      'court-fees-calculator': true,
      'legal-library': true,
      financials: true,
      database: true,
      settings: true,
      archive: true,
      reports: true,
      executions: true
    };
  });

  // Central Application State (all 12 entities + isDBLoading moved to useAppData hook
  // at the top of this function — see "Centralized data state")

  // ─── Browser notifications for upcoming sessions ───────────────────────────
  useEffect(() => {
    if (!('Notification' in window)) return;
    let interval: ReturnType<typeof setInterval> | null = null;

    const checkSessions = () => {
      if (Notification.permission === 'granted') {
        const alarmSettings = localStorage.getItem('lawfirm_alarm_settings');
        const sessionAutoReminder = alarmSettings ? JSON.parse(alarmSettings).sessionAutoReminder : true;
        if (!sessionAutoReminder) return;

        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        sessions.forEach(s => {
          if (s.status !== 'قادمة') return;
          const sessionDate = new Date(s.date + 'T00:00:00');
          const diffMs = sessionDate.getTime() - now.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);
          if (diffHours >= 0 && diffHours <= 24) {
            new Notification('🔔 تذكير بجلسة قادمة', {
              body: `رقم القضية: ${s.caseNumber}\nالتاريخ: ${s.date}\nالمحكمة: ${s.court}\nالهدف: ${s.objective}`,
              silent: false,
            });
          }
        });
      } else if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    };

    // Delay initial check to allow app to fully load
    const initialTimeout = setTimeout(checkSessions, 5000);
    interval = setInterval(checkSessions, 30 * 60 * 1000); // every 30 minutes

    return () => {
      clearTimeout(initialTimeout);
      if (interval) clearInterval(interval);
    };
  }, [sessions]);

  // ─── Persistence useEffects → useEntityPersistence (v2.8.9) ───────────────
  // Old: 12 useEffect blocks × 5 lines each = 60+ lines of duplicated code.
  // New: one hook call per entity. Cleaner + DRY + testable.

  useEntityPersistence(getLSKey('sessions'), 'sessions', sessions, isDBLoading);
  useEntityPersistence(getLSKey('cases'), 'cases', cases, isDBLoading);
  useEntityPersistence(getLSKey('clients'), 'clients', clients, isDBLoading);
  useEntityPersistence(getLSKey('bailiff_papers'), 'bailiff_papers', bailiffPapers, isDBLoading);
  useEntityPersistence(getLSKey('opponents'), 'opponents', opponents, isDBLoading);
  useEntityPersistence(getLSKey('transactions'), 'transactions', transactions, isDBLoading);
  useEntityPersistence(getLSKey('deadlines'), 'deadlines', deadlines, isDBLoading);
  useEntityPersistence(getLSKey('tasks'), 'tasks', tasks, isDBLoading);
  useEntityPersistence(getLSKey('documents'), 'documents', documents, isDBLoading);
  useEntityPersistence(getLSKey('executions'), 'executions', executions, isDBLoading);
  useEntityPersistence(getLSKey('hour_logs'), 'hour_logs', hourLogs, isDBLoading);
  useEntityPersistence(getLSKey('invoices'), 'invoices', invoices, isDBLoading);

  // ─── Persist typography & theme to localStorage ──────────────────────────
  useEffect(() => {
    localStorage.setItem(getLSKey('typography_settings'), JSON.stringify(typographySettings));
  }, [typographySettings, getLSKey]);

  useEffect(() => {
    localStorage.setItem(getLSKey('app_theme'), appTheme);
  }, [appTheme, getLSKey]);

  // Dynamic background mapping
  const getThemeBgClass = () => {
    switch (appTheme) {
      case 'golden':
        return 'bg-[#FFFDF9] text-[#422006]';
      case 'dark':
        return 'bg-[#030712] text-[#f8fafc]';
      case 'palace':
        return 'bg-[#f8fafc] text-slate-900';
      case 'modern':
        return 'bg-[#F7F6F3] text-[#1c1917]';
      case 'natural':
        return 'bg-[#F8F6F1] text-[#292524]';
      case 'night':
        return 'bg-[#07051a] text-[#e8e4f0]';
      case 'cobalt':
        return 'bg-[#f0f4ff] text-[#1e1b4b]';
      case 'wine':
        return 'bg-[#fdf2f5] text-[#2e0a1a]';
      case 'carbon':
        return 'bg-[#0c0c0e] text-[#f4f4f5]';
      case 'ivory':
        return 'bg-[#fdfcf7] text-[#292524]';
      case 'sapphire':
        return 'bg-[#0a1628] text-[#e0eeff]';
      case 'rose':
        return 'bg-[#fff5f7] text-[#2d0a14]';
      default:
        return 'bg-[#f0f2f5] text-slate-800';
    }
  };

  // Drilldown / navigation focus states
  const [drillCaseId, setDrillCaseId] = useState<string | undefined>(undefined);

  // 1. Cases Mutations
  const handleAddCase = (newCase: Case) => {
    // ─── التحقق من حد الترخيص (maxCases) ──────────────────────────────────────
    // لا يُطبَّق إلا في Electron مع ترخيص فعّل يحتوي maxCases.
    // في المتصفح/التطوير: لا قيود.
    const max = licenseData?.maxCases;
    if (max != null && max < 9999 && cases.length >= max) {
      showAlert(`⚠️ وصلتَ إلى الحد الأقصى لعدد القضايا (${max} قضية) حسب خطتك الحالية.\nلتسجيل قضايا إضافية يرجى ترقية الخطة أو التواصل مع الدعم.`);
      return;
    }
    handleEntityAction(setCases, 'add', newCase, 'cases', 'lawfirm_cases', {
      logContext: 'add case',
    });
  };

  const handleUpdateCase = (updatedCase: Case) => {
    handleEntityAction(setCases, 'update', updatedCase, 'cases', 'lawfirm_cases', {
      logContext: 'update case',
    });
  };

  const handleDeleteCase = async (id: string) => {
    const upcomingSessions = sessions.filter(s => s.caseId === id && s.date >= new Date().toISOString().split('T')[0] && s.status !== 'منتهية');
    if (upcomingSessions.length > 0) {
      const ok = await showConfirm(`⚠️ تحذير: لهذه القضية ${upcomingSessions.length} جلسة قادمة. سيتم حذفها جميعاً. هل تريد المتابعة؟`);
      if (!ok) return;
    }
    setCases(prev => prev.filter(c => c.id !== id));
    removeFromStore('cases', id).catch(e => logger.error('IndexedDB sync failed (delete case):', e));
    // clean nested states
    const relatedSessions = sessions.filter(s => s.caseId === id);
    const relatedTransactions = transactions.filter(t => t.caseId === id);
    const relatedTasks = tasks.filter(t => t.caseId === id);
    const relatedDocs = documents.filter(d => d.caseId === id);
    setSessions(prev => prev.filter(s => s.caseId !== id));
    setTransactions(prev => prev.filter(t => t.caseId !== id));
    setDeadlines(prev => prev.filter(d => d.caseId !== id));
    setTasks(prev => prev.filter(t => t.caseId !== id));
    setDocuments(prev => prev.filter(d => d.caseId !== id));
    relatedSessions.forEach(s => removeFromStore('sessions', s.id).catch(e => logger.error('IndexedDB sync failed (delete cascade session):', e)));
    relatedTransactions.forEach(t => removeFromStore('transactions', t.id).catch(e => logger.error('IndexedDB sync failed (delete cascade transaction):', e)));
    relatedTasks.forEach(t => removeFromStore('tasks', t.id).catch(e => logger.error('IndexedDB sync failed (delete cascade task):', e)));
    relatedDocs.forEach(d => removeFromStore('documents', d.id).catch(e => logger.error('IndexedDB sync failed (delete cascade document):', e)));
  };

  const handleLinkLegalReference = (caseId: string, ref: LegalReference) => {
    // v2.9.6: anti-pattern fix — was doing putIntoStore inside the setCases updater
    // (could fire multiple times in StrictMode). Now we find the target, build the
    // updated case, and let the helper handle state + IDB + localStorage in one shot.
    const target = cases.find(c => c.id === caseId);
    if (!target) return;
    const updated: Case = {
      ...target,
      legalReferences: [...(target.legalReferences || []), ref],
    };
    handleEntityAction(setCases, 'update', updated, 'cases', 'lawfirm_cases', {
      logContext: 'link legal reference',
    });
  };

  // 2. Clients Mutations
  const handleAddClient = (newClient: Client) => {
    handleEntityAction(setClients, 'add', newClient, 'clients', 'lawfirm_clients', {
      logContext: 'add client',
    });
  };

  const handleUpdateClient = (updatedClient: Client) => {
    handleEntityAction(setClients, 'update', updatedClient, 'clients', 'lawfirm_clients', {
      logContext: 'update client',
    });
  };

  const handleDeleteClient = async (id: string) => {
    const activeCases = cases.filter(c => c.clientId === id && c.status !== CaseStatus.CLOSED);
    if (activeCases.length > 0) {
      const ok = await showConfirm(`⚠️ تحذير: للموكل ${activeCases.length} قضية نشطة. سيتم حذف جميع القضايا والجلسات والمعاملات المرتبطة. هل تريد المتابعة؟`);
      if (!ok) return;
    }
    setClients(prev => prev.filter(c => c.id !== id));
    // Clean related cases and their nested data
    const relatedCaseIds = cases.filter(c => c.clientId === id).map(c => c.id);
    if (relatedCaseIds.length > 0) {
      const relatedSessions = sessions.filter(s => relatedCaseIds.includes(s.caseId));
      const relatedTransactions = transactions.filter(t => t.caseId && relatedCaseIds.includes(t.caseId));
      const relatedTasks = tasks.filter(t => relatedCaseIds.includes(t.caseId));
      const relatedDocs = documents.filter(d => d.caseId && relatedCaseIds.includes(d.caseId));
      setCases(prev => prev.filter(c => !relatedCaseIds.includes(c.id)));
      setSessions(prev => prev.filter(s => !relatedCaseIds.includes(s.caseId)));
      setTransactions(prev => prev.filter(t => t.caseId && !relatedCaseIds.includes(t.caseId)));
      setDeadlines(prev => prev.filter(d => !relatedCaseIds.includes(d.caseId)));
      setTasks(prev => prev.filter(t => !relatedCaseIds.includes(t.caseId)));
      setDocuments(prev => prev.filter(d => d.caseId && !relatedCaseIds.includes(d.caseId)));
      relatedCaseIds.forEach(caseId => {
        removeFromStore('cases', caseId).catch(e => logger.error('Failed to remove related case from IndexedDB', e));
      });
      relatedSessions.forEach(s => removeFromStore('sessions', s.id).catch(e => logger.error('IndexedDB sync failed (cascade session):', e)));
      relatedTransactions.forEach(t => removeFromStore('transactions', t.id).catch(e => logger.error('IndexedDB sync failed (cascade transaction):', e)));
      relatedTasks.forEach(t => removeFromStore('tasks', t.id).catch(e => logger.error('IndexedDB sync failed (cascade task):', e)));
      relatedDocs.forEach(d => removeFromStore('documents', d.id).catch(e => logger.error('IndexedDB sync failed (cascade document):', e)));
    }
    removeFromStore('clients', id).catch(e => logger.error('IndexedDB sync failed (delete client):', e));
  };

  const handleAddPoaFromClient = (clientId: string, poa: PowerOfAttorney) => {
    // v2.9.6: anti-pattern fix — was calling putIntoStore inside the setClients
    // updater, which could fire multiple times in React StrictMode. Now we build
    // the updated client once and delegate to the unified helper.
    const target = clients.find(c => c.id === clientId);
    if (!target) return;
    const updated: Client = {
      ...target,
      poas: [...target.poas, poa],
    };
    handleEntityAction(setClients, 'update', updated, 'clients', 'lawfirm_clients', {
      logContext: 'add poa',
    });
  };

  // 2.5 Bailiff Papers Mutations
  const handleAddBailiffPaper = (newPaper: BailiffPaper) => {
    handleEntityAction(setBailiffPapers, 'add', newPaper, 'bailiff_papers', undefined, {
      logContext: 'add paper',
      skipLocalStorage: true, // useEntityPersistence covers it
    });
  };

  const handleUpdateBailiffPaper = (updatedPaper: BailiffPaper) => {
    handleEntityAction(setBailiffPapers, 'update', updatedPaper, 'bailiff_papers', undefined, {
      logContext: 'update paper',
      skipLocalStorage: true,
    });
  };

  const handleDeleteBailiffPaper = (id: string) => {
    handleEntityAction(setBailiffPapers, 'delete', { id } as BailiffPaper, 'bailiff_papers', undefined, {
      logContext: 'delete paper',
      skipLocalStorage: true,
    });
  };

  // 2.75 Opponents Mutations
  const handleAddOpponent = (newOpponent: Opponent) => {
    handleEntityAction(setOpponents, 'add', newOpponent, 'opponents', undefined, {
      logContext: 'add opponent',
      skipLocalStorage: true,
    });
  };

  const handleUpdateOpponent = (updatedOpponent: Opponent) => {
    handleEntityAction(setOpponents, 'update', updatedOpponent, 'opponents', undefined, {
      logContext: 'update opponent',
      skipLocalStorage: true,
    });
    // Sync opponent name in all related cases and persist to IDB
    const relatedCases = cases.filter(c => c.opponentId === updatedOpponent.id);
    if (relatedCases.length > 0) {
      setCases(prev => prev.map(c => c.opponentId === updatedOpponent.id ? { ...c, opponentName: updatedOpponent.fullName } : c));
      relatedCases.forEach(c => putIntoStore('cases', { ...c, opponentName: updatedOpponent.fullName }).catch(e => logger.error('IndexedDB sync failed (update opponent in case):', e)));
    }
  };

  const handleDeleteOpponent = (id: string) => {
    handleEntityAction(setOpponents, 'delete', { id } as Opponent, 'opponents', undefined, {
      logContext: 'delete opponent',
      skipLocalStorage: true,
    });
    // Clear opponentId from related cases
    setCases(prev => prev.map(c => c.opponentId === id ? { ...c, opponentId: undefined } : c));
  };

  // 3. Sessions & Decisions Mutations
  const handleAddSessionFromCase = (newSession: Session) => {
    setSessions(prev => [newSession, ...prev]);
  };

  const handleUpdateSession = (updatedSession: Session) => {
    setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
  };

  const handleDeleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    removeFromStore('sessions', id).catch(e => logger.error('IndexedDB sync failed (delete session):', e));
  };

  const handleUpdateSessionDecision = (sessionId: string, decision: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          decision: decision,
          status: 'منتهية' as const
        };
      }
      return s;
    }));
  };

  const handleUpdateSessionGoogleEventId = (sessionId: string, googleEventId: string) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, googleEventId } : s));
  };

  const handleUpdateDeadlineGoogleEventId = (deadlineId: string, googleEventId: string) => {
    setDeadlines(prev => prev.map(dl => dl.id === deadlineId ? { ...dl, googleEventId } : dl));
  };

  // 4. Financials Ledger Mutations
  const handleAddTransaction = (newTx: Transaction) => {
    handleEntityAction(setTransactions, 'add', newTx, 'transactions', 'lawfirm_transactions', {
      logContext: 'add transaction',
    });
  };

  const handleDeleteTransaction = (id: string) => {
    handleEntityAction(setTransactions, 'delete', { id } as Transaction, 'transactions', 'lawfirm_transactions', {
      logContext: 'delete transaction',
    });
  };

  const handleUpdateTransaction = (updatedTx: Transaction) => {
    handleEntityAction(setTransactions, 'update', updatedTx, 'transactions', 'lawfirm_transactions', {
      logContext: 'update transaction',
    });
  };

  // Sync all Case.paidFees from "أتعاب" income transactions (manual trigger)
  // v2.9.5: Use transactionsRef to always get latest transactions (avoids stale closure)
  const handleSyncCasePaidFees = useCallback(() => {
    const latestTransactions = transactionsRef.current;
    setCases(prev => {
      const updatedCases = prev.map(c => {
        const totalPaid = latestTransactions
          .filter(t => t.caseId === c.id && t.type === 'أتعاب' && t.ioType.includes('وارد'))
          .reduce((sum, t) => sum + t.amount, 0);
        return { ...c, paidFees: totalPaid, updatedAt: new Date().toISOString() };
      });
      try {
        localStorage.setItem('lawfirm_cases', JSON.stringify(updatedCases));
        logger.info(`[sync] Saved ${updatedCases.length} cases to localStorage with updated paidFees`);
      } catch (e) { logger.warn('Failed to save synced cases to localStorage', e); }
      updatedCases.forEach(c => {
        putIntoStore('cases', c).catch(e => logger.error('IndexedDB sync failed (sync paidFees):', e));
      });
      return updatedCases;
    });
  }, []);

  // 5. Deadlines Mutations
  const handleAddDeadline = (newDeadline: LegalDeadline) => {
    setDeadlines(prev => [newDeadline, ...prev]);
  };

  const handleToggleDeadlineComplete = (id: string) => {
    setDeadlines(prev => prev.map(dl => {
      if (dl.id === id) {
        return { ...dl, isCompleted: !dl.isCompleted };
      }
      return dl;
    }));
  };

  // 6. Execution Mutations
  const handleAddExecution = (execution: Execution) => {
    setExecutions(prev => [execution, ...prev]);
    putIntoStore('executions', execution).catch(e => logger.error('IndexedDB sync failed (add execution):', e));
  };
  const handleUpdateExecution = (updated: Execution) => {
    setExecutions(prev => prev.map(e => e.id === updated.id ? updated : e));
    putIntoStore('executions', updated).catch(e => logger.error('IndexedDB sync failed (update execution):', e));
  };
  const handleDeleteExecution = (id: string) => {
    setExecutions(prev => prev.filter(e => e.id !== id));
    removeFromStore('executions', id).catch(e => logger.error('IndexedDB sync failed (delete execution):', e));
  };

  const handleAddTask = (newTask: LawTask) => {
    setTasks(prev => [newTask, ...prev]);
  };

  const handleToggleTaskStatus = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t));
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    removeFromStore('tasks', id).catch(e => logger.error('IndexedDB sync failed (delete task):', e));
  };

  const handleUpdateTask = (updatedTask: LawTask) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  // 7. Documents Mutations
  const handleAddDocument = (newDoc: LawDocument) => {
    // ─── التحقق من حد الترخيص (maxFiles) ───────────────────────────────────
    const max = licenseData?.maxFiles;
    if (max != null && max < 9999 && documents.length >= max) {
      showAlert(`⚠️ وصلتَ إلى الحد الأقصى لعدد الملفات (${max} ملف) حسب خطتك الحالية.\nلإضافة ملفات إضافية يرجى ترقية الخطة أو التواصل مع الدعم.`);
      return;
    }
    setDocuments(prev => [newDoc, ...prev]);
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    removeFromStore('documents', id).catch(e => logger.error('IndexedDB sync failed (delete document):', e));
  };

  const handleUpdateDocument = (updatedDoc: LawDocument) => {
    setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
  };

  // 7.5 Archive & Restore Mutations
  // v2.9.6: anti-pattern fix — all six handlers used to call putIntoStore + localStorage
  // inside the setX updater. Now they build the updated entity once and delegate to
  // the unified helper, eliminating the StrictMode double-fire risk.
  const handleArchiveCase = (id: string) => {
    const target = cases.find(c => c.id === id);
    if (!target) return;
    const updated: Case = { ...target, isArchived: true, archivedAt: new Date().toISOString().split('T')[0] };
    handleEntityAction(setCases, 'update', updated, 'cases', 'lawfirm_cases', {
      logContext: 'archive case',
    });
  };

  const handleRestoreCase = (id: string) => {
    const target = cases.find(c => c.id === id);
    if (!target) return;
    const updated: Case = { ...target, isArchived: false, archivedAt: undefined };
    handleEntityAction(setCases, 'update', updated, 'cases', 'lawfirm_cases', {
      logContext: 'restore case',
    });
  };

  const handleArchiveClient = (id: string) => {
    const target = clients.find(cl => cl.id === id);
    if (!target) return;
    const updated: Client = { ...target, isArchived: true, archivedAt: new Date().toISOString().split('T')[0] };
    handleEntityAction(setClients, 'update', updated, 'clients', 'lawfirm_clients', {
      logContext: 'archive client',
    });
  };

  const handleRestoreClient = (id: string) => {
    const target = clients.find(cl => cl.id === id);
    if (!target) return;
    const updated: Client = { ...target, isArchived: false, archivedAt: undefined };
    handleEntityAction(setClients, 'update', updated, 'clients', 'lawfirm_clients', {
      logContext: 'restore client',
    });
  };

  const handleArchiveDocument = (id: string) => {
    const target = documents.find(d => d.id === id);
    if (!target) return;
    const updated: LawDocument = { ...target, isArchived: true, archivedAt: new Date().toISOString().split('T')[0] };
    handleEntityAction(setDocuments, 'update', updated, 'documents', 'lawfirm_documents', {
      logContext: 'archive document',
    });
  };

  const handleRestoreDocument = (id: string) => {
    const target = documents.find(d => d.id === id);
    if (!target) return;
    const updated: LawDocument = { ...target, isArchived: false, archivedAt: undefined };
    handleEntityAction(setDocuments, 'update', updated, 'documents', 'lawfirm_documents', {
      logContext: 'restore document',
    });
  };

  // 8. Hour Logs mutations
  const handleAddHourLog = (newLog: HourLog) => {
    setHourLogs(prev => [newLog, ...prev]);
  };

  const handleDeleteHourLog = (id: string) => {
    setHourLogs(prev => prev.filter(l => l.id !== id));
    removeFromStore('hour_logs', id).catch(e => logger.error('IndexedDB sync failed (delete hour log):', e));
  };

  // 9. Invoices mutations
  const handleAddInvoice = (newInv: Invoice) => {
    const includedLogIds = newInv.hourLogs.map(l => l.id);
    setHourLogs(prev => prev.map(log => {
      if (includedLogIds.includes(log.id)) {
        return { ...log, isBilled: true, invoiceId: newInv.id };
      }
      return log;
    }));
    setInvoices(prev => [newInv, ...prev]);
  };

  const handleUpdateInvoiceStatus = (id: string, status: 'غير مدفوعة' | 'مدفوعة بالكامل' | 'ملغاة') => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
        if (status === 'مدفوعة بالكامل' && inv.status !== 'مدفوعة بالكامل') {
          const newTx: Transaction = {
            id: 'tx_inv_auto_' + Date.now(),
            caseId: inv.hourLogs[0]?.caseId || undefined,
            caseNumber: inv.hourLogs[0]?.caseNumber || undefined,
            clientName: inv.clientName,
            type: 'أتعاب',
            ioType: 'وارد (income)',
            amount: inv.grandTotal,
            date: new Date().toISOString().split('T')[0],
            description: `أتعاب ساعات الفاتورة الضريبية رقم ${inv.id} - تسوية سداد كاملة`,
            paymentMethod: 'تحويل بنكي'
          };
          handleAddTransaction(newTx);

          // Sync case paidFees when invoice is paid
          const caseId = inv.hourLogs[0]?.caseId;
          if (caseId) {
            setCases(prev => prev.map(c => {
              if (c.id === caseId) {
                return { ...c, paidFees: c.paidFees + inv.grandTotal, updatedAt: new Date().toISOString() };
              }
              return c;
            }));
          }
        }

        if (status === 'ملغاة') {
          const releasedLogIds = inv.hourLogs.map(l => l.id);
          setHourLogs(prev => prev.map(log => {
            if (releasedLogIds.includes(log.id)) {
              return { ...log, isBilled: false, invoiceId: undefined };
            }
            return log;
          }));
        }

        return { ...inv, status: status };
      }
      return inv;
    }));
  };

  // Central Navigation & History Handler
  const handleNavigate = (tab: any) => {
    if (tab === 'back') {
      if (tabHistoryIndex > 0) {
        const prevIndex = tabHistoryIndex - 1;
        setTabHistoryIndex(prevIndex);
        setActiveTab(tabHistory[prevIndex] as any);
      }
    } else if (tab === 'forward') {
      if (tabHistoryIndex < tabHistory.length - 1) {
        const nextIndex = tabHistoryIndex + 1;
        setTabHistoryIndex(nextIndex);
        setActiveTab(tabHistory[nextIndex] as any);
      }
    } else if (tab === 'home') {
      setActiveTab('dashboard');
      setTabHistory(['dashboard']);
      setTabHistoryIndex(0);
    } else {
      const newHistory = tabHistory.slice(0, tabHistoryIndex + 1);
      if (newHistory[newHistory.length - 1] !== tab) {
        newHistory.push(tab);
      }
      setTabHistory(newHistory);
      setTabHistoryIndex(newHistory.length - 1);
      setActiveTab(tab);
    }
  };

  // Switch to specific case card inside Cases tab directly
  const handleDrillCaseSelection = (caseId: string) => {
    setDrillCaseId(caseId);
    handleNavigate('cases');
  };

  // Preset Navigation Actions
  const handleShortcutNavigation = (tab: any, caseId?: string) => {
    handleNavigate(tab);
    if (caseId) {
      setDrillCaseId(caseId);
    } else {
      setDrillCaseId(undefined); // reset
    }
  };

  if (isElectron && !licenseChecked) {
    return (
      <LicenseActivation
        onActivated={handleLicenseActivated}
      />
    );
  }

  if (!isAuthenticated) {
    // v2.18: على الويب (عبر FirebaseAuthGate) الموقع عام — الزائر يرى InfoCenter
    // بدون تسجيل دخول، وزر «دخول التطبيق» يفتح شاشة الدخول للمنصة فقط.
    if (onRequestLogin) {
      return (
        <InfoCenter
          userName={undefined}
          onEnterApp={onRequestLogin}
          onLogout={() => {}}
        />
      );
    }
    // وضع Electron: شاشة الدخول المحلية القديمة كما هي
    return (
      <LoginScreen
        onLoginSuccess={(role, name) => {
          setSessionUser({ role, name });
          setPostLoginView('info-center');
        }}
      />
    );
  }

  // بعد تسجيل الدخول: مركز المعلومات هو الصفحة الأولى
  if (postLoginView === 'info-center') {
    return (
      <InfoCenter
        userName={sessionUser?.name}
        onEnterApp={() => setPostLoginView('app')}
        onLogout={() => {
          auth.logout();
          if (userUid) {
            import('firebase/auth').then(({ signOut }) => {
              import('./firebaseClient').then(({ getFirebase }) =>
                getFirebase().then(f => { if (!f.disabled) return signOut(f.auth); })
              ).catch(() => {});
            }).catch(() => {});
          }
          localStorage.removeItem(getLSKey('logged_in'));
          localStorage.removeItem(getLSKey('user_name'));
          localStorage.removeItem(getLSKey('user_role'));
          setPostLoginView('app');
        }}
      />
    );
  }

  return (
    <AppLayout
      onShowInfoCenter={() => setPostLoginView('info-center')}
      // ─── Data ───────────────────────────────────────────────────────
      cases={cases}
      clients={clients}
      opponents={opponents}
      bailiffPapers={bailiffPapers}
      sessions={sessions}
      transactions={transactions}
      deadlines={deadlines}
      tasks={tasks}
      documents={documents}
      executions={executions}
      hourLogs={hourLogs}
      invoices={invoices}
      // ─── Configuration ──────────────────────────────────────────────
      officeProfile={officeProfile}
      sessionUser={sessionUser}
      enabledMenus={enabledMenus}
      appTheme={appTheme}
      typographySettings={typographySettings}
      // ─── Navigation state ───────────────────────────────────────────
      activeTab={activeTab}
      drillCaseId={drillCaseId}
      mobileMenuOpen={mobileMenuOpen}
      currentPrintJob={currentPrintJob}
      // ─── Setters ────────────────────────────────────────────────────
      setMobileMenuOpen={setMobileMenuOpen}
      setAppTheme={setAppTheme}
      setEnabledMenus={setEnabledMenus}
      setTypographySettings={setTypographySettings}
      setDrillCaseId={setDrillCaseId}
      onLogout={handleAppLogout}
      setCurrentPrintJob={setCurrentPrintJob}
      setCases={setCases}
      setClients={setClients}
      setSessions={setSessions}
      setTransactions={setTransactions}
      setDeadlines={setDeadlines}
      setTasks={setTasks}
      setDocuments={setDocuments}
      // ─── Domain handlers (Cases) ────────────────────────────────────
      onAddCase={handleAddCase}
      onUpdateCase={handleUpdateCase}
      onDeleteCase={handleDeleteCase}
      onArchiveCase={handleArchiveCase}
      onRestoreCase={handleRestoreCase}
      onSyncCasePaidFees={handleSyncCasePaidFees}
      // ─── Domain handlers (Clients) ──────────────────────────────────
      onAddClient={handleAddClient}
      onUpdateClient={handleUpdateClient}
      onDeleteClient={handleDeleteClient}
      onArchiveClient={handleArchiveClient}
      onRestoreClient={handleRestoreClient}
      onAddPoaFromClient={handleAddPoaFromClient}
      // ─── Domain handlers (Opponents) ────────────────────────────────
      onAddOpponent={handleAddOpponent}
      onUpdateOpponent={handleUpdateOpponent}
      onDeleteOpponent={handleDeleteOpponent}
      // ─── Domain handlers (Bailiff) ──────────────────────────────────
      onAddBailiffPaper={handleAddBailiffPaper}
      onUpdateBailiffPaper={handleUpdateBailiffPaper}
      onDeleteBailiffPaper={handleDeleteBailiffPaper}
      // ─── Domain handlers (Sessions) ─────────────────────────────────
      onAddSession={handleAddSessionFromCase}
      onUpdateSession={handleUpdateSession}
      onDeleteSession={handleDeleteSession}
      onUpdateSessionDecision={handleUpdateSessionDecision}
      onUpdateSessionGoogleEventId={handleUpdateSessionGoogleEventId}
      onUpdateDeadlineGoogleEventId={handleUpdateDeadlineGoogleEventId}
      // ─── Domain handlers (Financials) ───────────────────────────────
      onAddTransaction={handleAddTransaction}
      onUpdateTransaction={handleUpdateTransaction}
      onDeleteTransaction={handleDeleteTransaction}
      // ─── Domain handlers (Deadlines) ────────────────────────────────
      onAddDeadline={handleAddDeadline}
      onToggleDeadlineComplete={handleToggleDeadlineComplete}
      // ─── Domain handlers (Tasks) ────────────────────────────────────
      onAddTask={handleAddTask}
      onToggleTaskStatus={handleToggleTaskStatus}
      onDeleteTask={handleDeleteTask}
      onUpdateTask={handleUpdateTask}
      // ─── Domain handlers (Executions) ───────────────────────────────
      onAddExecution={handleAddExecution}
      onUpdateExecution={handleUpdateExecution}
      onDeleteExecution={handleDeleteExecution}
      // ─── Domain handlers (Documents) ────────────────────────────────
      onAddDocument={handleAddDocument}
      onDeleteDocument={handleDeleteDocument}
      onUpdateDocument={handleUpdateDocument}
      onArchiveDocument={handleArchiveDocument}
      onRestoreDocument={handleRestoreDocument}
      // ─── Domain handlers (Hour logs / Invoices) ─────────────────────
      onAddHourLog={handleAddHourLog}
      onDeleteHourLog={handleDeleteHourLog}
      onAddInvoice={handleAddInvoice}
      onUpdateInvoiceStatus={handleUpdateInvoiceStatus}
      // ─── Navigation & misc ──────────────────────────────────────────
      onNavigate={handleNavigate}
      onDrillCase={handleDrillCaseSelection}
      onUpdateOfficeProfile={handleUpdateOfficeProfile}
      onLinkLegalReference={handleLinkLegalReference}
      onLicenseDeactivated={handleLicenseDeactivated}
    />
  );
}
