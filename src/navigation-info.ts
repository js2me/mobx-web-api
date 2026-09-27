import { computed, makeObservable } from 'mobx';
import { createEnhancedAtom, type IEnhancedAtom } from 'yummies/mobx';

/** A session-history entry supplied by the Navigation API. */
export interface NavigationEntry {
  readonly id: string;
  readonly key: string;
  readonly url: string;
  readonly index: number;
  readonly sameDocument: boolean;
  getState(): unknown;
}

export interface NavigationOptions {
  info?: unknown;
}

export type NavigationQueryValue = string | number | boolean | null | undefined;

export type NavigationQuery = Record<
  string,
  NavigationQueryValue | readonly NavigationQueryValue[]
>;

export interface NavigationNavigateOptions extends NavigationOptions {
  history?: 'auto' | 'push' | 'replace';
  state?: unknown;
  /** Replaces the URL's query string; array values become repeated parameters. */
  query?: NavigationQuery;
}

export interface NavigationReloadOptions extends NavigationOptions {
  state?: unknown;
}

export interface NavigationResult {
  readonly committed: Promise<NavigationEntry>;
  readonly finished: Promise<NavigationEntry>;
}

type NativeNavigation = EventTarget & {
  currentEntry: NavigationEntry | null;
  entries(): NavigationEntry[];
  canGoBack: boolean;
  canGoForward: boolean;
  navigate(
    url: string | URL,
    options?: Omit<NavigationNavigateOptions, 'query'>,
  ): NavigationResult;
  back(options?: NavigationOptions): NavigationResult;
  forward(options?: NavigationOptions): NavigationResult;
  reload(options?: NavigationReloadOptions): NavigationResult;
  traverseTo(key: string, options?: NavigationOptions): NavigationResult;
};

/**
 * Reactive state based on the browser Navigation API.
 *
 * This is a passive wrapper: it does not intercept navigations or act as a router.
 *
 * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/navigation-info.html)
 * [MDN Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API)
 */
export interface NavigationInfo {
  readonly isSupported: boolean;
  readonly currentEntry: NavigationEntry;
  /** The parsed current entry URL, or null when unavailable. */
  readonly url: URL | null;
  /** The current URL pathname, or an empty string when unavailable. */
  readonly path: string;
  /** The current entry's state, or the SSR snapshot's state when unavailable. */
  readonly state: unknown;
  /** The current URL search string (including `?`), or an empty string. */
  readonly query: string;
  /** Decoded query parameters as a key-value object (last value wins). */
  readonly queryData: Readonly<Record<string, string>>;
  /** The current URL fragment (including `#`), or an empty string. */
  readonly hash: string;
  readonly entries: readonly NavigationEntry[];
  readonly canGoBack: boolean;
  readonly canGoForward: boolean;
  /** Pass a query object, null, or an empty string to use the current URL. */
  navigate(
    url: string | URL | null | NavigationQuery,
    options?: NavigationNavigateOptions,
  ): NavigationResult | undefined;
  back(options?: NavigationOptions): NavigationResult | undefined;
  forward(options?: NavigationOptions): NavigationResult | undefined;
  reload(options?: NavigationReloadOptions): NavigationResult | undefined;
  traverseTo(
    key: string,
    options?: NavigationOptions,
  ): NavigationResult | undefined;
  _atom?: IEnhancedAtom;
}

export interface NavigationInfoOptions {
  /** Entry to expose when the browser Navigation API is unavailable (e.g. SSR). */
  ssrSnapshot?: NavigationEntry | null;
}

// Keep the global object, not its navigation value: SSR hydration may add it later.
const webGlobal = globalThis as typeof globalThis & {
  navigation?: NativeNavigation;
};

const toSearchParams = (query: NavigationQuery): URLSearchParams => {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item != null) {
        params.append(key, String(item));
      }
    }
  }

  return params;
};

