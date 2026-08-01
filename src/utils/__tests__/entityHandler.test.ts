/**
 * Tests for entityHandler.ts — handleEntityAction unified mutation helper.
 *
 * v2.9.6: Unit tests for the new helper that unifies entity add/update/delete.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleEntityAction } from '../entityHandler';
import * as idb from '../indexedDBHelper';

interface TestItem {
  id: string;
  name: string;
  value: number;
}

// Mocks
vi.mock('../indexedDBHelper', () => ({
  putIntoStore: vi.fn().mockResolvedValue(undefined),
  removeFromStore: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('handleEntityAction', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ─── ADD ────────────────────────────────────────────────────────────────
  describe('action: add', () => {
    it('prepends item to state', () => {
      const prev: TestItem[] = [{ id: '1', name: 'existing', value: 10 }];
      const newItem: TestItem = { id: '2', name: 'new', value: 20 };
      const setData = vi.fn();

      handleEntityAction(setData, 'add', newItem, 'test_store', 'test_ls_key');

      // Call the updater passed to setData and verify the result
      const updater = setData.mock.calls[0][0];
      const result = updater(prev);
      expect(result).toEqual([newItem, ...prev]);
    });

    it('writes to localStorage with the new state', () => {
      const setData = vi.fn();
      const newItem: TestItem = { id: '2', name: 'new', value: 20 };

      handleEntityAction(setData, 'add', newItem, 'test_store', 'test_ls_key');

      const updater = setData.mock.calls[0][0];
      const result = updater([]);
      // The updater itself writes to localStorage
      expect(localStorage.getItem('test_ls_key')).toBe(JSON.stringify([newItem]));
      expect(result).toEqual([newItem]);
    });

    it('calls putIntoStore with the new item', async () => {
      const setData = vi.fn();
      const newItem: TestItem = { id: '2', name: 'new', value: 20 };

      await handleEntityAction(setData, 'add', newItem, 'test_store', 'test_ls_key');

      expect(idb.putIntoStore).toHaveBeenCalledWith('test_store', newItem);
    });

    it('skips localStorage when skipLocalStorage=true', () => {
      const setData = vi.fn();
      const newItem: TestItem = { id: '2', name: 'new', value: 20 };

      handleEntityAction(setData, 'add', newItem, 'test_store', 'test_ls_key', {
        skipLocalStorage: true,
      });

      const updater = setData.mock.calls[0][0];
      updater([]);
      expect(localStorage.getItem('test_ls_key')).toBeNull();
    });

    it('skips IndexedDB when skipIndexedDB=true', async () => {
      const setData = vi.fn();
      const newItem: TestItem = { id: '2', name: 'new', value: 20 };

      await handleEntityAction(setData, 'add', newItem, 'test_store', 'test_ls_key', {
        skipIndexedDB: true,
      });

      expect(idb.putIntoStore).not.toHaveBeenCalled();
    });
  });

  // ─── UPDATE ─────────────────────────────────────────────────────────────
  describe('action: update', () => {
    it('replaces the matching item in state', () => {
      const prev: TestItem[] = [
        { id: '1', name: 'a', value: 10 },
        { id: '2', name: 'b', value: 20 },
      ];
      const updated: TestItem = { id: '2', name: 'b-updated', value: 25 };
      const setData = vi.fn();

      handleEntityAction(setData, 'update', updated, 'test_store', 'test_ls_key');

      const updater = setData.mock.calls[0][0];
      const result = updater(prev);
      expect(result).toEqual([
        { id: '1', name: 'a', value: 10 },
        { id: '2', name: 'b-updated', value: 25 },
      ]);
    });

    it('uses custom idField when provided', () => {
      interface CustomId { uuid: string; name: string }
      const prev: CustomId[] = [
        { uuid: 'a', name: 'first' },
        { uuid: 'b', name: 'second' },
      ];
      const updated: CustomId = { uuid: 'b', name: 'second-updated' };
      const setData = vi.fn();

      handleEntityAction<CustomId>(setData, 'update', updated, 'store', 'ls', {
        idField: 'uuid',
      });

      const updater = setData.mock.calls[0][0];
      const result = updater(prev);
      expect(result[1].name).toBe('second-updated');
    });

    it('leaves state unchanged if id not found', () => {
      const prev: TestItem[] = [{ id: '1', name: 'a', value: 10 }];
      const updated: TestItem = { id: '99', name: 'z', value: 0 };
      const setData = vi.fn();

      handleEntityAction(setData, 'update', updated, 'test_store', 'test_ls_key');

      const updater = setData.mock.calls[0][0];
      expect(updater(prev)).toEqual(prev);
    });

    it('calls putIntoStore with updated item', async () => {
      const setData = vi.fn();
      const updated: TestItem = { id: '1', name: 'updated', value: 99 };

      await handleEntityAction(setData, 'update', updated, 'test_store');

      expect(idb.putIntoStore).toHaveBeenCalledWith('test_store', updated);
    });
  });

  // ─── DELETE ─────────────────────────────────────────────────────────────
  describe('action: delete', () => {
    it('removes the matching item from state', () => {
      const prev: TestItem[] = [
        { id: '1', name: 'a', value: 10 },
        { id: '2', name: 'b', value: 20 },
      ];
      const toDelete: TestItem = { id: '2', name: 'b', value: 20 };
      const setData = vi.fn();

      handleEntityAction(setData, 'delete', toDelete, 'test_store', 'test_ls_key');

      const updater = setData.mock.calls[0][0];
      expect(updater(prev)).toEqual([{ id: '1', name: 'a', value: 10 }]);
    });

    it('calls removeFromStore with the item id', async () => {
      const setData = vi.fn();
      const toDelete: TestItem = { id: '42', name: 'x', value: 0 };

      await handleEntityAction(setData, 'delete', toDelete, 'test_store');

      expect(idb.removeFromStore).toHaveBeenCalledWith('test_store', '42');
    });
  });

  // ─── Error handling ────────────────────────────────────────────────────
  describe('error handling', () => {
    it('logs and continues when localStorage write throws (quota)', () => {
      const setData = vi.fn();
      const newItem: TestItem = { id: '1', name: 'x', value: 0 };

      // Mock localStorage.setItem to throw
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      // Should not throw
      expect(() => {
        handleEntityAction(setData, 'add', newItem, 'test_store', 'test_ls_key');
      }).not.toThrow();

      setItemSpy.mockRestore();
    });

    it('logs and continues when IDB write fails', async () => {
      const setData = vi.fn();
      const newItem: TestItem = { id: '1', name: 'x', value: 0 };
      vi.mocked(idb.putIntoStore).mockRejectedValueOnce(new Error('IDB error'));

      // Should not throw
      await expect(
        handleEntityAction(setData, 'add', newItem, 'test_store', 'test_ls_key')
      ).resolves.toBeUndefined();
    });
  });

  // ─── Functional setData pattern (avoid stale closure) ─────────────────
  describe('functional setData', () => {
    it('updater function uses prev parameter (not closure)', () => {
      const setData = vi.fn();
      const newItem: TestItem = { id: '1', name: 'x', value: 0 };

      handleEntityAction(setData, 'add', newItem, 'store', 'ls');

      const updater = setData.mock.calls[0][0];
      // Simulate React calling updater with current state
      const result = updater([{ id: '99', name: 'prev', value: 1 }]);
      expect(result).toEqual([newItem, { id: '99', name: 'prev', value: 1 }]);
    });
  });
});
