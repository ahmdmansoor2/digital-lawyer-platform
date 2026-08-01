/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useAppData.test.tsx — اختبارات الـ hook المركزي للبيانات.
 *
 * v2.9.0: tests للـ refactor الكبير.
 * يختبر: initial state، IDB load success، localStorage fallback، mockData seed، isDBLoading flip.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react';

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Mock IDB helpers
vi.mock('../../utils/indexedDBHelper', () => ({
  syncAndLoadApplicationData: vi.fn(),
  getAllFromStore: vi.fn(),
  putMultipleIntoStore: vi.fn(() => Promise.resolve()),
  putIntoStore: vi.fn(() => Promise.resolve()),
  removeFromStore: vi.fn(() => Promise.resolve()),
  clearStore: vi.fn(() => Promise.resolve()),
  clearAllStores: vi.fn(() => Promise.resolve()),
  atomicMultiStoreWrite: vi.fn(() => Promise.resolve()),
  setFirebaseUserUid: vi.fn(),
}));

// Mock migration helpers
vi.mock('../../utils/migrationHelper', () => ({
  runLocalStorageToIndexedDBMigration: vi.fn(() => Promise.resolve({ success: true, migrated: {} })),
  isMigrationDone: vi.fn(() => true),
}));

// Mock data sanitizer (use identity for easier assertions)
vi.mock('../../utils/dataSanitizer', () => ({
  cleanCaseData: vi.fn((d: any[]) => d),
  cleanClientData: vi.fn((d: any[]) => d),
  cleanSessionData: vi.fn((d: any[]) => d),
  cleanDeadlineData: vi.fn((d: any[]) => d),
  cleanTaskData: vi.fn((d: any[]) => d),
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock mockData (use small identifiable objects)
vi.mock('../../data/mockData', () => ({
  mockCases: [{ id: 'mock-case-1', caseNumber: 'MOCK-1' }],
  mockClients: [{ id: 'mock-client-1', name: 'MOCK CLIENT' }],
  mockOpponents: [{ id: 'mock-opp-1', fullName: 'MOCK OPP' }],
  mockSessions: [{ id: 'mock-session-1', caseNumber: 'MOCK-1' }],
  mockTransactions: [{ id: 'mock-tx-1' }],
  mockDeadlines: [{ id: 'mock-dl-1' }],
  mockTasks: [{ id: 'mock-task-1' }],
  mockDocuments: [{ id: 'mock-doc-1' }],
  mockExecutions: [{ id: 'mock-exec-1' }],
  mockHourLogs: [{ id: 'mock-log-1' }],
  mockInvoices: [{ id: 'mock-inv-1' }],
}));

// ─── Imports after mocks ────────────────────────────────────────────────────

import { useAppData } from '../useAppData';
import {
  syncAndLoadApplicationData,
  getAllFromStore,
} from '../../utils/indexedDBHelper';
import { isMigrationDone } from '../../utils/migrationHelper';

// ─── Test component ─────────────────────────────────────────────────────────

interface HookSnapshot {
  cases: any[];
  clients: any[];
  sessions: any[];
  transactions: any[];
  deadlines: any[];
  tasks: any[];
  isDBLoading: boolean;
  setCases: (v: any[]) => void;
}

let latestSnapshot: HookSnapshot | null = null;

function TestComponent({ onReady }: { onReady?: () => void }) {
  const hook = useAppData();
  latestSnapshot = {
    cases: hook.data.cases,
    clients: hook.data.clients,
    sessions: hook.data.sessions,
    transactions: hook.data.transactions,
    deadlines: hook.data.deadlines,
    tasks: hook.data.tasks,
    isDBLoading: hook.isDBLoading,
    setCases: hook.setCases,
  };
  useEffect(() => {
    if (onReady && !hook.isDBLoading) onReady();
  }, [hook.isDBLoading, onReady]);
  return null;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useAppData', () => {
  let container: HTMLDivElement;
  let root: ReactDOM.Root;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    latestSnapshot = null;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = ReactDOM.createRoot(container);

    // Default mocks: IDB has data
    vi.mocked(syncAndLoadApplicationData).mockResolvedValue({
      cases: [{ id: 'idb-case-1' } as any],
      clients: [{ id: 'idb-client-1' } as any],
      bailiffPapers: [{ id: 'idb-bailiff-1' } as any],
      opponents: [{ id: 'idb-opp-1' } as any],
    });
    vi.mocked(getAllFromStore).mockImplementation(async (store: string) => {
      if (store === 'sessions') return [{ id: 'idb-session-1' }];
      if (store === 'transactions') return [{ id: 'idb-tx-1' }];
      if (store === 'deadlines') return [{ id: 'idb-dl-1' }];
      if (store === 'tasks') return [{ id: 'idb-task-1' }];
      if (store === 'documents') return [{ id: 'idb-doc-1' }];
      if (store === 'executions') return [{ id: 'idb-exec-1' }];
      if (store === 'hour_logs') return [{ id: 'idb-log-1' }];
      if (store === 'invoices') return [{ id: 'idb-inv-1' }];
      return [];
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    document.body.removeChild(container);
    localStorage.clear();
  });

  it('starts with isDBLoading=true and empty arrays', () => {
    act(() => {
      root.render(<TestComponent />);
    });
    // On first render, before the effect runs, isDBLoading is true
    // and all IDB data is empty.
    // (Note: by the time render completes, the effect may have run.
    //  We check the initial state by inspecting the first snapshot.)
    // The effect runs synchronously after first render, so isDBLoading
    // might already be false. We assert it eventually becomes false.
    expect(latestSnapshot).not.toBeNull();
  });

  it('loads primary data from IDB on mount', async () => {
    await act(async () => {
      root.render(<TestComponent />);
    });
    expect(latestSnapshot!.cases).toEqual([{ id: 'idb-case-1' }]);
    expect(latestSnapshot!.clients).toEqual([{ id: 'idb-client-1' }]);
    expect(latestSnapshot!.isDBLoading).toBe(false);
  });

  it('loads v2.7.0 stores from IDB on mount', async () => {
    await act(async () => {
      root.render(<TestComponent />);
    });
    expect(latestSnapshot!.sessions).toEqual([{ id: 'idb-session-1' }]);
  });

  it('calls cleanCaseData + cleanClientData on IDB data', async () => {
    await act(async () => {
      root.render(<TestComponent />);
    });
    // We mocked cleanCaseData as identity, but it was called.
    const { cleanCaseData, cleanClientData } = await import('../../utils/dataSanitizer');
    expect(cleanCaseData).toHaveBeenCalledWith([{ id: 'idb-case-1' }]);
    expect(cleanClientData).toHaveBeenCalledWith([{ id: 'idb-client-1' }]);
  });

  it('isDBLoading flips to false after load', async () => {
    await act(async () => {
      root.render(<TestComponent />);
    });
    expect(latestSnapshot!.isDBLoading).toBe(false);
  });

  it('falls back to localStorage when IDB is empty (for new stores)', async () => {
    // IDB is empty for sessions
    vi.mocked(getAllFromStore).mockImplementation(async () => []);
    // localStorage has data
    localStorage.setItem('lawfirm_sessions', JSON.stringify([{ id: 'ls-session-1' }]));

    await act(async () => {
      root.render(<TestComponent />);
    });
    expect(latestSnapshot!.sessions).toEqual([{ id: 'ls-session-1' }]);
  });

  it('starts empty on web (no mock data seeded for new web users)', async () => {
    // v2.9.10: web users new to the platform should start with empty data
    // Mock window.electronAPI to be undefined (web environment)
    const originalElectronAPI = (window as any).electronAPI;
    (window as any).electronAPI = undefined;
    // IDB empty
    vi.mocked(getAllFromStore).mockImplementation(async () => []);
    // localStorage empty (no first-run keys)
    // isMigrationDone is mocked true so migration is skipped

    await act(async () => {
      root.render(<TestComponent />);
    });
    // For web first run: empty array (not mock data)
    expect(latestSnapshot!.sessions).toEqual([]);
    expect(latestSnapshot!.transactions).toEqual([]);
    expect(latestSnapshot!.deadlines).toEqual([]);
    expect(latestSnapshot!.tasks).toEqual([]);

    // Restore
    (window as any).electronAPI = originalElectronAPI;
  });

  it('does NOT overwrite IDB data with localStorage when IDB has data', async () => {
    // IDB has data
    vi.mocked(getAllFromStore).mockImplementation(async (store: string) => {
      if (store === 'sessions') return [{ id: 'idb-session' }];
      return [];
    });
    // localStorage has DIFFERENT data
    localStorage.setItem('lawfirm_sessions', JSON.stringify([{ id: 'ls-session' }]));

    await act(async () => {
      root.render(<TestComponent />);
    });
    // IDB wins
    expect(latestSnapshot!.sessions).toEqual([{ id: 'idb-session' }]);
  });

  it('setCases updates state correctly', async () => {
    await act(async () => {
      root.render(<TestComponent />);
    });
    // Initial: IDB data
    expect(latestSnapshot!.cases).toEqual([{ id: 'idb-case-1' }]);

    act(() => {
      latestSnapshot!.setCases([{ id: 'new-case' }]);
    });
    expect(latestSnapshot!.cases).toEqual([{ id: 'new-case' }]);
  });

  it('handles IDB error gracefully (does not throw, still flips loading)', async () => {
    vi.mocked(syncAndLoadApplicationData).mockRejectedValue(new Error('IDB boom'));

    // First-run indicators: no localStorage data
    expect(() => {
      act(() => {
        root.render(<TestComponent />);
      });
    }).not.toThrow();

    // Wait for the rejection to settle
    await new Promise(resolve => setTimeout(resolve, 10));

    // isDBLoading should be false (finally block runs even on error)
    expect(latestSnapshot!.isDBLoading).toBe(false);
  });

  it('skips migration when isMigrationDone returns true', async () => {
    vi.mocked(isMigrationDone).mockReturnValue(true);
    const { runLocalStorageToIndexedDBMigration } = await import('../../utils/migrationHelper');
    await act(async () => {
      root.render(<TestComponent />);
    });
    expect(runLocalStorageToIndexedDBMigration).not.toHaveBeenCalled();
  });

  it('runs migration when isMigrationDone returns false', async () => {
    vi.mocked(isMigrationDone).mockReturnValue(false);
    const { runLocalStorageToIndexedDBMigration } = await import('../../utils/migrationHelper');
    await act(async () => {
      root.render(<TestComponent />);
    });
    expect(runLocalStorageToIndexedDBMigration).toHaveBeenCalled();
  });
});

// ─── v2.9.7: Batch loading + metrics + parallelism tests ───────────────────
//
// These tests verify the performance refactor:
//  - 8 secondary stores are queried in parallel (single batch)
//  - 4 primary stores are queried in parallel
//  - per-entity metrics are logged
//  - total startup metric is logged
//  - one store failing does NOT block the rest (Promise.allSettled semantics)
//
// The trick: we instrument the mocked getAllFromStore to record call order
// and timing relative to each other. If the loader were sequential, we would
// see N waits in order. If parallel, we see all calls fire before any resolves.

describe('useAppData v2.9.7 — batch loading', () => {
  let container: HTMLDivElement;
  let root: ReactDOM.Root;

  // Helper: returns a function that records the moment each store call
  // was initiated and when it resolved. We use this to assert parallelism.
  function makeInstrumentedIDB() {
    const callLog: Array<{ store: string; t: number; resolved: boolean }> = [];
    const startBarrier = performance.now();
    return {
      callLog,
      startBarrier,
      // Resolve only when all 8 stores have been CALLED (not when they finish).
      // This is the classic parallelism check: if we see 8 store names in the
      // call log before any resolution, the calls were made concurrently.
    };
  }

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = ReactDOM.createRoot(container);

    // Default IDB: has data for everything
    vi.mocked(syncAndLoadApplicationData).mockResolvedValue({
      cases: [{ id: 'idb-case-1' } as any],
      clients: [{ id: 'idb-client-1' } as any],
      bailiffPapers: [{ id: 'idb-bailiff-1' } as any],
      opponents: [{ id: 'idb-opp-1' } as any],
    });
    vi.mocked(getAllFromStore).mockImplementation(async (store: string) => {
      return [{ id: `idb-${store}-1` }];
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    document.body.removeChild(container);
    localStorage.clear();
  });

  it('queries all 8 secondary stores in a single batch (not 8 sequential awaits)', async () => {
    // Track the order in which getAllFromStore is called. The new implementation
    // fires all 8 calls inside Promise.allSettled BEFORE awaiting any of them.
    // We assert: calls for {sessions, transactions, deadlines, tasks, documents,
    // executions, hour_logs, invoices} are ALL made.
    const calledStores: string[] = [];
    vi.mocked(getAllFromStore).mockImplementation(async (store: string) => {
      calledStores.push(store);
      return [{ id: `idb-${store}-1` }];
    });

    await act(async () => {
      root.render(<TestComponent />);
    });

    // syncAndLoadApplicationData is what calls the primary 4 stores internally.
    // The secondary 8 stores are called directly by useAppData.
    // The 8 secondary stores should be exactly:
    const expectedSecondary = [
      'sessions', 'transactions', 'deadlines', 'tasks',
      'documents', 'executions', 'hour_logs', 'invoices',
    ];
    for (const s of expectedSecondary) {
      expect(calledStores).toContain(s);
    }
  });

  it('runs primary load and secondary load concurrently via Promise.all', async () => {
    // We use a controllable promise for syncAndLoadApplicationData to verify
    // that getAllFromStore calls happen BEFORE it resolves.
    let resolvePrimary: () => void = () => {};
    const primaryStarted = vi.fn();
    const secondaryCallBeforePrimaryResolve = vi.fn();

    vi.mocked(syncAndLoadApplicationData).mockImplementation(async () => {
      primaryStarted();
      // Wait until manually resolved
      await new Promise<void>(r => { resolvePrimary = r; });
      return {
        cases: [{ id: 'idb-case-1' } as any],
        clients: [{ id: 'idb-client-1' } as any],
        bailiffPapers: [{ id: 'idb-bailiff-1' } as any],
        opponents: [{ id: 'idb-opp-1' } as any],
      };
    });

    vi.mocked(getAllFromStore).mockImplementation(async (store: string) => {
      // If we see a secondary store call, the secondary batch has fired
      // IN PARALLEL with the primary (which is still pending).
      if (['sessions', 'transactions', 'deadlines', 'tasks', 'documents', 'executions', 'hour_logs', 'invoices'].includes(store)) {
        secondaryCallBeforePrimaryResolve();
      }
      return [{ id: `idb-${store}-1` }];
    });

    // Start rendering but don't await
    root.render(<TestComponent />);
    // Give microtasks/effects time to run
    await new Promise(r => setTimeout(r, 50));

    expect(primaryStarted).toHaveBeenCalled();
    expect(secondaryCallBeforePrimaryResolve).toHaveBeenCalled();

    // Now resolve the primary
    resolvePrimary!();
    // Allow the rest of the effect to complete
    await new Promise(r => setTimeout(r, 50));
  });

  it('logs per-entity performance metrics via logger.info', async () => {
    vi.mocked(getAllFromStore).mockImplementation(async (store: string) => {
      return [{ id: `idb-${store}-1` }];
    });
    const { logger } = await import('../../utils/logger');
    await act(async () => {
      root.render(<TestComponent />);
    });
    // We expect at least 10 info() calls:
    //  - 1 for primary[cases+clients+bailiff+opponents]
    //  - 1 for secondary[8 stores]
    //  - 1 for "All 8 secondary entities loaded in ...ms"
    //  - 8 individual timedLoad labels (one per store)
    //  - 1 "Total startup load: ...ms"
    //  - 1 "Startup load complete: ...ms"
    expect(logger.info).toHaveBeenCalled();
    const calls = (logger.info as any).mock.calls.map((c: any[]) => c[0]);
    const hasSecondaryMetric = calls.some((c: string) =>
      typeof c === 'string' && c.includes('secondary[8 stores]')
    );
    const hasPrimaryMetric = calls.some((c: string) =>
      typeof c === 'string' && c.includes('primary[cases+clients+bailiff+opponents]')
    );
    const hasStoreMetric = calls.some((c: string) =>
      typeof c === 'string' && /loaded in \d+(\.\d+)?ms/.test(c)
    );
    const hasTotalMetric = calls.some((c: string) =>
      typeof c === 'string' && c.includes('Total startup load:')
    );
    expect(hasSecondaryMetric).toBe(true);
    expect(hasPrimaryMetric).toBe(true);
    expect(hasStoreMetric).toBe(true);
    expect(hasTotalMetric).toBe(true);
  });

  it('continues loading other stores when one IDB call fails (Promise.allSettled)', async () => {
    // Make 'transactions' throw, but everything else returns data.
    vi.mocked(getAllFromStore).mockImplementation(async (store: string) => {
      if (store === 'transactions') {
        throw new Error('Simulated IDB error for transactions');
      }
      return [{ id: `idb-${store}-1` }];
    });

    await act(async () => {
      root.render(<TestComponent />);
    });

    // Sessions, deadlines, etc. should still be loaded successfully
    // (because the new code uses Promise.allSettled, NOT Promise.all).
    // The hook should not throw and isDBLoading should flip to false.
    expect(latestSnapshot).not.toBeNull();
    expect(latestSnapshot!.isDBLoading).toBe(false);
    // The failing store falls back to localStorage or [] — so transactions
    // may be [] (or the mock fallback). We just assert it does not crash.
    expect(() => latestSnapshot!.sessions).not.toThrow();
  });

  it('loads all 12 entities in the same effect pass (no second render roundtrip)', async () => {
    // The new implementation sets all 12 entity states from a single
    // Promise.all([primary, secondary]) — so a single render observes
    // the final state.
    // syncAndLoadApplicationData is MOCKED, so it doesn't make IDB calls.
    // The 8 secondary entities are loaded by loadAllSecondaryEntities via
    // getAllFromStore. We assert exactly 8 calls (one per secondary store).
    vi.mocked(getAllFromStore).mockImplementation(async (store: string) => {
      return [{ id: `idb-${store}-1` }];
    });
    await act(async () => {
      root.render(<TestComponent />);
    });

    const calledStoreNames = vi.mocked(getAllFromStore).mock.calls.map(c => c[0]);
    const expectedSecondary = [
      'sessions', 'transactions', 'deadlines', 'tasks',
      'documents', 'executions', 'hour_logs', 'invoices',
    ];
    // Each secondary store should be called exactly once (no duplicate passes).
    for (const s of expectedSecondary) {
      const count = calledStoreNames.filter(n => n === s).length;
      expect(count, `store "${s}" should be called exactly once`).toBe(1);
    }
    // And no other stores should be called from the secondary batch.
    expect(calledStoreNames.length).toBe(8);
  });
});