/**
 * Create an independent reactive Navigation API state for MobX consumers.
 *
 * [**Documentation**](https://js2me.github.io/mobx-web-api/apis/navigation-info.html)
 * [MDN Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API)
 */
export const createNavigationInfo = ({
  ssrSnapshot = null,
}: NavigationInfoOptions = {}): NavigationInfo => {
  const fallbackEntry: NavigationEntry = ssrSnapshot ?? {
    id: '',
    key: '',
    url: '',
    index: -1,
    sameDocument: false,
    getState: () => undefined,
  };

  const observe = <Value>(
    read: (navigation: NativeNavigation) => Value,
    fallback: Value,
  ) => {
    const navigation = webGlobal.navigation;

    if (!navigation) {
      return fallback;
    }

    if (!navigationInfo._atom) {
      navigationInfo._atom = createEnhancedAtom(
        process.env.NODE_ENV === 'production' ? '' : 'navigationInfo',
        (atom) => {
          navigation.addEventListener('currententrychange', atom.reportChanged);
        },
        (atom) => {
          navigation.removeEventListener(
            'currententrychange',
            atom.reportChanged,
          );
        },
      );
    }

    navigationInfo._atom.reportObserved();
    return read(navigation);
  };

  const navigationInfo: NavigationInfo = makeObservable<NavigationInfo>(
    {
      get isSupported() {
        const navigation = webGlobal.navigation;

        return Boolean(
          navigation &&
            typeof navigation.entries === 'function' &&
            typeof navigation.navigate === 'function',
        );
      },
      get currentEntry() {
        return observe(
          (navigation) => navigation.currentEntry ?? fallbackEntry,
          fallbackEntry,
        );
      },
      get url() {
        const url = this.currentEntry.url;
        return url ? new URL(url) : null;
      },
      get path() {
        return this.url?.pathname ?? '';
      },
      get state() {
        return observe(
          (navigation) => (navigation.currentEntry ?? fallbackEntry).getState(),
          fallbackEntry.getState(),
        );
      },
      get query() {
        return this.url?.search ?? '';
      },
      get queryData() {
        return Object.fromEntries(this.url?.searchParams ?? []);
      },
      get hash() {
        return this.url?.hash ?? '';
      },
      get entries() {
        return observe((navigation) => navigation.entries(), []);
      },
      get canGoBack() {
        return observe((navigation) => navigation.canGoBack, false);
      },
      get canGoForward() {
        return observe((navigation) => navigation.canGoForward, false);
      },
      navigate(url, options) {
        const navigation = webGlobal.navigation;

        if (!navigation) {
          return undefined;
        }

        const currentURL =
          navigation.currentEntry?.url || webGlobal.location?.href;
        let targetURL: string | URL | undefined = currentURL;
        const { query: optionsQuery, ...nativeOptions } = options ?? {};
        let query = optionsQuery;

        if (typeof url === 'string') {
          targetURL = url || currentURL;
        } else if (url instanceof URL) {
          targetURL = url;
        } else if (url !== null) {
          query = url;
        }

        if (!targetURL) {
          return undefined;
        }

        if (query === undefined) {
          return options
            ? navigation.navigate(targetURL, nativeOptions)
            : navigation.navigate(targetURL);
        }

        const target = new URL(targetURL, currentURL);
        target.search = toSearchParams(query).toString();

        return navigation.navigate(target.href, nativeOptions);
      },
      back(options) {
        return webGlobal.navigation?.back(options);
      },
      forward(options) {
        return webGlobal.navigation?.forward(options);
      },
      reload(options) {
        return webGlobal.navigation?.reload(options);
      },
      traverseTo(key, options) {
        return webGlobal.navigation?.traverseTo(key, options);
      },
    },
    {
      currentEntry: computed,
      url: computed,
      path: computed,
      state: computed,
      query: computed,
      queryData: computed,
      hash: computed,
      entries: computed,
      canGoBack: computed,
      canGoForward: computed,
    },
  );

  return navigationInfo;
};
