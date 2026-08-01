/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useAppData.ts — Central data loading + state management hook.
 *
 * v2.9.11: Dynamic user UID isolation for both localStorage and IndexedDB.
 */

import { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';
import {
  Case, Client, Session, Transaction, LegalDeadline, LawTask, LawDocument,
  OfficeProfile, HourLog, Invoice, Execution, BailiffPaper, Opponent
} from '../types';
import {
  syncAndLoadApplicationData, getAllFromStore, setFirebaseUserUid
} from '../utils/indexedDBHelper';
import { runLocalStorageToIndexedDBMigration, isMigrationDone } from '../utils/migrationHelper';
import { cleanCaseData, cleanClientData, cleanSessionData, cleanDeadlineData, cleanTaskData } from '../utils/dataSanitizer';
import { logger } from '../utils/logger';
import {
  mockCases, mockClients, mockOpponents, mockSessions,
  mockTransactions, mockDeadlines, mockTasks, mockDocuments,
  mockExecutions, mockHourLogs, mockInvoices
} from '../data/mockData';

export interface AppData {
  cases: Case[];
  clients: Client[];
  bailiffPapers: BailiffPaper[];
  opponents: Opponent[];
  sessions: Session[];
  transactions: Transaction[];
  deadlines: LegalDeadline[];
  tasks: LawTask[];
  documents: LawDocument[];
  executions: Execution[];
  hourLogs: HourLog[];
  invoices: Invoice[];
}

export interface AppDataState {
  data: AppData;
  isDBLoading: boolean;
  officeProfile: OfficeProfile;
  setOfficeProfile: (p: OfficeProfile) => void;
  enabledMenus: Record<string, boolean>;
  setEnabledMenus: (m: Record<string, boolean>) => void;
  typographySettings: any;
  setTypographySettings: (s: any) => void;
  feeSettings: any;
  setFeeSettings: (s: any) => void;
  alarmSettings: any;
  setAlarmSettings: (s: any) => void;
  users: any[];
  setUsers: (u: any[]) => void;
  archiveSeasons: any[];
  setArchiveSeasons: (a: any[]) => void;
  notes: any;
  setNotes: (n: any) => void;
  setCases: Dispatch<SetStateAction<Case[]>>;
  setClients: Dispatch<SetStateAction<Client[]>>;
  setBailiffPapers: Dispatch<SetStateAction<BailiffPaper[]>>;
  setOpponents: Dispatch<SetStateAction<Opponent[]>>;
  setSessions: Dispatch<SetStateAction<Session[]>>;
  setTransactions: Dispatch<SetStateAction<Transaction[]>>;
  setDeadlines: Dispatch<SetStateAction<LegalDeadline[]>>;
  setTasks: Dispatch<SetStateAction<LawTask[]>>;
  setDocuments: Dispatch<SetStateAction<LawDocument[]>>;
  setExecutions: Dispatch<SetStateAction<Execution[]>>;
  setHourLogs: Dispatch<SetStateAction<HourLog[]>>;
  setInvoices: Dispatch<SetStateAction<Invoice[]>>;
}

const LS_KEYS = {
  officeProfile: 'office_profile',
  typographySettings: 'typography_settings',
  enabledMenus: 'enabled_menus',
  feeSettings: 'fee_settings',
  alarmSettings: 'alarm_settings',
  users: 'users',
  archiveSeasons: 'archive_seasons',
  notes: 'notes',
};

function isDesktopEnvironment(): boolean {
  return typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
}

// ─── v2.9.7: Performance metrics helpers ──────────────────────────────────
async function timedLoad<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const elapsed = (performance.now() - start).toFixed(1);
    logger.info(`[useAppData][perf] ${label} loaded in ${elapsed}ms`);
  }
}

// ─── v2.9.7: Pure helpers for entity load + fallback (testable) ──────────
interface EntityConfig<T> {
  idbStore: string;
  lsKey: string;
  mockData: T[];
  clean?: (d: T[]) => T[];
  hasMockSeed: boolean;
}

