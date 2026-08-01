// Append atomicMultiStoreWrite to indexedDBHelper.ts
const fs = require('fs');
const path = 'D:\\قانوني 7\\src\\utils\\indexedDBHelper.ts';
let content = fs.readFileSync(path, 'utf8');
const suffix = `

/**
 * v2.8.1: Atomic write across multiple stores in a single transaction.
 */
export async function atomicMultiStoreWrite<T = any>(
  updates: Record<string, T[]>
): Promise<void> {
  const db = await initIndexedDB();
  const storeNames = Object.keys(updates).filter(name => {
    const items = updates[name];
    return Array.isArray(items) && items.length > 0;
  });

  if (storeNames.length === 0) {
    return;
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeNames, 'readwrite');

    for (const storeName of storeNames) {
      const store = transaction.objectStore(storeName);
      const items = updates[storeName];
      items.forEach(item => {
        store.put(item);
      });
    }

    transaction.oncomplete = () => {
      logger.info('[atomicMultiStoreWrite] Updated ' + storeNames.length + ' stores atomically');
      resolve();
    };

    transaction.onerror = () => {
      logger.error('[atomicMultiStoreWrite] Transaction failed:', transaction.error);
      reject(transaction.error);
    };

    transaction.onabort = () => {
      logger.warn('[atomicMultiStoreWrite] Transaction aborted (rolled back)');
      reject(new Error('Transaction aborted'));
    };
  });
}
`;
fs.writeFileSync(path, content + suffix, 'utf8');
console.log('OK: appended');
