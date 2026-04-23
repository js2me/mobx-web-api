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

const createMutationTrackedValue = <TValue>(
  value: TValue,
  onMutate: (nextValue: TValue, serialized?: string) => void,
): TValue => {
  if (
    value == null ||
    (typeof value !== 'object' && typeof value !== 'function')
  ) {
    return value;
  }

  const rawToProxy = new WeakMap<object, object>();
  const proxyToRaw = new WeakMap<object, object>();
  let callDepth = 0;
  let hasPendingMutation = false;
  let mutationVersion = 0;
  let lastSerialized = JSON.stringify(value);

  const unwrap = <T>(target: T): T => {
    if (
      target == null ||
      (typeof target !== 'object' && typeof target !== 'function')
    ) {
      return target;
    }

    return (proxyToRaw.get(target) as T | undefined) ?? target;
  };

  const commitIfChanged = () => {
    const serialized = JSON.stringify(value);

    if (serialized !== lastSerialized) {
      lastSerialized = serialized;
      mutationVersion += 1;
      onMutate(value, serialized);
    }
  };

  const scheduleCommit = () => {
    if (callDepth > 0) {
      hasPendingMutation = true;
      return;
    }

    commitIfChanged();
  };

  const wrap = <T>(target: T): T => {
    if (
      target == null ||
      (typeof target !== 'object' && typeof target !== 'function')
    ) {
      return target;
    }

    const rawTarget = unwrap(target);
    const cached = rawToProxy.get(rawTarget);

    if (cached) {
      return cached as T;
    }

    const proxy = new Proxy(rawTarget, {
      get(currentTarget, property, receiver) {
        const currentValue = Reflect.get(currentTarget, property, receiver);

        if (typeof currentValue === 'function') {
          return (...args: unknown[]) => {
            const previousVersion = mutationVersion;
            callDepth += 1;

            try {
              let result: unknown;
              const normalizedArgs = args.map((arg) => unwrap(arg));

              try {
                result = Reflect.apply(currentValue, receiver, normalizedArgs);
              } catch {
                // Some built-in methods require branded `this` and reject proxies
                // (Date, TypedArray, etc.). Fallback to raw target and detect
                // mutation via commitIfChanged below.
                result = Reflect.apply(
                  currentValue,
                  currentTarget,
                  normalizedArgs,
                );
              }

              return wrap(result);
            } finally {
              callDepth -= 1;

              if (callDepth === 0 && hasPendingMutation) {
                hasPendingMutation = false;
                commitIfChanged();
              }

              // Fallback for values that mutate internal slots
              // without triggering proxy traps (e.g. Date#set*).
              if (previousVersion === mutationVersion) {
                commitIfChanged();
              }
            }
          };
        }

        return wrap(currentValue);
      },
      set(currentTarget, property, nextValue) {
        const updated = Reflect.set(
          currentTarget,
          property,
          unwrap(nextValue),
          currentTarget,
        );

        if (updated) {
          scheduleCommit();
        }

        return updated;
      },
      deleteProperty(currentTarget, property) {
        const updated = Reflect.deleteProperty(currentTarget, property);

        if (updated) {
          scheduleCommit();
        }

        return updated;
      },
      defineProperty(currentTarget, property, descriptor) {
        const updated = Reflect.defineProperty(currentTarget, property, {
          ...descriptor,
          value: unwrap(descriptor.value),
        });

        if (updated) {
          scheduleCommit();
        }

        return updated;
      },
    });

    rawToProxy.set(rawTarget, proxy);
    proxyToRaw.set(proxy, rawTarget);

    return proxy as T;
  };

  return wrap(value);
};

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
      let cachedRawValue: string | null | undefined;
      let cachedTrackedValue: TValue | undefined;

      const reset = () => {
        cachedRawValue = null;
        cachedTrackedValue = undefined;
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

            const rawValue = values[key];

            if (
              cachedTrackedValue !== undefined &&
              rawValue === cachedRawValue
            ) {
              return cachedTrackedValue;
            }

            const parsedValue = safeJsonParse(rawValue, defaultValue);

            cachedTrackedValue = createMutationTrackedValue(
              parsedValue,
              (nextValue, serialized) => {
                values[key] = serialized ?? JSON.stringify(nextValue);
                cachedRawValue = values[key];
              },
            );
            cachedRawValue = rawValue;

            return cachedTrackedValue;
          }

          return undefined;
        },
        set(_, property, value: TValue) {
          if (property === 'value') {
            if (value == null) {
              reset();
            } else {
              values[key] = isString ? String(value) : JSON.stringify(value);
              cachedRawValue = values[key];
              cachedTrackedValue = isString
                ? undefined
                : createMutationTrackedValue(value, (nextValue, serialized) => {
                    values[key] = serialized ?? JSON.stringify(nextValue);
                    cachedRawValue = values[key];
                  });
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
