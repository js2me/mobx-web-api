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

type FakeNavigateEvent = Event & {
  canIntercept: boolean;
  destination: { url: string };
  downloadRequest: string | null;
  formData: FormData | null;
  hashChange: boolean;
  intercept: ReturnType<typeof vi.fn>;
};

type FakeNavigation = {
  currentEntry: NavigationEntry | null;
  entries: ReturnType<typeof vi.fn>;
  canGoBack: boolean;
  canGoForward: boolean;
  navigate: ReturnType<typeof vi.fn>;
  back: ReturnType<typeof vi.fn>;
  forward: ReturnType<typeof vi.fn>;
  reload: ReturnType<typeof vi.fn>;
  traverseTo: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  navigateEvents: FakeNavigateEvent[];
  nextNavigateEventOptions?: Partial<
    Pick<
      FakeNavigateEvent,
      | 'canIntercept'
      | 'destination'
      | 'downloadRequest'
      | 'formData'
      | 'hashChange'
    > & { defaultPrevented?: boolean }
  >;
  emit(event: NavigationEvent, payload?: Event): void;
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
  const listeners: Record<NavigationEvent, Set<(event: Event) => void>> = {
    currententrychange: new Set(),
    navigate: new Set(),
    navigatesuccess: new Set(),
    navigateerror: new Set(),
  };
  const result = {
    committed: Promise.resolve(entry('next', 1)),
    finished: Promise.resolve(entry('next', 1)),
  };
  const fakeNavigation: FakeNavigation = {
    currentEntry: entry('current', 0),
    entries: vi.fn(() => [entry('current', 0)]),
    canGoBack: false,
    canGoForward: true,
    navigateEvents: [],
    navigate: vi.fn((url: string | URL) => {
      const { defaultPrevented, ...eventOptions } =
        fakeNavigation.nextNavigateEventOptions ?? {};
      const targetURL = new URL(
        url,
        document.baseURI || fakeNavigation.currentEntry?.url,
      );
      const event = Object.assign(new Event('navigate', { cancelable: true }), {
        canIntercept: true,
        destination: { url: targetURL.href },
        downloadRequest: null,
        formData: null,
        hashChange: false,
        intercept: vi.fn(),
        ...eventOptions,
      }) as FakeNavigateEvent;
      if (defaultPrevented) {
        event.preventDefault();
      }
      fakeNavigation.nextNavigateEventOptions = undefined;
      fakeNavigation.navigateEvents.push(event);
      fakeNavigation.emit('navigate', event);
      return result;
    }),
    back: vi.fn(() => result),
    forward: vi.fn(() => result),
    reload: vi.fn(() => result),
    traverseTo: vi.fn(() => result),
    addEventListener: vi.fn(
      (event: string, listener: (event: Event) => void) => {
        if (event in listeners) {
          listeners[event as NavigationEvent].add(listener);
        }
      },
    ),
    removeEventListener: vi.fn(
      (event: string, listener: (event: Event) => void) => {
        if (event in listeners) {
          listeners[event as NavigationEvent].delete(listener);
        }
      },
    ),
    emit(event: NavigationEvent, payload: Event = new Event(event)) {
      for (const listener of listeners[event]) {
        listener(payload);
      }
    },
  };

  return fakeNavigation;
};

const installNavigation = (navigation: FakeNavigation) => {
  Object.defineProperty(globalThis, 'navigation', {
    value: navigation,
    configurable: true,
  });
};

