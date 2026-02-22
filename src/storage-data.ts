import { isUnsafeProperty, safeJsonParse } from 'yummies/data';
import { createEnhancedAtom, type IEnhancedAtom } from 'yummies/mobx';
import type { Dict } from 'yummies/types';

/**
 * Reactive storage values where keys map to string values from Web Storage.
 *
 * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Storage)
 */
export type StorageValues = Dict<string | null>;

export type StorageScope = 'local' | 'session';

export interface CreateStorageDataOptions {
  /**
   * Prefix for real storage keys.
   * Result key format: `${prefix}${key}`.
   */
  prefix?: string;
}

export interface StorageDataKey<TValue = string | null> {
  /**
   * Reactive value for one storage key.
   */
  get value(): TValue;
  /**
   * Updates reactive value for one storage key.
   * Assign `null` to remove the key from storage.
   */
  set value(value: TValue | null);
  /**
   * Clears the storage key.
   * Works the same as `value = null`.
   */
  reset(): void;
}

/**
 * Reactive API for both local and session storage scopes.
 *
 * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/storage-data.html)
 * [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
 * [MDN sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage)
 */
export interface StorageData extends Dict<StorageValues, StorageScope> {
  /**
   * Typed helper for one key in local/session storage.
   *
   * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/storage-data.html)
   */
  key<TValue>(
    key: string,
    defaultValue: TValue,
    scope?: StorageScope,
  ): StorageDataKey<TValue>;
}

const getStorage = (scope: StorageScope): Storage | undefined => {
  try {
    if (!globalThis.window) {
      return undefined;
    }

    return scope === 'local'
      ? globalThis.localStorage
      : globalThis.sessionStorage;
  } catch {
    return undefined;
  }
};

const toStorageKey = (key: string, prefix = '') => `${prefix}${key}`;

const createStorageValues = (
  scope: StorageScope,
  options?: CreateStorageDataOptions,
): StorageValues => {
  const atoms = new Map<string, IEnhancedAtom>();

  const getAtom = (key: string) => {
    if (!atoms.has(key)) {
      const storageKey = toStorageKey(key, options?.prefix);

      const atom = createEnhancedAtom<{ dispose?: VoidFunction }>(
        process.env.NODE_ENV === 'production'
          ? ''
          : `storageData:${scope}:${storageKey}`,
        (atom) => {
          const storageListener = (event: StorageEvent) => {
            if (
              event.key === storageKey &&
              event.storageArea === getStorage(scope)
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

  return new Proxy(Object.create(null), {
    get(_, key) {
      if (typeof key !== 'string' || isUnsafeProperty(key)) {
        return undefined;
      }

      getAtom(key).reportObserved();
      const storageKey = toStorageKey(key, options?.prefix);

      return getStorage(scope)?.getItem(storageKey) ?? null;
    },
    set(_, rawKey, value) {
      if (typeof rawKey !== 'string' || isUnsafeProperty(rawKey)) {
        return true;
      }

      const key = String(rawKey);
      const storage = getStorage(scope);
      const storageKey = toStorageKey(key, options?.prefix);

      if (value == null) {
        storage?.removeItem(storageKey);
      } else {
        storage?.setItem(storageKey, String(value));
      }

      getAtom(key).reportChanged();
      return true;
    },
    deleteProperty(_, rawKey) {
      if (typeof rawKey !== 'string' || isUnsafeProperty(rawKey)) {
        return true;
      }

      const key = String(rawKey);
      const storageKey = toStorageKey(key, options?.prefix);
      getStorage(scope)?.removeItem(storageKey);
      getAtom(key).reportChanged();
      return true;
    },
  }) as StorageValues;
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
  const storages: Partial<Record<StorageScope, StorageValues>> = {};

  const getStorageValues = (scope: StorageScope) => {
    storages[scope] ??= createStorageValues(
      scope === 'local' ? 'local' : 'session',
      options,
    );
    return storages[scope];
  };

  const storageData: StorageData = {
    get local() {
      return getStorageValues('local');
    },
    get session() {
      return getStorageValues('session');
    },
    key<TValue>(
      key: string,
      defaultValue: TValue,
      scope: StorageScope = 'local',
    ) {
      const isString = typeof defaultValue === 'string';
      const values = getStorageValues(scope);
      const reset = () => {
        delete values[key];
      };

      return new Proxy(Object.create(null), {
        get(_, property) {
          if (property === 'reset') {
            return reset;
          }
          if (property === 'value') {
            if (isString) {
              return values[key] == null ? defaultValue : values[key];
            }

            return safeJsonParse(values[key], defaultValue);
          }

          return undefined;
        },
        set(_, property, value: TValue) {
          if (property === 'value') {
            if (value == null) {
              reset();
            } else {
              values[key] = isString ? String(value) : JSON.stringify(value);
            }
          }

          return true;
        },
        deleteProperty(_, property) {
          if (property === 'value') {
            reset();
          }

          return true;
        },
      }) as StorageDataKey<TValue>;
    },
  };

  return storageData;
};

/**
 * Default reactive storage instance.
 *
 * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/storage-data.html)
 * [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
 * [MDN sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage)
 */
export const storageData = createStorageData();
