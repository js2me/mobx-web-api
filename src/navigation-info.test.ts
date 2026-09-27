import { reaction } from 'mobx';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createNavigationInfo,
  type NavigationEntry,
  type NavigationInfo,
} from './navigation-info.js';

type NavigationEvent =
  | 'currententrychange'
  | 'navigate'
  | 'navigatesuccess'
  | 'navigateerror';

type FakeNavigation = EventTarget & {
  currentEntry: NavigationEntry | null;
  entries: ReturnType<typeof vi.fn>;
  canGoBack: boolean;
  canGoForward: boolean;
  navigate: ReturnType<typeof vi.fn>;
  back: ReturnType<typeof vi.fn>;
  forward: ReturnType<typeof vi.fn>;
  reload: ReturnType<typeof vi.fn>;
  traverseTo: ReturnType<typeof vi.fn>;
  emit(event: NavigationEvent): void;
};

const entry = (key: string, index: number): NavigationEntry => ({
  id: `id-${key}`,
  key,
  url: `https://example.com/${key}`,
  index,
  sameDocument: true,
  getState: () => undefined,
});

const createFakeNavigation = (): FakeNavigation => {
  const listeners: Record<NavigationEvent, Set<() => void>> = {
    currententrychange: new Set(),
    navigate: new Set(),
    navigatesuccess: new Set(),
    navigateerror: new Set(),
  };
  const result = {
    committed: Promise.resolve(entry('next', 1)),
    finished: Promise.resolve(entry('next', 1)),
  };
  const fakeNavigation = {
    currentEntry: entry('current', 0),
    entries: vi.fn(() => [entry('current', 0)]),
    canGoBack: false,
    canGoForward: true,
    navigate: vi.fn(() => result),
    back: vi.fn(() => result),
    forward: vi.fn(() => result),
    reload: vi.fn(() => result),
    traverseTo: vi.fn(() => result),
    addEventListener: vi.fn((event: string, listener: () => void) => {
      if (event in listeners) {
        listeners[event as NavigationEvent].add(listener);
      }
    }),
    removeEventListener: vi.fn((event: string, listener: () => void) => {
      if (event in listeners) {
        listeners[event as NavigationEvent].delete(listener);
      }
    }),
    emit(event: NavigationEvent) {
      for (const listener of listeners[event]) {
        listener();
      }
    },
  };

  return fakeNavigation as unknown as FakeNavigation;
};