describe('navigationInfo', () => {
  let navigationInfo: NavigationInfo;
  const originalBaseURI = Object.getOwnPropertyDescriptor(document, 'baseURI');
  const originalNavigation = Object.getOwnPropertyDescriptor(
    globalThis,
    'navigation',
  );

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(document, 'baseURI', {
      configurable: true,
      value: 'https://example.com/current',
    });
    navigationInfo = createNavigationInfo();
  });

  afterEach(() => {
    if (originalBaseURI) {
      Object.defineProperty(document, 'baseURI', originalBaseURI);
    } else {
      Reflect.deleteProperty(document, 'baseURI');
    }

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
    expect(navigationInfo.forward()).toBeUndefined();
    expect(navigationInfo.reload()).toBeUndefined();
    expect(navigationInfo.traverseTo('missing')).toBeUndefined();
    expect(
      navigationInfo.navigate('/settings', { query: { tab: 'profile' } }),
    ).toBeUndefined();
  });

  it.each([
    { name: 'empty object', navigation: {} },
    { name: 'without navigate', navigation: { entries: () => [] } },
    { name: 'without entries', navigation: { navigate: () => undefined } },
  ])('does not report partial Navigation API as supported: $name', ({
    navigation,
  }) => {
    Object.defineProperty(globalThis, 'navigation', {
      value: navigation,
      configurable: true,
    });

    expect(navigationInfo.isSupported).toBe(false);
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
    const info = createNavigationInfo({
      ssrSnapshot: {
        ...entry('server', 0),
        getState: () => ({ from: 'server' }),
      },
    });
    const navigation = createFakeNavigation();
    Object.defineProperty(globalThis, 'navigation', {
      value: navigation,
      configurable: true,
    });

    expect(info.currentEntry?.key).toBe('current');

    navigation.currentEntry = null;
    expect(info.currentEntry.key).toBe('server');
    expect(info.state).toEqual({ from: 'server' });
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

  it('does not subscribe until a reactive field is observed', () => {
    const navigation = createFakeNavigation();
    installNavigation(navigation);

    expect(navigationInfo.currentEntry.key).toBe('current');
    expect(navigationInfo.path).toBe('/current');
    expect(navigationInfo.entries).toHaveLength(1);
    expect(navigationInfo.canGoBack).toBe(false);
    expect(navigation.addEventListener).not.toHaveBeenCalled();

    const dispose = reaction(
      () => [navigationInfo.path, navigationInfo.canGoForward],
      () => undefined,
    );

    expect(navigation.addEventListener).toHaveBeenCalledExactlyOnceWith(
      'currententrychange',
      expect.any(Function),
    );

    dispose();
    expect(navigation.removeEventListener).toHaveBeenCalledOnce();
  });

  it('subscribes again after the last observer disposes', () => {
    const navigation = createFakeNavigation();
    installNavigation(navigation);
    const onChange = vi.fn();

    const disposeFirst = reaction(() => navigationInfo.path, onChange);
    disposeFirst();
    const disposeSecond = reaction(() => navigationInfo.path, onChange);

    expect(navigation.addEventListener).toHaveBeenCalledTimes(2);
    expect(navigation.removeEventListener).toHaveBeenCalledOnce();

    navigation.currentEntry = entry('next', 1);
    navigation.emit('currententrychange');
    expect(onChange).toHaveBeenCalledExactlyOnceWith(
      '/next',
      '/current',
      expect.anything(),
    );

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

  it('intercepts same-origin navigations with a lazily installed dispatcher', async () => {
    const navigation = createFakeNavigation();
    installNavigation(navigation);

    navigationInfo.navigate('/internal/nova/products');

    const event = navigation.navigateEvents[0];
    expect(event?.intercept).toHaveBeenCalledExactlyOnceWith({
      handler: expect.any(Function),
    });
    expect(navigation.addEventListener).toHaveBeenCalledExactlyOnceWith(
      'navigate',
      expect.any(Function),
      true,
    );
    expect(navigation.removeEventListener).not.toHaveBeenCalled();

    navigationInfo.navigate('/settings');
    expect(navigation.addEventListener).toHaveBeenCalledOnce();
    expect(navigation.navigateEvents[1]?.intercept).toHaveBeenCalledOnce();
    await expect(
      navigation.navigate.mock.results[0]?.value.finished,
    ).resolves.toBeDefined();
  });

  it('intercepts the final URL after applying the query option', () => {
    const navigation = createFakeNavigation();
    installNavigation(navigation);

    navigationInfo.navigate('/products?old=1', { query: { page: 2 } });

    expect(navigation.navigateEvents[0]?.destination.url).toBe(
      'https://example.com/products?page=2',
    );
    expect(navigation.navigateEvents[0]?.intercept).toHaveBeenCalledOnce();
  });

  it('does not intercept when the instance has mpa enabled', () => {
    const navigation = createFakeNavigation();
    installNavigation(navigation);
    const fullNavigationInfo = createNavigationInfo({ mpa: true });

    fullNavigationInfo.navigate('/products', {
      history: 'replace',
      query: { page: 2 },
    });

    expect(navigation.navigate).toHaveBeenCalledExactlyOnceWith(
      'https://example.com/products?page=2',
      { history: 'replace' },
    );
    expect(navigation.navigateEvents[0]?.intercept).not.toHaveBeenCalled();
    expect(navigation.addEventListener).not.toHaveBeenCalled();

    fullNavigationInfo.navigate('/settings');

    expect(navigation.navigateEvents[1]?.intercept).not.toHaveBeenCalled();
    expect(navigation.addEventListener).not.toHaveBeenCalled();
  });

  it('does not intercept a navigation canceled by another listener', () => {
    const navigation = createFakeNavigation();
    installNavigation(navigation);
    navigation.nextNavigateEventOptions = { defaultPrevented: true };

    navigationInfo.navigate('/products');

    expect(navigation.navigateEvents[0]?.intercept).not.toHaveBeenCalled();
  });

  it('intercepts an event only once when two instances navigate to the same URL', () => {
    const navigation = createFakeNavigation();
    installNavigation(navigation);
    const second = createNavigationInfo();
    navigation.navigate.mockImplementationOnce((url: string) => {
      second.navigate(url);
      return {
        committed: Promise.resolve(entry('next', 1)),
        finished: Promise.resolve(entry('next', 1)),
      };
    });

    navigationInfo.navigate('/products');

    expect(navigation.navigateEvents[0]?.intercept).toHaveBeenCalledOnce();
    expect(navigation.addEventListener).toHaveBeenCalledTimes(2);
    expect(navigation.removeEventListener).not.toHaveBeenCalled();
  });

  it('destroy releases only its own SPA listener', () => {
    const navigation = createFakeNavigation();
    installNavigation(navigation);
    const first = createNavigationInfo();
    const second = createNavigationInfo();

    first.navigate('/first');
    second.navigate('/second');

    expect(navigation.addEventListener).toHaveBeenCalledTimes(2);

    first.destroy();
    expect(navigation.removeEventListener).toHaveBeenCalledExactlyOnceWith(
      'navigate',
      expect.any(Function),
      true,
    );

    second.navigate('/still-active');
    expect(navigation.navigateEvents[2]?.intercept).toHaveBeenCalledOnce();

    second.destroy();
    expect(navigation.removeEventListener).toHaveBeenCalledTimes(2);

    second.destroy();
    expect(navigation.removeEventListener).toHaveBeenCalledTimes(2);
    expect(second.navigate('/again')).toBeDefined();
    expect(navigation.addEventListener).toHaveBeenCalledTimes(3);
    expect(navigation.navigateEvents[3]?.intercept).toHaveBeenCalledOnce();
    expect(second.back()).toBeDefined();
    expect(second.isSupported).toBe(true);
    expect(second.currentEntry.key).toBe('current');

    second.destroy();
    expect(navigation.removeEventListener).toHaveBeenCalledTimes(3);
  });

  it('destroy detaches the reactive current-entry listener', () => {
    const navigation = createFakeNavigation();
    installNavigation(navigation);
    const info = createNavigationInfo();
    const onPathChange = vi.fn();
    const dispose = reaction(() => info.path, onPathChange);

    expect(navigation.addEventListener).toHaveBeenCalledWith(
      'currententrychange',
      expect.any(Function),
    );

    info.destroy();

    expect(navigation.removeEventListener).toHaveBeenCalledWith(
      'currententrychange',
      expect.any(Function),
    );
    expect(info.path).toBe('/current');
    expect(onPathChange).not.toHaveBeenCalled();

    navigation.currentEntry = entry('after-destroy', 1);
    navigation.emit('currententrychange');
    expect(onPathChange).not.toHaveBeenCalled();

    dispose();
    expect(info.path).toBe('/after-destroy');
  });

  it('keeps one dispatcher and clears pending targets when native navigate throws', () => {
    const navigation = createFakeNavigation();
    installNavigation(navigation);
    navigation.navigate.mockImplementationOnce(() => {
      throw new Error('Navigation failed');
    });

    expect(() => navigationInfo.navigate('/products')).toThrow(
      'Navigation failed',
    );
    expect(navigation.addEventListener).toHaveBeenCalledOnce();
    expect(navigation.removeEventListener).not.toHaveBeenCalled();

    navigation.navigate('/products');
    expect(navigation.navigateEvents[0]?.intercept).not.toHaveBeenCalled();
  });

  it('does not keep a pending target while a cross-document result stays pending', () => {
    const navigation = createFakeNavigation();
    installNavigation(navigation);
    const finished = new Promise<NavigationEntry>(() => undefined);
    navigation.navigate.mockImplementationOnce(() => ({
      committed: finished,
      finished,
    }));

    navigationInfo.navigate('https://other.example/products');

    expect(navigation.addEventListener).toHaveBeenCalledOnce();
    expect(navigation.removeEventListener).not.toHaveBeenCalled();

    navigation.navigate('/unrelated');
    expect(navigation.navigateEvents[0]?.intercept).not.toHaveBeenCalled();
  });

  it('passes invalid URLs to native navigate instead of throwing while parsing', () => {
    const navigation = createFakeNavigation();
    installNavigation(navigation);
    const result = {
      committed: Promise.resolve(entry('next', 1)),
      finished: Promise.resolve(entry('next', 1)),
    };
    navigation.navigate.mockReturnValueOnce(result);

    expect(navigationInfo.navigate('https://[invalid')).toBe(result);
    expect(navigation.navigate).toHaveBeenCalledExactlyOnceWith(
      'https://[invalid',
    );
    expect(navigation.addEventListener).not.toHaveBeenCalled();
  });

  it('resolves relative paths against document.baseURI', () => {
    const navigation = createFakeNavigation();
    installNavigation(navigation);
    Object.defineProperty(document, 'baseURI', {
      configurable: true,
      value: 'https://example.com/app/',
    });

    navigationInfo.navigate('products', { query: { view: 'all' } });

    expect(navigation.navigate).toHaveBeenCalledExactlyOnceWith(
      'https://example.com/app/products?view=all',
      {},
    );
    expect(navigation.navigateEvents[0]?.intercept).toHaveBeenCalledOnce();
  });

  it('leaves navigations the browser cannot handle as SPA unintercepted', () => {
    const navigation = createFakeNavigation();
    installNavigation(navigation);
    navigation.nextNavigateEventOptions = { canIntercept: false };

    navigationInfo.navigate('/external-target');

    expect(navigation.navigateEvents[0]?.intercept).not.toHaveBeenCalled();
    expect(navigation.addEventListener).toHaveBeenCalledExactlyOnceWith(
      'navigate',
      expect.any(Function),
      true,
    );
    expect(navigation.removeEventListener).not.toHaveBeenCalled();
  });

  it('does not intercept a different destination while waiting for its navigation', () => {
    const navigation = createFakeNavigation();
    installNavigation(navigation);
    navigation.nextNavigateEventOptions = {
      destination: { url: 'https://example.com/unrelated' },
    };

    navigationInfo.navigate('/products');

    expect(navigation.navigateEvents[0]?.intercept).not.toHaveBeenCalled();
  });

  it.each([
    { name: 'fragment-only change', options: { hashChange: true } },
    { name: 'download', options: { downloadRequest: 'report.csv' } },
    { name: 'form submission', options: { formData: new FormData() } },
  ])('leaves $name to the browser', ({ options }) => {
    const navigation = createFakeNavigation();
    installNavigation(navigation);
    navigation.nextNavigateEventOptions = options;

    navigationInfo.navigate('/products');

    expect(navigation.navigateEvents[0]?.intercept).not.toHaveBeenCalled();
    expect(navigation.addEventListener).toHaveBeenCalledExactlyOnceWith(
      'navigate',
      expect.any(Function),
      true,
    );
    expect(navigation.removeEventListener).not.toHaveBeenCalled();
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

  describe('navigate input variants', () => {
    const currentURL = 'https://example.com/account/profile?old=1#details';

    it.each([
      { name: 'absolute pathname', input: '/settings', expected: '/settings' },
      { name: 'relative pathname', input: 'settings', expected: 'settings' },
      {
        name: 'query string',
        input: '?tab=security',
        expected: '?tab=security',
      },
      { name: 'hash', input: '#next', expected: '#next' },
      { name: 'null', input: null, expected: currentURL },
      { name: 'empty string', input: '', expected: currentURL },
    ])('forwards $name without query or extra options', ({
      input,
      expected,
    }) => {
      const navigation = createFakeNavigation();
      navigation.currentEntry = { ...entry('current', 0), url: currentURL };
      installNavigation(navigation);

      const result = navigationInfo.navigate(input);

      expect(navigation.navigate).toHaveBeenCalledExactlyOnceWith(expected);
      expect(result).toBe(navigation.navigate.mock.results[0]?.value);
    });

    it('forwards URL objects unchanged without query', () => {
      const navigation = createFakeNavigation();
      installNavigation(navigation);
      const url = new URL('https://example.com/settings#account');

      navigationInfo.navigate(url);

      expect(navigation.navigate).toHaveBeenCalledExactlyOnceWith(url);
    });

    it.each([
      { name: 'null', input: null },
      { name: 'empty string', input: '' },
    ])('uses current URL for $name with native options', ({ input }) => {
      const navigation = createFakeNavigation();
      navigation.currentEntry = { ...entry('current', 0), url: currentURL };
      installNavigation(navigation);

      navigationInfo.navigate(input, {
        history: 'replace',
        state: { count: 1 },
      });

      expect(navigation.navigate).toHaveBeenCalledExactlyOnceWith(currentURL, {
        history: 'replace',
        state: { count: 1 },
      });
    });

    it('does not add or modify query when options.query is undefined', () => {
      const navigation = createFakeNavigation();
      installNavigation(navigation);

      navigationInfo.navigate('/settings?old=1#details', {
        history: 'push',
        query: undefined,
      });

      expect(navigation.navigate).toHaveBeenCalledExactlyOnceWith(
        '/settings?old=1#details',
        { history: 'push' },
      );
    });

    it.each([
      { name: 'options.query', input: null, options: { query: {} } },
      { name: 'first argument', input: {}, options: undefined },
    ])('clears existing query with empty $name', ({ input, options }) => {
      const navigation = createFakeNavigation();
      navigation.currentEntry = { ...entry('current', 0), url: currentURL };
      installNavigation(navigation);

      navigationInfo.navigate(input, options);

      expect(navigation.navigate).toHaveBeenCalledExactlyOnceWith(
        'https://example.com/account/profile#details',
        {},
      );
    });

    it('resolves relative paths and replaces the query without losing the hash', () => {
      const navigation = createFakeNavigation();
      navigation.currentEntry = { ...entry('current', 0), url: currentURL };
      installNavigation(navigation);

      navigationInfo.navigate('../settings?old=1#section', {
        query: { tab: 'profile' },
      });

      expect(navigation.navigate).toHaveBeenCalledExactlyOnceWith(
        'https://example.com/settings?tab=profile#section',
        {},
      );
    });

    it('accepts URL objects with query without mutating the original', () => {
      const navigation = createFakeNavigation();
      installNavigation(navigation);
      const url = new URL('https://example.com/settings?old=1#account');

      navigationInfo.navigate(url, {
        history: 'replace',
        query: { tab: 'security' },
      });

      expect(navigation.navigate).toHaveBeenCalledExactlyOnceWith(
        'https://example.com/settings?tab=security#account',
        { history: 'replace' },
      );
      expect(url.href).toBe('https://example.com/settings?old=1#account');
    });

    it('accepts an absolute URL with query and preserves its origin', () => {
      const navigation = createFakeNavigation();
      installNavigation(navigation);

      navigationInfo.navigate('https://other.example/settings?old=1#account', {
        query: { page: 2 },
      });

      expect(navigation.navigate).toHaveBeenCalledExactlyOnceWith(
        'https://other.example/settings?page=2#account',
        {},
      );
    });

    it('encodes special characters and filters nullish and empty arrays', () => {
      const navigation = createFakeNavigation();
      installNavigation(navigation);

      navigationInfo.navigate('/search', {
        query: {
          'a&b': 'a + b',
          name: 'Привет',
          active: false,
          zero: 0,
          empty: '',
          tags: ['first', null, undefined, 'second'],
          missing: [null, undefined],
          none: [],
        },
      });

      expect(navigation.navigate).toHaveBeenCalledExactlyOnceWith(
        'https://example.com/search?a%26b=a+%2B+b&name=%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82&active=false&zero=0&empty=&tags=first&tags=second',
        {},
      );
    });

    it('uses the first argument as query when options.query also exists', () => {
      const navigation = createFakeNavigation();
      navigation.currentEntry = { ...entry('current', 0), url: currentURL };
      installNavigation(navigation);

      navigationInfo.navigate(
        { page: 2 },
        { history: 'replace', query: { page: 3 } },
      );

      expect(navigation.navigate).toHaveBeenCalledExactlyOnceWith(
        'https://example.com/account/profile?page=2#details',
        { history: 'replace' },
      );
    });

    it('uses location.href if there is no current entry', () => {
      const navigation = createFakeNavigation();
      navigation.currentEntry = null;
      installNavigation(navigation);

      navigationInfo.navigate(null, { history: 'replace' });

      expect(navigation.navigate).toHaveBeenCalledExactlyOnceWith(
        globalThis.location.href,
        { history: 'replace' },
      );
    });

    it('does not invoke the native API for query-only navigation in SSR', () => {
      Object.defineProperty(globalThis, 'navigation', {
        value: undefined,
        configurable: true,
      });

      expect(navigationInfo.navigate({ tab: 'profile' })).toBeUndefined();
      expect(
        navigationInfo.navigate(null, { query: { page: 2 } }),
      ).toBeUndefined();
      expect(navigationInfo.navigate('')).toBeUndefined();
    });

    it('propagates native navigation errors', () => {
      const navigation = createFakeNavigation();
      installNavigation(navigation);
      const error = new Error('Native navigation failed');
      navigation.navigate.mockImplementationOnce(() => {
        throw error;
      });

      expect(() => navigationInfo.navigate('/settings')).toThrow(error);
    });
  });
});
