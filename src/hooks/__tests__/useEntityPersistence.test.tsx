/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react';
import { useEntityPersistence } from '../useEntityPersistence';

// Mock the IDB helper to avoid real IDB calls
vi.mock('../../utils/indexedDBHelper', () => ({
  putMultipleIntoStore: vi.fn(() => Promise.resolve()),
}));

// Mock logger to avoid noise
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { putMultipleIntoStore } from '../../utils/indexedDBHelper';

// Simple test component that uses the hook
function TestComponent({
  initialData,
  loading,
  lsKey,
  storeName,
  onDataChange,
}: {
  initialData: any[];
  loading: boolean;
  lsKey: string;
  storeName: string;
  onDataChange?: (data: any[]) => void;
}) {
  const [data, setData] = useState(initialData);
  useEntityPersistence(lsKey, storeName, data, loading);
  // Expose setData for tests
  (TestComponent as any).setData = setData;
  (TestComponent as any).getData = () => data;
  if (onDataChange) onDataChange(data);
  return null;
}

describe('useEntityPersistence', () => {
  let container: HTMLDivElement;
  let root: ReactDOM.Root;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = ReactDOM.createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    document.body.removeChild(container);
    localStorage.clear();
  });

  it('does NOT write while isDBLoading=true', () => {
    act(() => {
      root.render(
        <TestComponent initialData={[{ id: '1', name: 'A' }]} loading={true} lsKey="lawfirm_test" storeName="test" />
      );
    });
    expect(localStorage.getItem('lawfirm_test')).toBeNull();
    expect(putMultipleIntoStore).not.toHaveBeenCalled();
  });

  it('writes to localStorage AND IDB when isDBLoading=false', async () => {
    act(() => {
      root.render(
        <TestComponent initialData={[{ id: '1', name: 'A' }]} loading={false} lsKey="lawfirm_test" storeName="test" />
      );
    });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(localStorage.getItem('lawfirm_test')).toBe(JSON.stringify([{ id: '1', name: 'A' }]));
    expect(putMultipleIntoStore).toHaveBeenCalledWith('test', [{ id: '1', name: 'A' }]);
  });

  it('writes the latest data on each update', async () => {
    act(() => {
      root.render(
        <TestComponent initialData={[{ id: '1', name: 'A' }]} loading={false} lsKey="lawfirm_test" storeName="test" />
      );
    });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(localStorage.getItem('lawfirm_test')).toBe(JSON.stringify([{ id: '1', name: 'A' }]));

    // Trigger a re-render with new data
    act(() => {
      (TestComponent as any).setData([{ id: '2', name: 'B' }]);
    });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(localStorage.getItem('lawfirm_test')).toBe(JSON.stringify([{ id: '2', name: 'B' }]));
  });

  it('handles localStorage quota errors gracefully', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => {
      act(() => {
        root.render(
          <TestComponent initialData={[{ id: '1' }]} loading={false} lsKey="lawfirm_test" storeName="test" />
        );
      });
    }).not.toThrow();
    setItemSpy.mockRestore();
  });

  it('handles IDB errors gracefully', async () => {
    vi.mocked(putMultipleIntoStore).mockImplementationOnce(() =>
      Promise.reject(new Error('IDB error'))
    );
    expect(() => {
      act(() => {
        root.render(
          <TestComponent initialData={[{ id: '1' }]} loading={false} lsKey="lawfirm_test" storeName="test" />
        );
      });
    }).not.toThrow();
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  it('switches from not-writing to writing when isDBLoading flips false', async () => {
    act(() => {
      root.render(
        <TestComponent initialData={[{ id: '1' }]} loading={true} lsKey="lawfirm_test" storeName="test" />
      );
    });
    expect(localStorage.getItem('lawfirm_test')).toBeNull();

    act(() => {
      root.render(
        <TestComponent initialData={[{ id: '1' }]} loading={false} lsKey="lawfirm_test" storeName="test" />
      );
    });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(localStorage.getItem('lawfirm_test')).toBe(JSON.stringify([{ id: '1' }]));
  });
});
