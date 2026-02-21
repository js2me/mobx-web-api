import { safeJsonParse } from 'yummies/data';
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
  set value(value: TValue);
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

const createStorageScope = (
  scope: StorageScope,
  options?: CreateStorageDataOptions,
): StorageValues => {
  const prefix = options?.prefix ?? '';
  const atoms = new Map<string, IEnhancedAtom>();

  const toStorageKey = (key: string) => `${prefix}${key}`;

  const getAtom = (key: string) => {
    if (!atoms.has(key)) {
      const storageKey = toStorageKey(key);

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

  return new Proxy(
    {},
    {
      get(_, property) {
        if (typeof property !== 'string') {
          return undefined;
        }

        const atom = getAtom(property);
        atom.reportObserved();

        return getStorage(scope)?.getItem(toStorageKey(property)) ?? null;
      },
      set(_, rawProperty, value) {
        const property = String(rawProperty);
        const atom = getAtom(property);
        const storage = getStorage(scope);
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
        getStorage(scope)?.removeItem(toStorageKey(property));
        atom.reportChanged();
        return true;
      },
    },
  ) as StorageValues;
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
  let localScope: StorageValues | undefined;
  let sessionScope: StorageValues | undefined;
  const storageData: StorageData = {
    get local() {
      localScope ??= createStorageScope('local', options);
      return localScope;
    },
    get session() {
      sessionScope ??= createStorageScope('session', options);
      return sessionScope;
    },
    key<TValue>(
      key: string,
      defaultValue: TValue,
      scope: StorageScope = 'local',
    ) {
      const storageDataKey = {} as { value: TValue };
      const isString = typeof defaultValue === 'string';

      Object.defineProperty(storageDataKey, 'value', {
        get: () => {
          if (isString) {
            return storageData[scope][key] == null
              ? defaultValue
              : storageData[scope][key];
          }

          return safeJsonParse(storageData[scope][key], defaultValue);
        },
        set: (value: TValue) => {
          if (value == null) {
            delete storageData[scope][key];
            return;
          }

          storageData[scope][key] = isString
            ? String(value)
            : JSON.stringify(value);
        },
        enumerable: true,
        configurable: true,
      });

      return storageDataKey as StorageDataKey<TValue>;
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
