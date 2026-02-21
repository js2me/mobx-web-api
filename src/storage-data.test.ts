import { reaction } from 'mobx';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
} from 'vitest';
import { createStorageData } from './storage-data.js';

describe('storageData', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    globalThis.sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads and writes local storage keys', () => {
    const storageData = createStorageData();

    expect(storageData.local.token).toBeNull();

    storageData.local.token = 'abc';
    expect(storageData.local.token).toBe('abc');
    expect(globalThis.localStorage.getItem('token')).toBe('abc');
  });

  it('reads and writes session storage keys', () => {
    const storageData = createStorageData();

    expect(storageData.session.draft).toBeNull();

    storageData.session.draft = 'v1';
    expect(storageData.session.draft).toBe('v1');
    expect(globalThis.sessionStorage.getItem('draft')).toBe('v1');
  });

  it('removes key on delete and nullish assignment', () => {
    const storageData = createStorageData();

    storageData.local.key = 'value';
    expect(globalThis.localStorage.getItem('key')).toBe('value');

    delete storageData.local.key;
    expect(storageData.local.key).toBeNull();
    expect(globalThis.localStorage.getItem('key')).toBeNull();

    storageData.local.key = 'value-2';
    storageData.local.key = null;
    expect(globalThis.localStorage.getItem('key')).toBeNull();
  });

  it('supports key prefix in createStorageData options', () => {
    const storageData = createStorageData({ prefix: 'app:' });

    storageData.local.token = '123';
    storageData.session.draft = 'd1';

    expect(storageData.local.token).toBe('123');
    expect(storageData.session.draft).toBe('d1');
    expect(globalThis.localStorage.getItem('app:token')).toBe('123');
    expect(globalThis.sessionStorage.getItem('app:draft')).toBe('d1');
    expect(globalThis.localStorage.getItem('token')).toBeNull();
    expect(globalThis.sessionStorage.getItem('draft')).toBeNull();
  });

  it('stringifies non-string values before save', () => {
    const storageData = createStorageData();

    storageData.local.count = 42 as unknown as string;
    storageData.local.enabled = true as unknown as string;

    expect(storageData.local.count).toBe('42');
    expect(storageData.local.enabled).toBe('true');
    expect(globalThis.localStorage.getItem('count')).toBe('42');
    expect(globalThis.localStorage.getItem('enabled')).toBe('true');
  });

  it('updates reactions when value changes', () => {
    const storageData = createStorageData();
    const valueSpy = vi.fn();

    const dispose = reaction(
      () => storageData.local.theme,
      (value) => valueSpy(value),
    );

    storageData.local.theme = 'dark';
    storageData.local.theme = 'light';
    delete storageData.local.theme;

    expect(valueSpy).toHaveBeenCalledTimes(3);
    expect(valueSpy).toHaveBeenNthCalledWith(1, 'dark');
    expect(valueSpy).toHaveBeenNthCalledWith(2, 'light');
    expect(valueSpy).toHaveBeenNthCalledWith(3, null);

    dispose();
  });

  it('updates reactions when deleting dashed key', () => {
    const storageData = createStorageData();
    const valueSpy = vi.fn();

    const dispose = reaction(
      () => storageData.local['auth-token'],
      (value) => valueSpy(value),
    );

    storageData.local['auth-token'] = 'token-value';
    delete storageData.local['auth-token'];

    expect(valueSpy).toHaveBeenCalledTimes(2);
    expect(valueSpy).toHaveBeenNthCalledWith(1, 'token-value');
    expect(valueSpy).toHaveBeenNthCalledWith(2, null);
    expect(globalThis.localStorage.getItem('auth-token')).toBeNull();

    dispose();
  });

  it('updates session reactions when deleting dashed key', () => {
    const storageData = createStorageData();
    const valueSpy = vi.fn();

    const dispose = reaction(
      () => storageData.session['auth-token'],
      (value) => valueSpy(value),
    );

    storageData.session['auth-token'] = 'token-value';
    delete storageData.session['auth-token'];

    expect(valueSpy).toHaveBeenCalledTimes(2);
    expect(valueSpy).toHaveBeenNthCalledWith(1, 'token-value');
    expect(valueSpy).toHaveBeenNthCalledWith(2, null);
    expect(globalThis.sessionStorage.getItem('auth-token')).toBeNull();

    dispose();
  });

  it('handles storage event updates from external changes', () => {
    const storageData = createStorageData({ prefix: 'app:' });
    const valueSpy = vi.fn();

    const dispose = reaction(
      () => storageData.local.token,
      (value) => valueSpy(value),
    );

    globalThis.localStorage.setItem('app:token', 'external');
    globalThis.dispatchEvent(
      new StorageEvent('storage', {
        key: 'app:token',
        newValue: 'external',
        storageArea: globalThis.localStorage,
      }),
    );

    expect(valueSpy).toHaveBeenCalledTimes(1);
    expect(valueSpy).toHaveBeenNthCalledWith(1, 'external');

    dispose();
  });

  it('handles external remove via storage event', () => {
    const storageData = createStorageData({ prefix: 'app:' });
    const valueSpy = vi.fn();

    globalThis.localStorage.setItem('app:token', 'before-remove');

    const dispose = reaction(
      () => storageData.local.token,
      (value) => valueSpy(value),
    );

    globalThis.localStorage.removeItem('app:token');
    globalThis.dispatchEvent(
      new StorageEvent('storage', {
        key: 'app:token',
        newValue: null,
        oldValue: 'before-remove',
        storageArea: globalThis.localStorage,
      }),
    );

    expect(valueSpy).toHaveBeenCalledTimes(1);
    expect(valueSpy).toHaveBeenNthCalledWith(1, null);

    dispose();
  });

  it('ignores unrelated storage events', () => {
    const storageData = createStorageData({ prefix: 'app:' });
    const valueSpy = vi.fn();

    const dispose = reaction(
      () => storageData.local.token,
      (value) => valueSpy(value),
    );

    globalThis.dispatchEvent(
      new StorageEvent('storage', {
        key: 'app:another-key',
        newValue: 'external',
        storageArea: globalThis.localStorage,
      }),
    );

    globalThis.dispatchEvent(
      new StorageEvent('storage', {
        key: 'app:token',
        newValue: 'external',
        storageArea: globalThis.sessionStorage,
      }),
    );

    expect(valueSpy).not.toHaveBeenCalled();

    dispose();
  });

  it('creates local and session scopes lazily and memoizes them', () => {
    const storageData = createStorageData();

    const local1 = storageData.local;
    const local2 = storageData.local;
    const session1 = storageData.session;
    const session2 = storageData.session;

    expect(local1).toBe(local2);
    expect(session1).toBe(session2);
    expect(local1).not.toBe(session1);
  });

  it('keeps instances with different prefixes isolated', () => {
    const appStorage = createStorageData({ prefix: 'app:' });
    const authStorage = createStorageData({ prefix: 'auth:' });

    appStorage.local.token = 'app-token';
    authStorage.local.token = 'auth-token';

    expect(appStorage.local.token).toBe('app-token');
    expect(authStorage.local.token).toBe('auth-token');
    expect(globalThis.localStorage.getItem('app:token')).toBe('app-token');
    expect(globalThis.localStorage.getItem('auth:token')).toBe('auth-token');
  });

  it('attaches and detaches storage listener only while observed', () => {
    const storageData = createStorageData();
    const addEventListenerSpy = vi.spyOn(globalThis, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(globalThis, 'removeEventListener');

    const dispose = reaction(
      () => storageData.local.token,
      () => undefined,
    );

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'storage',
      expect.any(Function),
    );

    dispose();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'storage',
      expect.any(Function),
    );
  });

  it('creates typed key accessor with local scope', () => {
    const storageData = createStorageData();
    const numbersKey = storageData.key<number[]>('numbers', []);

    numbersKey.value = [1, 2, 3, 4];

    expect(globalThis.localStorage.getItem('numbers')).toBe('[1,2,3,4]');
    expect(numbersKey.value).toEqual([1, 2, 3, 4]);
  });

  it('stores and reads string key as raw string', () => {
    const storageData = createStorageData();
    const tokenKey = storageData.key<string>('auth-token', '');

    tokenKey.value = 'plain-token';
    expect(globalThis.localStorage.getItem('auth-token')).toBe('plain-token');
    expect(tokenKey.value).toBe('plain-token');

    globalThis.localStorage.setItem('auth-token', 'legacy-raw-token');
    expect(tokenKey.value).toBe('legacy-raw-token');
  });

  it('parses JSON value when possible for non-string defaults', () => {
    const storageData = createStorageData();
    const settingsKey = storageData.key<{ theme: string }>('settings', {
      theme: 'light',
    });

    globalThis.localStorage.setItem('settings', '{"theme":"dark"}');
    expect(settingsKey.value).toEqual({ theme: 'dark' });
  });

  it('updates reactions for typed key and supports delete via null', () => {
    const storageData = createStorageData();
    const valueSpy = vi.fn();

    const authTokenKey = storageData.key<string | null>('auth-token', null);

    const dispose = reaction(
      () => authTokenKey.value,
      (value) => valueSpy(value),
    );

    authTokenKey.value = 'token-1';
    authTokenKey.value = null;

    expect(valueSpy).toHaveBeenCalledTimes(2);
    expect(valueSpy).toHaveBeenNthCalledWith(1, 'token-1');
    expect(valueSpy).toHaveBeenNthCalledWith(2, null);
    expect(globalThis.localStorage.getItem('auth-token')).toBeNull();

    dispose();
  });

  it('infers getter and setter types for storageData.key', () => {
    const storageData = createStorageData();
    const key = storageData.key<number[]>('typed-array', []);

    key.value = [1, 2, 3];
    expect(globalThis.localStorage.getItem('typed-array')).toBe('[1,2,3]');
    expect(key.value).toEqual([1, 2, 3]);
    expectTypeOf(key.value).toEqualTypeOf<number[]>();
  });
});