describe('navigationInfo', () => {
  let navigationInfo: NavigationInfo;
  const originalNavigation = Object.getOwnPropertyDescriptor(
    globalThis,
    'navigation',
  );

  beforeEach(() => {
    vi.clearAllMocks();
    navigationInfo = createNavigationInfo();
  });

  afterEach(() => {
    if (originalNavigation) {
      Object.defineProperty(globalThis, 'navigation', originalNavigation);
    } else {
      delete (globalThis as typeof globalThis & { navigation?: unknown })
        .navigation;
    }
  });

  it('is SSR-safe when the Navigation API is unavailable', () => {
    Object.defineProperty(globalThis, 'navigation', {
      value: undefined,
      configurable: true,
    });

    expect(navigationInfo.isSupported).toBe(false);
    expect(navigationInfo.currentEntry).toMatchObject({
      id: '',
      key: '',
      url: '',
      index: -1,
      sameDocument: false,
    });
    expect(navigationInfo.currentEntry).toBe(navigationInfo.currentEntry);
    expect(navigationInfo.currentEntry.getState()).toBeUndefined();
    expect(navigationInfo.state).toBeUndefined();
    expect(navigationInfo.url).toBeNull();
    expect(navigationInfo.path).toBe('');
    expect(navigationInfo.query).toBe('');
    expect(navigationInfo.queryData).toEqual({});
    expect(navigationInfo.hash).toBe('');
    expect(navigationInfo.entries).toEqual([]);
    expect(navigationInfo.canGoBack).toBe(false);
    expect(navigationInfo.canGoForward).toBe(false);
    expect(navigationInfo.back()).toBeUndefined();
    expect(
      navigationInfo.navigate('/settings', { query: { tab: 'profile' } }),
    ).toBeUndefined();
  });

  it('isolates SSR snapshots between instances', () => {
    Object.defineProperty(globalThis, 'navigation', {
      value: undefined,
      configurable: true,
    });

    const first = createNavigationInfo({
      ssrSnapshot: {
        ...entry('first', 0),
        getState: () => ({ page: 'first' }),
      },
    });
    const second = createNavigationInfo({ ssrSnapshot: entry('second', 0) });

    expect(first.currentEntry?.key).toBe('first');
    expect(first.path).toBe('/first');
    expect(first.state).toEqual({ page: 'first' });
    expect(second.currentEntry?.key).toBe('second');
    expect(second.path).toBe('/second');
    expect(second.state).toBeUndefined();
    expect(navigationInfo.currentEntry.index).toBe(-1);
  });

  it('uses the browser entry instead of the SSR snapshot when available', () => {
    const info = createNavigationInfo({ ssrSnapshot: entry('server', 0) });
    const navigation = createFakeNavigation();
    Object.defineProperty(globalThis, 'navigation', {
      value: navigation,
      configurable: true,
    });

    expect(info.currentEntry?.key).toBe('current');

    navigation.currentEntry = null;
    expect(info.currentEntry.key).toBe('server');
    expect(navigationInfo.currentEntry.index).toBe(-1);
  });

  it('subscribes and disposes each instance independently', () => {
    const navigation = createFakeNavigation();
    Object.defineProperty(globalThis, 'navigation', {
      value: navigation,
      configurable: true,
    });

    const first = createNavigationInfo();
    const second = createNavigationInfo();
    const firstSpy = vi.fn();
    const secondSpy = vi.fn();
    const disposeFirst = reaction(() => first.path, firstSpy);
    const disposeSecond = reaction(() => second.path, secondSpy);

    expect(navigation.addEventListener).toHaveBeenCalledTimes(2);

    disposeFirst();
    expect(navigation.removeEventListener).toHaveBeenCalledTimes(1);

    navigation.currentEntry = entry('next', 1);
    navigation.emit('currententrychange');

    expect(firstSpy).not.toHaveBeenCalled();
    expect(secondSpy).toHaveBeenCalledOnce();

    disposeSecond();
    expect(navigation.removeEventListener).toHaveBeenCalledTimes(2);
  });

  it('reacts to state changes on the same current entry', () => {
    const navigation = createFakeNavigation();
    let state = { page: 1 };
    navigation.currentEntry = {
      ...entry('current', 0),
      getState: () => state,
    };
    Object.defineProperty(globalThis, 'navigation', {
      value: navigation,
      configurable: true,
    });

    const onStateChange = vi.fn();
    const dispose = reaction(() => navigationInfo.state, onStateChange);

    expect(navigationInfo.state).toEqual({ page: 1 });
    state = { page: 2 };
    navigation.emit('currententrychange');

    expect(onStateChange).toHaveBeenCalledWith(
      { page: 2 },
      { page: 1 },
      expect.anything(),
    );

    dispose();
  });

  it('sees the Navigation API when it becomes available after an SSR read', () => {
    Object.defineProperty(globalThis, 'navigation', {
      value: undefined,
      configurable: true,
    });

    expect(navigationInfo.currentEntry.index).toBe(-1);
    expect(navigationInfo.isSupported).toBe(false);

    const navigation = createFakeNavigation();
    Object.defineProperty(globalThis, 'navigation', {
      value: navigation,
      configurable: true,
    });

    expect(navigationInfo.isSupported).toBe(true);
    expect(navigationInfo.currentEntry?.key).toBe('current');
    expect(navigationInfo.back()).toEqual({
      committed: expect.any(Promise),
      finished: expect.any(Promise),
    });
    expect(navigation.back).toHaveBeenCalledOnce();
  });

  it('exposes native Navigation API state and commands', () => {
    const navigation = createFakeNavigation();
    Object.defineProperty(globalThis, 'navigation', {
      value: navigation,
      configurable: true,
    });

    expect(navigationInfo.isSupported).toBe(true);
    expect(navigationInfo.currentEntry?.key).toBe('current');
    expect(navigationInfo.entries).toHaveLength(1);
    expect(navigationInfo.canGoBack).toBe(false);
    expect(navigationInfo.canGoForward).toBe(true);

    navigationInfo.navigate('/next', { history: 'push' });
    navigationInfo.back({ info: 'back' });
    navigationInfo.forward();
    navigationInfo.reload({ state: { refreshed: true } });
    navigationInfo.traverseTo('current');

    expect(navigation.navigate).toHaveBeenCalledWith('/next', {
      history: 'push',
    });
    expect(navigation.back).toHaveBeenCalledWith({ info: 'back' });
    expect(navigation.forward).toHaveBeenCalledWith(undefined);
    expect(navigation.reload).toHaveBeenCalledWith({
      state: { refreshed: true },
    });
    expect(navigation.traverseTo).toHaveBeenCalledWith('current', undefined);
  });

  it('builds query parameters without forwarding them to the native API', () => {
    const navigation = createFakeNavigation();
    Object.defineProperty(globalThis, 'navigation', {
      value: navigation,
      configurable: true,
    });

    navigationInfo.navigate('/settings?old=1#section', {
      history: 'replace',
      info: 'trigger',
      state: { keep: true },
      query: {
        name: 'a b',
        page: 2,
        tag: ['a', 'b'],
        empty: null,
        ignore: undefined,
        enabled: false,
      },
    });

    expect(navigation.navigate).toHaveBeenCalledWith(
      'https://example.com/settings?name=a+b&page=2&tag=a&tag=b&enabled=false#section',
      { history: 'replace', info: 'trigger', state: { keep: true } },
    );

    navigationInfo.navigate('settings?old=1', { query: {} });
    expect(navigation.navigate).toHaveBeenLastCalledWith(
      'https://example.com/settings',
      {},
    );

    navigationInfo.navigate('/settings?old=1', { history: 'replace' });
    expect(navigation.navigate).toHaveBeenLastCalledWith('/settings?old=1', {
      history: 'replace',
    });
  });

  it('uses the current URL for null or empty paths', () => {
    const navigation = createFakeNavigation();
    navigation.currentEntry = {
      ...entry('current', 0),
      url: 'https://example.com/settings?old=1#section',
    };
    Object.defineProperty(globalThis, 'navigation', {
      value: navigation,
      configurable: true,
    });

    for (const url of [null, '']) {
      navigationInfo.navigate(url, {
        history: 'replace',
        query: { tab: 'profile', page: 2 },
      });

      expect(navigation.navigate).toHaveBeenLastCalledWith(
        'https://example.com/settings?tab=profile&page=2#section',
        { history: 'replace' },
      );
    }

    navigationInfo.navigate(null);
    expect(navigation.navigate).toHaveBeenLastCalledWith(
      'https://example.com/settings?old=1#section',
    );
  });

  it('accepts query parameters as the first argument', () => {
    const navigation = createFakeNavigation();
    navigation.currentEntry = {
      ...entry('current', 0),
      url: 'https://example.com/settings?old=1#section',
    };
    Object.defineProperty(globalThis, 'navigation', {
      value: navigation,
      configurable: true,
    });

    navigationInfo.navigate(
      { tab: 'profile', page: 2 },
      {
        history: 'replace',
      },
    );
    expect(navigation.navigate).toHaveBeenLastCalledWith(
      'https://example.com/settings?tab=profile&page=2#section',
      { history: 'replace' },
    );

    navigationInfo.navigate({ tag: ['a', 'b'] });
    expect(navigation.navigate).toHaveBeenLastCalledWith(
      'https://example.com/settings?tag=a&tag=b#section',
      {},
    );

    navigationInfo.navigate(
      { page: 3 },
      { history: 'replace', query: { page: 4 } },
    );
    expect(navigation.navigate).toHaveBeenLastCalledWith(
      'https://example.com/settings?page=3#section',
      { history: 'replace' },
    );
  });

  it('exposes reactive path, query and hash from the current entry URL', () => {
    const navigation = createFakeNavigation();
    navigation.currentEntry = {
      ...entry('current', 0),
      url: 'https://example.com/products/42?sort=asc&page=2#details',
    };
    Object.defineProperty(globalThis, 'navigation', {
      value: navigation,
      configurable: true,
    });

    expect(navigationInfo.path).toBe('/products/42');
    expect(navigationInfo.query).toBe('?sort=asc&page=2');
    expect(navigationInfo.queryData).toEqual({ sort: 'asc', page: '2' });
    expect(navigationInfo.hash).toBe('#details');
    expect(navigationInfo.url).toBeInstanceOf(URL);
    expect(navigationInfo.url?.href).toBe(
      'https://example.com/products/42?sort=asc&page=2#details',
    );

    const onPathChange = vi.fn();
    const onQueryChange = vi.fn();
    const onQueryDataChange = vi.fn();
    const onHashChange = vi.fn();
    const disposePath = reaction(() => navigationInfo.path, onPathChange);
    const disposeQuery = reaction(() => navigationInfo.query, onQueryChange);
    const disposeQueryData = reaction(
      () => navigationInfo.queryData,
      onQueryDataChange,
    );
    const disposeHash = reaction(() => navigationInfo.hash, onHashChange);

    navigation.currentEntry = {
      ...entry('next', 1),
      url: 'https://example.com/account?tab=profile#settings',
    };
    navigation.emit('currententrychange');

    expect(onPathChange).toHaveBeenCalledWith(
      '/account',
      '/products/42',
      expect.anything(),
    );
    expect(onQueryChange).toHaveBeenCalledWith(
      '?tab=profile',
      '?sort=asc&page=2',
      expect.anything(),
    );
    expect(onQueryDataChange).toHaveBeenCalledWith(
      { tab: 'profile' },
      { sort: 'asc', page: '2' },
      expect.anything(),
    );
    expect(onHashChange).toHaveBeenCalledWith(
      '#settings',
      '#details',
      expect.anything(),
    );

    navigation.currentEntry = null;
    navigation.emit('currententrychange');

    expect(navigationInfo.path).toBe('');
    expect(navigationInfo.query).toBe('');
    expect(navigationInfo.queryData).toEqual({});
    expect(navigationInfo.hash).toBe('');
    expect(navigationInfo.url).toBeNull();

    disposePath();
    disposeQuery();
    disposeQueryData();
    disposeHash();
  });

  it('decodes query parameters and uses the last value for duplicate keys', () => {
    const navigation = createFakeNavigation();
    navigation.currentEntry = {
      ...entry('current', 0),
      url: 'https://example.com/?tag=first&tag=second&name=hello%20world',
    };
    Object.defineProperty(globalThis, 'navigation', {
      value: navigation,
      configurable: true,
    });

    expect(navigationInfo.queryData).toEqual({
      tag: 'second',
      name: 'hello world',
    });
  });

  it('reacts to Navigation API events and cleans up listeners', () => {
    const navigation = createFakeNavigation();
    Object.defineProperty(globalThis, 'navigation', {
      value: navigation,
      configurable: true,
    });
    const spy = vi.fn();
    const dispose = reaction(() => navigationInfo.currentEntry?.key, spy);

    navigation.currentEntry = entry('next', 1);
    navigation.emit('navigate');
    navigation.emit('navigatesuccess');
    navigation.emit('navigateerror');

    expect(spy).not.toHaveBeenCalled();
    expect(navigation.addEventListener).toHaveBeenCalledExactlyOnceWith(
      'currententrychange',
      expect.any(Function),
    );

    navigation.emit('currententrychange');

    expect(spy).toHaveBeenCalledWith('next', 'current', expect.anything());

    dispose();

    expect(navigation.removeEventListener).toHaveBeenCalledExactlyOnceWith(
      'currententrychange',
      expect.any(Function),
    );
  });

  it('caches entries while observed and refreshes them on navigation', () => {
    const navigation = createFakeNavigation();
    const entries = [navigation.currentEntry!];
    navigation.entries.mockImplementation(() => [...entries]);
    Object.defineProperty(globalThis, 'navigation', {
      value: navigation,
      configurable: true,
    });

    const spy = vi.fn();
    const dispose = reaction(() => navigationInfo.entries, spy);
    const initialEntries = navigationInfo.entries;

    expect(navigationInfo.entries).toBe(initialEntries);
    expect(navigation.entries).toHaveBeenCalledOnce();

    entries.push(entry('next', 1));
    navigation.emit('currententrychange');

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toEqual(entries);
    expect(navigationInfo.entries).toEqual(entries);
    expect(navigation.entries).toHaveBeenCalledTimes(2);
    expect(initialEntries).toHaveLength(1);

    dispose();
  });

  it('caches the parsed URL while observed', () => {
    const navigation = createFakeNavigation();
    Object.defineProperty(globalThis, 'navigation', {
      value: navigation,
      configurable: true,
    });

    const dispose = reaction(
      () => navigationInfo.url,
      () => undefined,
    );
    const initialURL = navigationInfo.url;

    expect(navigationInfo.url).toBe(initialURL);

    navigation.currentEntry = entry('next', 1);
    navigation.emit('currententrychange');

    expect(navigationInfo.url?.pathname).toBe('/next');
    expect(navigationInfo.url).not.toBe(initialURL);

    dispose();
  });
});