const ENTITY_CONFIGS: {
  sessions: EntityConfig<Session>;
  transactions: EntityConfig<Transaction>;
  deadlines: EntityConfig<LegalDeadline>;
  tasks: EntityConfig<LawTask>;
  documents: EntityConfig<LawDocument>;
  executions: EntityConfig<Execution>;
  hourLogs: EntityConfig<HourLog>;
  invoices: EntityConfig<Invoice>;
} = {
  sessions: {
    idbStore: 'sessions',
    lsKey: 'sessions',
    mockData: mockSessions,
    clean: cleanSessionData,
    hasMockSeed: true,
  },
  transactions: {
    idbStore: 'transactions',
    lsKey: 'transactions',
    mockData: mockTransactions,
    hasMockSeed: true,
  },
  deadlines: {
    idbStore: 'deadlines',
    lsKey: 'deadlines',
    mockData: mockDeadlines,
    clean: cleanDeadlineData,
    hasMockSeed: true,
  },
  tasks: {
    idbStore: 'tasks',
    lsKey: 'tasks',
    mockData: mockTasks,
    clean: cleanTaskData,
    hasMockSeed: true,
  },
  documents: {
    idbStore: 'documents',
    lsKey: 'documents',
    mockData: mockDocuments,
    hasMockSeed: true,
  },
  executions: {
    idbStore: 'executions',
    lsKey: 'executions',
    mockData: [],
    hasMockSeed: true,
  },
  hourLogs: {
    idbStore: 'hour_logs',
    lsKey: 'hour_logs',
    mockData: mockHourLogs,
    hasMockSeed: true,
  },
  invoices: {
    idbStore: 'invoices',
    lsKey: 'invoices',
    mockData: [],
    hasMockSeed: true,
  },
};

function loadFromLocalStorageOrMock<T>(
  config: EntityConfig<T>,
  isFirstRun: boolean,
  uid?: string
): T[] {
  const lsKey = uid ? `lawfirm_${uid}_${config.lsKey}` : `lawfirm_${config.lsKey}`;
  const local = localStorage.getItem(lsKey);
  if (local) {
    try {
      const parsed = JSON.parse(local);
      return config.clean ? config.clean(parsed) : parsed;
    } catch (e) {
      logger.warn(`[useAppData] Failed to parse ${lsKey} from localStorage`, e);
    }
  }
  if (isFirstRun && config.hasMockSeed && isDesktopEnvironment()) {
    return config.clean ? config.clean(config.mockData) : config.mockData;
  }
  return [];
}

async function loadEntityFromIDB<T>(config: EntityConfig<T>, uid?: string): Promise<T[]> {
  try {
    const idbData = await getAllFromStore<T>(config.idbStore);
    if (idbData.length > 0) {
      return config.clean ? config.clean(idbData) : idbData;
    }
  } catch (e) {
    logger.warn(`Failed to load ${config.idbStore} from IDB`, e);
  }
  const lsKey = uid ? `lawfirm_${uid}_${config.lsKey}` : `lawfirm_${config.lsKey}`;
  const local = localStorage.getItem(lsKey);
  if (local) {
    try {
      const parsed = JSON.parse(local);
      return config.clean ? config.clean(parsed) : parsed;
    } catch (e) {
      logger.warn(`Failed to parse ${lsKey} from localStorage`, e);
    }
  }
  if (config.hasMockSeed && isDesktopEnvironment()) {
    return config.clean ? config.clean(config.mockData) : config.mockData;
  }
  return [];
}

async function loadAllSecondaryEntities(uid?: string): Promise<{
  sessions: Session[];
  transactions: Transaction[];
  deadlines: LegalDeadline[];
  tasks: LawTask[];
  documents: LawDocument[];
  executions: Execution[];
  hourLogs: HourLog[];
  invoices: Invoice[];
}> {
  const totalStart = performance.now();

  const results = await Promise.allSettled([
    timedLoad('sessions', () => loadEntityFromIDB(ENTITY_CONFIGS.sessions, uid)),
    timedLoad('transactions', () => loadEntityFromIDB(ENTITY_CONFIGS.transactions, uid)),
    timedLoad('deadlines', () => loadEntityFromIDB(ENTITY_CONFIGS.deadlines, uid)),
    timedLoad('tasks', () => loadEntityFromIDB(ENTITY_CONFIGS.tasks, uid)),
    timedLoad('documents', () => loadEntityFromIDB(ENTITY_CONFIGS.documents, uid)),
    timedLoad('executions', () => loadEntityFromIDB(ENTITY_CONFIGS.executions, uid)),
    timedLoad('hourLogs', () => loadEntityFromIDB(ENTITY_CONFIGS.hourLogs, uid)),
    timedLoad('invoices', () => loadEntityFromIDB(ENTITY_CONFIGS.invoices, uid)),
  ]);

  const unwrap = <T extends unknown[]>(r: PromiseSettledResult<T>, fallback: T): T =>
    r.status === 'fulfilled' ? r.value : fallback;

  const data = {
    sessions: unwrap(results[0], []),
    transactions: unwrap(results[1], []),
    deadlines: unwrap(results[2], []),
    tasks: unwrap(results[3], []),
    documents: unwrap(results[4], []),
    executions: unwrap(results[5], []),
    hourLogs: unwrap(results[6], []),
    invoices: unwrap(results[7], []),
  };

  const totalElapsed = (performance.now() - totalStart).toFixed(1);
  logger.info(
    `[useAppData][perf] All 8 secondary entities loaded in ${totalElapsed}ms (parallel)`
  );

  return data;
}

