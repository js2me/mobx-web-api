import { createEnhancedAtom, type IEnhancedAtom } from 'yummies/mobx';
import type { Dict } from 'yummies/types';

/**
 * Reactive storage scope where keys map to string values from Web Storage.
 *
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Storage)
 */
export type StorageScope = Dict<string | null>;

export type StorageKind = 'local' | 'session';

/**
 * Reactive API for both local and session storage scopes.
 *
 * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/storage-data.html)
 * [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
 * [MDN sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage)
 */
export type StorageData = Dict<StorageScope, StorageKind>;

export interface CreateStorageDataOptions {
  /**
   * Prefix for real storage keys.
   * Result key format: `${prefix}${key}`.
   */
  prefix?: string;
}

const getStorage = (kind: StorageKind): Storage | undefined => {
  try {
    if (!globalThis.window) {
      return undefined;
    }

    return kind === 'local'
      ? globalThis.localStorage
      : globalThis.sessionStorage;
  } catch {
    return undefined;
  }
};

const createStorageScope = (
  kind: StorageKind,
  options?: CreateStorageDataOptions,
): StorageScope => {
  const prefix = options?.prefix ?? '';
  const atoms = new Map<string, IEnhancedAtom>();

  const toStorageKey = (key: string) => `${prefix}${key}`;

  const getAtom = (key: string) => {
    if (!atoms.has(key)) {
      const storageKey = toStorageKey(key);

      const atom = createEnhancedAtom<{ dispose?: VoidFunction }>(
        process.env.NODE_ENV === 'production'
          ? ''
          : `storageData:${kind}:${storageKey}`,
        (atom) => {
          const storageListener = (event: StorageEvent) => {
            if (
              event.key === storageKey &&
              event.storageArea === getStorage(kind)
            ) {
              atom.reportChanged();
            }
          };
          globalThis.addEventListener?.('storage', storageListener);
          atom.meta.dispose = () =>
            globalThis.removeEventListener?.('storage', storageListener);
        },
        (atom) => {
          atom.meta.dispose?.();
          atom.meta.dispose = undefined;
        },
      );

      atoms.set(key, atom);
    }

    return atoms.get(key)!;
  };

  return new Proxy(
    {},
    {
      get(_, property) {
        if (typeof property !== 'string') {
          return undefined;
        }

        const atom = getAtom(property);
        atom.reportObserved();

        return getStorage(kind)?.getItem(toStorageKey(property)) ?? null;
      },
      set(_, rawProperty, value) {
        const property = String(rawProperty);
        const atom = getAtom(property);
        const storage = getStorage(kind);
        const storageKey = toStorageKey(property);

        if (value == null) {
          storage?.removeItem(storageKey);
        } else {
          storage?.setItem(storageKey, String(value));
        }

        atom.reportChanged();
        return true;
      },
      deleteProperty(_, rawProperty) {
        const property = String(rawProperty);
        const atom = getAtom(property);
        getStorage(kind)?.removeItem(toStorageKey(property));
        atom.reportChanged();
        return true;
      },
    },
  ) as StorageScope;
};

/**
 * Creates reactive Storage API with lazy `local` and `session` scopes.
 *
 * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/storage-data.html#createstoragedata-options)
 * Uses [Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Storage)
 * and [Window: storage event](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event).
 */
export const createStorageData = (
  options?: CreateStorageDataOptions,
): StorageData => {
  let localScope: StorageScope | undefined;
  let sessionScope: StorageScope | undefined;

  return {
    get local() {
      localScope ??= createStorageScope('local', options);
      return localScope;
    },
    get session() {
      sessionScope ??= createStorageScope('session', options);
      return sessionScope;
    },
  };
};

/**
 * Default reactive storage instance.
 *
 * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/storage-data.html)
 * [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
 * [MDN sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage)
 */
export const storageData = createStorageData();