export function useAppData(uid?: string): AppDataState {
  // ─── الديناميكية والتحقق من المعرّف ─────────────────────────────────────
  const getLSKey = useCallback((baseKey: string) => {
    return uid ? `lawfirm_${uid}_${baseKey}` : `lawfirm_${baseKey}`;
  }, [uid]);

  const loadFromLS = useCallback(<T>(baseKey: string, defaultValue: T): T => {
    try {
      const key = getLSKey(baseKey);
      const v = localStorage.getItem(key);
      if (v === null) return defaultValue;
      return JSON.parse(v);
    } catch (e) {
      logger.warn(`[useAppData] Failed to parse ${baseKey} from localStorage`, e);
      return defaultValue;
    }
  }, [getLSKey]);

  // ─── Settings (localStorage-backed) ─────────────────────────────────────
  const [officeProfile, setOfficeProfileRaw] = useState<OfficeProfile>(() =>
    loadFromLS<OfficeProfile>(LS_KEYS.officeProfile, {
      officeName: 'مكتب المحاماة',
      managingPartner: '',
      barId: '',
      taxId: '',
      address: '',
      phone: '',
      email: '',
      courtJurisdiction: '',
    })
  );
  const setOfficeProfile = useCallback((p: OfficeProfile) => {
    setOfficeProfileRaw(p);
    try { localStorage.setItem(getLSKey(LS_KEYS.officeProfile), JSON.stringify(p)); } catch (e) {
      logger.warn('Failed to save office profile', e);
    }
  }, [getLSKey]);

  const [enabledMenus, setEnabledMenusRaw] = useState(() =>
    loadFromLS(LS_KEYS.enabledMenus, {
      dashboard: true, cases: true, clients: true, calendar: true, tasks: true,
      documents: true, financials: true, database: true, settings: true, archive: true,
      reports: true, executions: true,
    })
  );
  const setEnabledMenus = useCallback((m: Record<string, boolean>) => {
    setEnabledMenusRaw(m);
    try { localStorage.setItem(getLSKey(LS_KEYS.enabledMenus), JSON.stringify(m)); } catch (e) {
      logger.warn('Failed to save enabled menus', e);
    }
  }, [getLSKey]);

  const [typographySettings, setTypographySettingsRaw] = useState(() =>
    loadFromLS(LS_KEYS.typographySettings, {
      fontFamily: 'Cairo',
      fontSizeMultiplier: 1.0,
      textColor: '#1e293b',
    })
  );
  const setTypographySettings = useCallback((s: any) => {
    setTypographySettingsRaw(s);
    try { localStorage.setItem(getLSKey(LS_KEYS.typographySettings), JSON.stringify(s)); } catch (e) {
      logger.warn('Failed to save typography', e);
    }
  }, [getLSKey]);

  const [feeSettings, setFeeSettingsRaw] = useState(() =>
    loadFromLS(LS_KEYS.feeSettings, {})
  );
  const setFeeSettings = useCallback((s: any) => {
    setFeeSettingsRaw(s);
    try { localStorage.setItem(getLSKey(LS_KEYS.feeSettings), JSON.stringify(s)); } catch (e) {
      logger.warn('Failed to save fee settings', e);
    }
  }, [getLSKey]);

  const [alarmSettings, setAlarmSettingsRaw] = useState(() =>
    loadFromLS(LS_KEYS.alarmSettings, {})
  );
  const setAlarmSettings = useCallback((s: any) => {
    setAlarmSettingsRaw(s);
    try { localStorage.setItem(getLSKey(LS_KEYS.alarmSettings), JSON.stringify(s)); } catch (e) {
      logger.warn('Failed to save alarm settings', e);
    }
  }, [getLSKey]);

  const [users, setUsersRaw] = useState<any[]>(() => loadFromLS(LS_KEYS.users, []));
  const setUsers = useCallback((u: any[]) => {
    setUsersRaw(u);
    try { localStorage.setItem(getLSKey(LS_KEYS.users), JSON.stringify(u)); } catch (e) {
      logger.warn('Failed to save users', e);
    }
  }, [getLSKey]);

  const [archiveSeasons, setArchiveSeasonsRaw] = useState<any[]>(() =>
    loadFromLS(LS_KEYS.archiveSeasons, [])
  );
  const setArchiveSeasons = useCallback((a: any[]) => {
    setArchiveSeasonsRaw(a);
    try { localStorage.setItem(getLSKey(LS_KEYS.archiveSeasons), JSON.stringify(a)); } catch (e) {
      logger.warn('Failed to save archive seasons', e);
    }
  }, [getLSKey]);

  const [notes, setNotesRaw] = useState<any>(() => loadFromLS(LS_KEYS.notes, []));
  const setNotes = useCallback((n: any) => {
    setNotesRaw(n);
    try { localStorage.setItem(getLSKey(LS_KEYS.notes), JSON.stringify(n)); } catch (e) {
      logger.warn('Failed to save notes', e);
    }
  }, [getLSKey]);

  // ─── تحديث القيم ومزامنتها تلقائياً عند تغيير الحساب ────────────────────────
  useEffect(() => {
    setOfficeProfileRaw(loadFromLS<OfficeProfile>(LS_KEYS.officeProfile, {
      officeName: 'مكتب المحاماة',
      managingPartner: '',
      barId: '',
      taxId: '',
      address: '',
      phone: '',
      email: '',
      courtJurisdiction: '',
    }));
    setEnabledMenusRaw(loadFromLS(LS_KEYS.enabledMenus, {
      dashboard: true, cases: true, clients: true, calendar: true, tasks: true,
      documents: true, financials: true, database: true, settings: true, archive: true,
      reports: true, executions: true,
    }));
    setTypographySettingsRaw(loadFromLS(LS_KEYS.typographySettings, {
      fontFamily: 'Cairo',
      fontSizeMultiplier: 1.0,
      textColor: '#1e293b',
    }));
    setFeeSettingsRaw(loadFromLS(LS_KEYS.feeSettings, {}));
    setAlarmSettingsRaw(loadFromLS(LS_KEYS.alarmSettings, {}));
    setUsersRaw(loadFromLS(LS_KEYS.users, []));
    setArchiveSeasonsRaw(loadFromLS(LS_KEYS.archiveSeasons, []));
    setNotesRaw(loadFromLS(LS_KEYS.notes, []));
  }, [uid, loadFromLS]);

  // ─── IDB-backed data ────────────────────────────────────────────────────
  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [bailiffPapers, setBailiffPapers] = useState<BailiffPaper[]>([]);
  const [opponents, setOpponents] = useState<Opponent[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deadlines, setDeadlines] = useState<LegalDeadline[]>([]);
  const [tasks, setTasks] = useState<LawTask[]>([]);
  const [documents, setDocuments] = useState<LawDocument[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [hourLogs, setHourLogs] = useState<HourLog[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isDBLoading, setIsDBLoading] = useState(true);

  // ─── Initial load from IndexedDB + localStorage ────────────────────────
  useEffect(() => {
    // تصفية الحالة فوراً لعدم إظهار بيانات المستخدم السابق
    setCases([]);
    setClients([]);
    setBailiffPapers([]);
    setOpponents([]);
    setSessions([]);
    setTransactions([]);
    setDeadlines([]);
    setTasks([]);
    setDocuments([]);
    setExecutions([]);
    setHourLogs([]);
    setInvoices([]);
    setIsDBLoading(true);

    async function loadIndexedData() {
      if (uid) {
        setFirebaseUserUid(uid);
      } else {
        setFirebaseUserUid(null);
      }

      const hookStart = performance.now();
      try {
        if (!isMigrationDone()) {
          try {
            await runLocalStorageToIndexedDBMigration();
          } catch (e) {
            logger.error('Migration failed', e);
          }
        }

        const primaryPromise = timedLoad('primary[cases+clients+bailiff+opponents]', () =>
          syncAndLoadApplicationData()
        );
        const secondaryPromise = timedLoad('secondary[8 stores]', () =>
          loadAllSecondaryEntities(uid)
        );

        const [primary, secondary] = await Promise.all([primaryPromise, secondaryPromise]);

        setCases(cleanCaseData(primary.cases));
        setClients(cleanClientData(primary.clients));
        setBailiffPapers(primary.bailiffPapers);
        setOpponents(primary.opponents);

        setSessions(secondary.sessions);
        setTransactions(secondary.transactions);
        setDeadlines(secondary.deadlines);
        setTasks(secondary.tasks);
        setDocuments(secondary.documents);
        setExecutions(secondary.executions);
        setHourLogs(secondary.hourLogs);
        setInvoices(secondary.invoices);

        const totalElapsed = (performance.now() - hookStart).toFixed(1);
        logger.info(`[useAppData][perf] Total startup load: ${totalElapsed}ms`);
      } catch (e) {
        logger.error('Failed to initialize unlimited IndexedDB', e);
        const localCases = localStorage.getItem(getLSKey('cases'));
        const localClients = localStorage.getItem(getLSKey('clients'));
        const localBailiffs = localStorage.getItem(getLSKey('bailiff_papers'));
        const localOpponents = localStorage.getItem(getLSKey('opponents'));
        const isFirstRun = localCases === null && localClients === null;
        if (localCases !== null) { try { setCases(cleanCaseData(JSON.parse(localCases))); } catch (e) { logger.warn('Failed to parse cases from localStorage', e); } }
        if (localClients !== null) { try { setClients(cleanClientData(JSON.parse(localClients))); } catch (e) { logger.warn('Failed to parse clients from localStorage', e); } }
        if (localBailiffs !== null) { try { setBailiffPapers(JSON.parse(localBailiffs)); } catch (e) { logger.warn('Failed to parse bailiffs from localStorage', e); } }
        if (localOpponents !== null) { try { setOpponents(JSON.parse(localOpponents)); } catch (e) { logger.warn('Failed to parse opponents from localStorage', e); } }

        const setIfEmpty = <T,>(
          current: T[],
          setter: Dispatch<SetStateAction<T[]>>,
          config: EntityConfig<T>
        ): void => {
          if (current.length > 0) return;
          setter(loadFromLocalStorageOrMock(config, isFirstRun, uid));
        };
        setIfEmpty(sessions, setSessions, ENTITY_CONFIGS.sessions);
        setIfEmpty(transactions, setTransactions, ENTITY_CONFIGS.transactions);
        setIfEmpty(deadlines, setDeadlines, ENTITY_CONFIGS.deadlines);
        setIfEmpty(tasks, setTasks, ENTITY_CONFIGS.tasks);
        setIfEmpty(documents, setDocuments, ENTITY_CONFIGS.documents);
        setIfEmpty(executions, setExecutions, ENTITY_CONFIGS.executions);
        setIfEmpty(hourLogs, setHourLogs, ENTITY_CONFIGS.hourLogs);
        setIfEmpty(invoices, setInvoices, ENTITY_CONFIGS.invoices);
      } finally {
        setIsDBLoading(false);
        const totalElapsed = (performance.now() - hookStart).toFixed(1);
        logger.info(`[useAppData][perf] Startup load complete: ${totalElapsed}ms (isDBLoading=false)`);
      }
    }
    loadIndexedData();
  }, [uid]);

  return {
    data: {
      cases, clients, bailiffPapers, opponents, sessions, transactions,
      deadlines, tasks, documents, executions, hourLogs, invoices
    },
    isDBLoading,
    officeProfile, setOfficeProfile,
    enabledMenus, setEnabledMenus,
    typographySettings, setTypographySettings,
    feeSettings, setFeeSettings,
    alarmSettings, setAlarmSettings,
    users, setUsers,
    archiveSeasons, setArchiveSeasons,
    notes, setNotes,
    setCases, setClients, setBailiffPapers, setOpponents,
    setSessions, setTransactions, setDeadlines, setTasks,
    setDocuments, setExecutions, setHourLogs, setInvoices
  };
}
